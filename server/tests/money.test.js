const { allocate, allocateSigned, formatPaise, parseRupeesToPaise, paiseToDecimalString } = require('../src/services/money')

describe('money', () => {
  test('parses rupee strings into integer paise without float error', () => {
    expect(parseRupeesToPaise('80')).toBe(8000)
    expect(parseRupeesToPaise('0.1')).toBe(10)
    expect(parseRupeesToPaise('19.99')).toBe(1999)
    expect(() => parseRupeesToPaise('1.234')).toThrow()
    expect(() => parseRupeesToPaise('-5')).toThrow()
    expect(() => parseRupeesToPaise('abc')).toThrow()
  })

  test('formats paise for display', () => {
    expect(formatPaise(13000)).toBe('₹130')
    expect(formatPaise(8125)).toBe('₹81.25')
    expect(formatPaise(-800)).toBe('-₹8')
    expect(paiseToDecimalString(8125)).toBe('81.25')
    expect(paiseToDecimalString(5)).toBe('0.05')
  })

  test('allocation always sums to the total and gives leftovers to the largest weight first', () => {
    const shares = allocate(100, [1, 1, 1], ['a', 'b', 'c'])
    expect(shares.reduce((a, b) => a + b, 0)).toBe(100)
    expect(shares).toEqual([34, 33, 33])
    const unequal = allocate(7, [100, 300], ['a', 'b'])
    expect(unequal.reduce((a, b) => a + b, 0)).toBe(7)
    expect(unequal[1]).toBeGreaterThanOrEqual(unequal[0])
  })

  test('allocation handles zero weights and negative totals', () => {
    expect(allocate(10, [0, 0], ['a', 'b'])).toEqual([5, 5])
    const signed = allocateSigned(-10, [1, 1], ['a', 'b'])
    expect(signed.reduce((a, b) => a + b, 0)).toBe(-10)
    expect(() => allocate(-1, [1])).toThrow()
  })

  test('stays exact for large totals', () => {
    const shares = allocate(999999999, [333333333, 333333333, 333333333], ['a', 'b', 'c'])
    expect(shares.reduce((a, b) => a + b, 0)).toBe(999999999)
  })
})
