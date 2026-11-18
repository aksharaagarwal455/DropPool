const { proposeGroup, pairCompatibility, pairScore } = require('../src/services/matching/matcher')
const { DEFAULT_PROFILES } = require('../src/services/fees/defaultProfiles')

const now = new Date('2026-11-15T16:00:00Z')
const at = (mins) => new Date(now.getTime() + mins * 60000)
let n = 0
function intent(overrides = {}) {
  n += 1
  const items = overrides.items || [{ name: 'Maggi noodles', qty: 2, unitPricePaise: 1400 }, { name: 'Bread', qty: 1, unitPricePaise: 5200 }]
  const subtotalPaise = overrides.subtotalPaise !== undefined ? overrides.subtotalPaise : items.reduce((s, i) => s + i.qty * i.unitPricePaise, 0)
  return {
    id: `i${n}`, userId: `u${n}`, userName: `Student ${n}`, platform: 'zepto', hostel: 'Gargi', block: 'A', floor: '2',
    windowStart: at(0), windowEnd: at(120), items, subtotalPaise, observedFeesPaise: null, ...overrides,
  }
}

describe('compatibility', () => {
  test('different platform, hostel, or window is incompatible', () => {
    const a = intent()
    expect(pairCompatibility(a, intent({ platform: 'blinkit' }), undefined, now).compatible).toBe(false)
    expect(pairCompatibility(a, intent({ hostel: 'Tagore' }), undefined, now).compatible).toBe(false)
    expect(pairCompatibility(a, intent({ windowStart: at(200), windowEnd: at(300) }), undefined, now).compatible).toBe(false)
    expect(pairCompatibility(a, intent(), undefined, now).compatible).toBe(true)
  })

  test('hostel names compare case-insensitively', () => {
    expect(pairCompatibility(intent(), intent({ hostel: ' gargi ' }), undefined, now).compatible).toBe(true)
  })

  test('same student is never matched with themselves', () => {
    const a = intent()
    expect(pairCompatibility(a, { ...intent(), userId: a.userId }, undefined, now).compatible).toBe(false)
  })

  test('score rewards shared products and proximity', () => {
    const a = intent()
    const same = pairScore(a, intent())
    const other = pairScore(a, intent({ items: [{ name: 'Shampoo', qty: 1, unitPricePaise: 9000 }], block: 'C' }))
    expect(same.total).toBeGreaterThan(other.total)
    expect(same.sharedProducts).toContain('bread')
  })
})

describe('group proposal', () => {
  const profile = DEFAULT_PROFILES.zepto

  test('forms a pool of small carts and explains why', () => {
    const seed = intent({ subtotalPaise: 8000, items: [{ name: 'Maggi', qty: 1, unitPricePaise: 8000 }] })
    const others = [1, 2, 3].map(() => intent({ subtotalPaise: 8000, items: [{ name: 'Maggi', qty: 1, unitPricePaise: 8000 }] }))
    const result = proposeGroup({ seed, candidates: others, profile, now })
    expect(result.status).toBe('pool')
    // 3 students at Rs 80 each (Rs 240) reach Zepto's Rs 199 free delivery target; fewest members preferred
    expect(result.members).toHaveLength(3)
    expect(result.targetReached).toBe(true)
    expect(result.optimization.recommendation).toBe('pool')
    expect(result.explanation).toContain('crosses free delivery')
    expect(result.score.total).toBeGreaterThan(0)
  })

  test('respects the group size cap', () => {
    const seed = intent({ subtotalPaise: 8000 })
    const others = Array.from({ length: 7 }, () => intent({ subtotalPaise: 8000 }))
    expect(proposeGroup({ seed, candidates: others, profile, now }).members.length).toBeLessThanOrEqual(4)
  })

  test('same platform alone is not enough: other hostels and windows stay independent', () => {
    const seed = intent()
    const result = proposeGroup({ seed, candidates: [intent({ hostel: 'Tagore' }), intent({ windowStart: at(400), windowEnd: at(500) })], profile, now })
    expect(result.status).toBe('none')
    expect(result.classified.every((c) => c.class === 'incompatible')).toBe(true)
  })

  test('recommends individual ordering when pooling would not save money', () => {
    const seed = intent({ platform: 'instamart', subtotalPaise: 25000, observedFeesPaise: 0 })
    const other = intent({ platform: 'instamart', subtotalPaise: 21000, observedFeesPaise: 0 })
    const result = proposeGroup({ seed, candidates: [other], profile: DEFAULT_PROFILES.instamart, now })
    expect(result.status).toBe('individual')
    expect(result.explanation).toContain('not recommended')
  })

  test('intents without prices are never grouped financially', () => {
    const seed = intent({ subtotalPaise: 8000 })
    const unpriced = intent({ subtotalPaise: null })
    const result = proposeGroup({ seed, candidates: [unpriced], profile, now })
    expect(result.status).toBe('none')
    expect(result.classified[0].class).toBe('potential')
    expect(proposeGroup({ seed: unpriced, candidates: [seed], profile, now }).status).toBe('needs_prices')
  })

  test('a candidate that would remove the savings is left out', () => {
    const seed = intent({ subtotalPaise: 8000 })
    const goodA = intent({ subtotalPaise: 8000 })
    const freeRider = intent({ subtotalPaise: 30000, observedFeesPaise: 0 })
    const result = proposeGroup({ seed, candidates: [goodA, freeRider], profile, now })
    expect(result.status).toBe('pool')
    expect(result.members.map((x) => x.id)).not.toContain(freeRider.id)
  })
})
