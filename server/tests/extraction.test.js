const { extractCart, normalizeExtraction, validateImage } = require('../src/services/extractionService')

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)])
const png64 = PNG.toString('base64')

function geminiReply(obj) {
  return async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] }) })
}

describe('image validation', () => {
  test('accepts a real PNG and rejects mismatched, empty, oversized or unsupported files', () => {
    expect(validateImage({ imageBase64: png64, mimeType: 'image/png' })).toBe(png64)
    expect(() => validateImage({ imageBase64: png64, mimeType: 'image/jpeg' })).toThrow('does not match')
    expect(() => validateImage({ imageBase64: '', mimeType: 'image/png' })).toThrow()
    expect(() => validateImage({ imageBase64: png64, mimeType: 'application/pdf' })).toThrow('JPEG, PNG or WebP')
    const huge = Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)]).toString('base64')
    expect(() => validateImage({ imageBase64: huge, mimeType: 'image/png' })).toThrow('5 MB')
  })
})

describe('normalizing the AI response', () => {
  test('keeps unknown prices null, flags them, and converts rupees to integer paise', () => {
    const out = normalizeExtraction({
      platform: 'zepto', feesVisible: true,
      items: [{ name: 'Maggi', qty: 2, unitPrice: 14, confidence: 0.9 }, { name: 'Bread', qty: 1, unitPrice: null, lineTotal: null }],
      fees: { delivery: 25, handling: 5, smallCart: 20, other: null, discount: null }, subtotal: 80, total: 130,
    })
    expect(out.items[0].unitPricePaise).toBe(1400)
    expect(out.items[1].unitPricePaise).toBeNull()
    expect(out.observedFeesPaise).toBe(5000)
    expect(out.warnings.join(' ')).toContain('Bread')
    expect(out.needsReview).toBe(true)
  })

  test('never invents fees when the breakdown is not visible', () => {
    const out = normalizeExtraction({ feesVisible: false, items: [{ name: 'Milk', qty: 1, unitPrice: 30 }] })
    expect(out.observedFeesPaise).toBeNull()
    expect(out.warnings.join(' ')).toContain('Fees were not visible')
  })

  test('derives a price from a line total only when it divides exactly, and says so', () => {
    const out = normalizeExtraction({ feesVisible: false, items: [{ name: 'Eggs', qty: 2, unitPrice: null, lineTotal: 120 }, { name: 'Tea', qty: 3, unitPrice: null, lineTotal: 100 }] })
    expect(out.items[0].unitPricePaise).toBe(6000)
    expect(out.items[0].derived).toBe(true)
    expect(out.items[1].unitPricePaise).toBeNull()
  })

  test('warns when item prices do not add up to the subtotal; rejects garbage', () => {
    const out = normalizeExtraction({ feesVisible: false, items: [{ name: 'A', qty: 1, unitPrice: 10 }], subtotal: 99 })
    expect(out.warnings.join(' ')).toContain('do not add up')
    expect(() => normalizeExtraction({ items: 'nope' })).toThrow()
    expect(() => normalizeExtraction({ items: [{ name: '', qty: 1 }] })).toThrow('No items')
  })

  test('discounts reduce observed fees but never below zero', () => {
    const out = normalizeExtraction({ feesVisible: true, items: [{ name: 'A', qty: 1, unitPrice: 10 }], fees: { delivery: 10, discount: 50 } })
    expect(out.observedFeesPaise).toBe(0)
  })
})

describe('calling Gemini', () => {
  const input = { imageBase64: png64, mimeType: 'image/png' }

  test('falls back to manual entry without an API key', async () => {
    await expect(extractCart(input, { apiKey: '' })).rejects.toMatchObject({ statusCode: 503, extra: { fallback: 'manual' } })
  })

  test('returns a reviewed extraction on success and sends the key in a header, not the URL', async () => {
    const fetchImpl = jest.fn(geminiReply({ platform: 'blinkit', feesVisible: false, items: [{ name: 'Milk', qty: 1, unitPrice: 30 }] }))
    const out = await extractCart(input, { apiKey: 'test-key', fetchImpl })
    expect(out.items[0].unitPricePaise).toBe(3000)
    const [url, options] = fetchImpl.mock.calls[0]
    expect(url).not.toContain('test-key')
    expect(options.headers['x-goog-api-key']).toBe('test-key')
  })

  test('network failure, HTTP error and malformed JSON all degrade to manual entry', async () => {
    const cases = [
      async () => { throw new Error('offline') },
      async () => ({ ok: false, status: 500 }),
      async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'not json' }] } }] }) }),
    ]
    for (const fetchImpl of cases) {
      await expect(extractCart(input, { apiKey: 'k', fetchImpl })).rejects.toMatchObject({ extra: { fallback: 'manual' } })
    }
  })
})
