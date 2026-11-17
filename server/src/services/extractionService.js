const { env } = require('../config/env')
const { AppError } = require('../middleware/errorHandler')

const MAX_BYTES = 5 * 1024 * 1024
const MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const PLATFORMS = ['blinkit', 'zepto', 'instamart', 'unknown']

const PROMPT = `You read screenshots of quick-commerce shopping carts (Blinkit, Zepto, Swiggy Instamart).
Extract only what is visible. Rules:
- Prices are in rupees. Use null for anything not visible. Never guess or invent a price or fee.
- unitPrice is the price of one unit. lineTotal is the price shown for the line. qty is a whole number.
- feesVisible is true only if the bill breakdown (delivery, handling, small-cart, other, discount) is visible.
- Add a short warning for anything unclear, cropped or ambiguous.
Return JSON only.`

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    platform: { type: 'STRING', enum: PLATFORMS },
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          qty: { type: 'INTEGER' },
          unitPrice: { type: 'NUMBER', nullable: true },
          lineTotal: { type: 'NUMBER', nullable: true },
          confidence: { type: 'NUMBER' },
        },
        required: ['name', 'qty'],
      },
    },
    feesVisible: { type: 'BOOLEAN' },
    fees: {
      type: 'OBJECT',
      properties: {
        delivery: { type: 'NUMBER', nullable: true },
        handling: { type: 'NUMBER', nullable: true },
        smallCart: { type: 'NUMBER', nullable: true },
        other: { type: 'NUMBER', nullable: true },
        discount: { type: 'NUMBER', nullable: true },
      },
    },
    subtotal: { type: 'NUMBER', nullable: true },
    total: { type: 'NUMBER', nullable: true },
    warnings: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['items', 'feesVisible'],
}

function magicMatches(buffer, mime) {
  if (mime === 'image/jpeg') return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  if (mime === 'image/png') return buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  if (mime === 'image/webp') return buffer.length > 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  return false
}

function validateImage({ imageBase64, mimeType }) {
  if (!MIME_TYPES.includes(mimeType)) throw new AppError('Upload a JPEG, PNG or WebP image', 422)
  if (typeof imageBase64 !== 'string' || imageBase64.length === 0) throw new AppError('Image data is required', 422)
  const clean = imageBase64.replace(/^data:[^;]+;base64,/, '')
  if (clean.length > Math.ceil((MAX_BYTES * 4) / 3) + 8) throw new AppError('Image must be 5 MB or smaller', 413)
  const buffer = Buffer.from(clean, 'base64')
  if (buffer.length === 0 || buffer.length > MAX_BYTES) throw new AppError('Image must be 5 MB or smaller', 413)
  if (!magicMatches(buffer, mimeType)) throw new AppError('The file content does not match its image type', 422)
  return clean
}

function rupeesToPaise(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100000) return null
  return Math.round(value * 100)
}

function normalizeExtraction(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.items)) throw new AppError('The AI response could not be understood. Enter the cart manually.', 502, { fallback: 'manual' })
  const warnings = Array.isArray(raw.warnings) ? raw.warnings.filter((w) => typeof w === 'string').slice(0, 10) : []
  const items = []
  for (const it of raw.items.slice(0, 30)) {
    if (!it || typeof it.name !== 'string' || !it.name.trim()) continue
    const qty = Number.isInteger(it.qty) && it.qty >= 1 && it.qty <= 50 ? it.qty : null
    let unitPricePaise = rupeesToPaise(it.unitPrice)
    let derived = false
    const line = rupeesToPaise(it.lineTotal)
    if (unitPricePaise === null && line !== null && qty && line % qty === 0) {
      unitPricePaise = line / qty
      derived = true
    }
    const confidence = typeof it.confidence === 'number' ? Math.max(0, Math.min(1, it.confidence)) : null
    const row = { name: it.name.trim().slice(0, 80), qty: qty ?? 1, unitPricePaise, confidence, derived }
    if (qty === null) warnings.push(`Quantity for "${row.name}" was unclear and was set to 1. Please check it.`)
    if (derived) warnings.push(`Price for "${row.name}" was derived from the line total. Please check it.`)
    if (unitPricePaise === null) warnings.push(`Price for "${row.name}" is not visible. Enter it manually.`)
    items.push(row)
  }
  if (items.length === 0) throw new AppError('No items could be read from this image. Enter the cart manually.', 422, { fallback: 'manual' })

  const f = raw.fees && typeof raw.fees === 'object' ? raw.fees : {}
  const fees = { deliveryPaise: rupeesToPaise(f.delivery), handlingPaise: rupeesToPaise(f.handling), smallCartPaise: rupeesToPaise(f.smallCart), otherPaise: rupeesToPaise(f.other), discountPaise: rupeesToPaise(f.discount) }
  let observedFeesPaise = null
  if (raw.feesVisible === true) {
    const charges = [fees.deliveryPaise, fees.handlingPaise, fees.smallCartPaise, fees.otherPaise].reduce((s, v) => s + (v ?? 0), 0)
    observedFeesPaise = Math.max(0, charges - (fees.discountPaise ?? 0))
  } else {
    warnings.push('Fees were not visible. Standard platform fees will be assumed.')
  }
  const subtotalPaise = rupeesToPaise(raw.subtotal)
  const totalPaise = rupeesToPaise(raw.total)
  const pricedAll = items.every((i) => i.unitPricePaise !== null)
  if (pricedAll && subtotalPaise !== null) {
    const sum = items.reduce((s, i) => s + i.qty * i.unitPricePaise, 0)
    if (sum !== subtotalPaise) warnings.push('Item prices do not add up to the visible subtotal. Please review each line.')
  }
  return {
    platform: PLATFORMS.includes(raw.platform) ? raw.platform : 'unknown',
    items, fees, observedFeesPaise, feesVisible: raw.feesVisible === true, subtotalPaise, totalPaise,
    warnings: [...new Set(warnings)], needsReview: true, source: 'gemini',
  }
}

async function extractCart(input, { fetchImpl = globalThis.fetch, apiKey = env.geminiApiKey, model = env.geminiModel } = {}) {
  const data = validateImage(input || {})
  if (!apiKey) throw new AppError('AI extraction is not configured. Enter the cart manually.', 503, { fallback: 'manual' })
  let response
  try {
    response = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: PROMPT }, { inline_data: { mime_type: input.mimeType, data } }] }],
        generationConfig: { responseMimeType: 'application/json', responseSchema: RESPONSE_SCHEMA, temperature: 0 },
      }),
      signal: AbortSignal.timeout(20000),
    })
  } catch {
    throw new AppError('The AI service is unavailable right now. Enter the cart manually.', 503, { fallback: 'manual' })
  }
  if (!response.ok) throw new AppError('The AI service could not read this image. Enter the cart manually.', 503, { fallback: 'manual' })
  let raw
  try {
    const body = await response.json()
    raw = JSON.parse(body?.candidates?.[0]?.content?.parts?.[0]?.text ?? '')
  } catch {
    throw new AppError('The AI response could not be understood. Enter the cart manually.', 502, { fallback: 'manual' })
  }
  return normalizeExtraction(raw)
}

module.exports = { extractCart, normalizeExtraction, validateImage, MAX_BYTES }
