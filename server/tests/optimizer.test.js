const { optimize, finalShares } = require('../src/services/optimization/optimizer')
const { computeFees } = require('../src/services/fees/feeRules')
const { DEFAULT_PROFILES } = require('../src/services/fees/defaultProfiles')

const zepto = DEFAULT_PROFILES.zepto
const m = (id, subtotalPaise, observedFeesPaise = null) => ({ id, label: id, subtotalPaise, observedFeesPaise })

describe('fee rules', () => {
  test('a small cart pays delivery, handling and small-cart fee', () => {
    const fees = computeFees(zepto, 8000)
    expect(fees.totalPaise).toBe(5000)
    expect(8000 + fees.totalPaise).toBe(13000)
  })

  test('large carts get delivery and small-cart fees waived', () => {
    const fees = computeFees(zepto, 32000)
    expect(fees.totalPaise).toBe(500)
    expect(fees.lines.find((l) => l.key === 'delivery').waived).toBe(true)
  })

  test('rejects an invalid profile', () => {
    expect(() => computeFees({ ...zepto, deliveryFeePaise: 1.5 }, 100)).toThrow()
  })
})

describe('optimizer', () => {
  test('four small carts pool profitably and match the worked example', () => {
    const result = optimize({ members: [m('a', 8000), m('b', 8000), m('c', 8000), m('d', 8000)], profile: zepto })
    expect(result.recommendation).toBe('pool')
    expect(result.pooled.totalPaise).toBe(32500)
    for (const row of result.members) {
      expect(row.individualTotalPaise).toBe(13000)
      expect(row.sharePaise).toBe(8125)
      expect(row.savingsPaise).toBe(4875)
    }
    expect(result.reason).toContain('Recommended pool: 4 students')
  })

  test('recommends individual ordering when someone already pays no fees', () => {
    const result = optimize({ members: [m('rohan', 25000, 0), m('ishita', 21000, 0)], profile: DEFAULT_PROFILES.instamart })
    expect(result.recommendation).toBe('individual')
    expect(result.reason).toContain('Pooling is not recommended')
  })

  test('zero savings is not a pool', () => {
    const profile = { ...zepto, handlingFeePaise: 0, deliveryFeePaise: 0, smallCartFeePaise: 0 }
    const result = optimize({ members: [m('a', 5000), m('b', 5000)], profile })
    expect(result.recommendation).toBe('individual')
    expect(result.reason).toContain('save nothing')
  })

  test('unequal carts: shares follow cart size and shares sum to the pooled total', () => {
    const result = optimize({ members: [m('a', 25000), m('b', 4000)], profile: zepto })
    const sum = result.members.reduce((s, r) => s + r.sharePaise, 0)
    expect(sum).toBe(result.pooled.totalPaise)
    expect(result.members[0].sharedFeePaise).toBeGreaterThanOrEqual(result.members[1].sharedFeePaise)
  })

  test('equal allocation can make a large-cart member lose and flips the recommendation', () => {
    const members = [m('big', 25000, 500), m('small', 4000)]
    const equal = optimize({ members, profile: { ...zepto, handlingFeePaise: 1000 }, allocation: 'equal' })
    expect(equal.members[0].sharedFeePaise).toBe(500)
    expect(equal.recommendation).toBe('individual')
  })

  test('rounding: a fee that does not divide evenly is fully allocated', () => {
    const result = optimize({ members: [m('a', 8000), m('b', 8000), m('c', 8000)], profile: zepto })
    expect(result.members.reduce((s, r) => s + r.sharedFeePaise, 0)).toBe(result.pooled.feesPaise)
  })

  test('different fee structures change the savings', () => {
    const cheap = { ...zepto, deliveryFeePaise: 0, smallCartFeePaise: 0, handlingFeePaise: 100 }
    const result = optimize({ members: [m('a', 8000), m('b', 8000)], profile: cheap })
    expect(result.recommendation).toBe('pool')
    expect(result.members.map((r) => r.savingsPaise)).toEqual([50, 50])
  })

  test('missing fee profile or missing price is insufficient data, never zero', () => {
    expect(optimize({ members: [m('a', 100), m('b', 100)], profile: null }).recommendation).toBe('insufficient_data')
    const missing = optimize({ members: [m('a', null), m('b', 100)], profile: zepto })
    expect(missing.recommendation).toBe('insufficient_data')
  })

  test('invalid inputs are rejected', () => {
    expect(optimize({ members: [m('a', -5), m('b', 100)], profile: zepto }).recommendation).toBe('insufficient_data')
    expect(optimize({ members: [m('a', 100), m('a', 100)], profile: zepto }).recommendation).toBe('insufficient_data')
    expect(optimize({ members: [m('a', 1.5), m('b', 100)], profile: zepto }).recommendation).toBe('insufficient_data')
    expect(() => optimize({ members: [m('a', 100)], profile: zepto, allocation: 'random' })).toThrow()
  })

  test('a single student is told to order individually', () => {
    expect(optimize({ members: [m('a', 8000)], profile: zepto }).recommendation).toBe('individual')
  })

  test('final shares follow the real checkout total, including discounts', () => {
    const members = [m('a', 8000), m('b', 4000)]
    const high = finalShares({ members, actualTotalPaise: 12600 })
    expect(high.shares.reduce((s, r) => s + r.sharePaise, 0)).toBe(12600)
    const discounted = finalShares({ members, actualTotalPaise: 11000 })
    expect(discounted.shares.reduce((s, r) => s + r.sharePaise, 0)).toBe(11000)
    expect(() => finalShares({ members, actualTotalPaise: 0 })).toThrow()
  })
})
