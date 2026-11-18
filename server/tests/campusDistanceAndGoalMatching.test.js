const { haversineMeters, walkMinutes, proximityTier, proximityLabel } = require('../src/utils/distance')
const { feeTargets, gapToTarget } = require('../src/services/fees/feeRules')
const { proposeGroup, pairCompatibility } = require('../src/services/matching/matcher')
const { DEFAULT_PROFILES } = require('../src/services/fees/defaultProfiles')

describe('Phase 1 - Campus Distance Model', () => {
  const customMap = {
    hostels: [
      { name: 'Hostel A', lat: 26.0, lng: 75.0 },
      { name: 'Hostel B', lat: 26.002, lng: 75.0 }, // ~222 meters away -> ~3.6 min walk -> 4 min
      { name: 'Hostel Far', lat: 26.02, lng: 75.0 }, // ~2224 meters away -> ~36 min walk
    ],
    walkSpeedMetersPerMin: 80,
    detourFactor: 1.3,
  }

  test('haversineMeters calculates accurate distance', () => {
    expect(haversineMeters(26.0, 75.0, 26.0, 75.0)).toBe(0)
    const dist = haversineMeters(26.0, 75.0, 26.002, 75.0)
    expect(dist).toBeGreaterThan(200)
    expect(dist).toBeLessThan(250)
  })

  test('walkMinutes calculates walking time using speed and detour factor', () => {
    const mins = walkMinutes('Hostel A', 'Hostel B', customMap)
    expect(mins).toBe(4) // ~222 * 1.3 / 80 = ~3.6 min -> 4 min
    expect(walkMinutes('Hostel A', 'Hostel A', customMap)).toBe(0)
  })

  test('proximityTier assigns tiers 0 to 3 accurately', () => {
    // Tier 0: Same floor
    expect(
      proximityTier(
        { hostel: 'Gargi', block: 'A', floor: '2' },
        { hostel: 'Gargi', block: 'A', floor: '2' }
      )
    ).toBe(0)

    // Tier 1: Same block, different floor
    expect(
      proximityTier(
        { hostel: 'Gargi', block: 'A', floor: '2' },
        { hostel: 'Gargi', block: 'A', floor: '3' }
      )
    ).toBe(1)

    // Tier 2: Same hostel, different block
    expect(
      proximityTier(
        { hostel: 'Gargi', block: 'A', floor: '2' },
        { hostel: 'Gargi', block: 'B', floor: '2' }
      )
    ).toBe(2)
  })

  test('missing hostel from map falls back to isolated zone (same-hostel only)', () => {
    // Unknown hostel with another unknown hostel -> null tier (cannot pair)
    expect(
      proximityTier(
        { hostel: 'Unknown Hostel 1' },
        { hostel: 'Unknown Hostel 2' }
      )
    ).toBeNull()

    // Unknown hostel with same unknown hostel -> Tier 2 (isolated same-hostel works)
    expect(
      proximityTier(
        { hostel: 'Unknown Hostel 1', block: 'A' },
        { hostel: 'Unknown Hostel 1', block: 'B' }
      )
    ).toBe(2)
  })
})

describe('Phase 2 - Goal-Driven Pool Builder and Expanding Rings', () => {
  const profile = DEFAULT_PROFILES.zepto // delivery 2500, freeDeliveryAbove 19900, smallCart 2000, smallCartBelow 10000
  const now = new Date('2026-11-15T16:00:00Z')
  const at = (mins) => new Date(now.getTime() + mins * 60000)

  let idCounter = 100
  function createIntent(overrides = {}) {
    idCounter++
    const subtotalPaise = overrides.subtotalPaise !== undefined ? overrides.subtotalPaise : 6000
    return {
      id: `intent_${idCounter}`,
      userId: `user_${idCounter}`,
      userName: `Student ${idCounter}`,
      platform: 'zepto',
      hostel: 'Gargi Hostel',
      block: 'A',
      floor: '2',
      windowStart: at(0),
      windowEnd: at(60),
      items: [{ name: 'Milk', qty: 1, unitPricePaise: subtotalPaise }],
      subtotalPaise,
      observedFeesPaise: null,
      ...overrides,
    }
  }

  test('feeTargets and gapToTarget compute distance to free delivery', () => {
    const targets = feeTargets(profile)
    expect(targets.freeDeliveryAbovePaise).toBe(19900)
    expect(targets.smallCartBelowPaise).toBe(10000)

    const gap1 = gapToTarget(profile, 8000)
    expect(gap1.targetReached).toBe(false)
    expect(gap1.deliveryGapPaise).toBe(11900) // 19900 - 8000
    expect(gap1.smallCartGapPaise).toBe(2000) // 10000 - 8000
    expect(gap1.nextMilestone.type).toBe('waive_small_cart_fee')

    const gap2 = gapToTarget(profile, 15000)
    expect(gap2.targetReached).toBe(false)
    expect(gap2.smallCartGapPaise).toBe(0)
    expect(gap2.deliveryGapPaise).toBe(4900) // 19900 - 15000
    expect(gap2.nextMilestone.type).toBe('free_delivery')

    const gap3 = gapToTarget(profile, 20500)
    expect(gap3.targetReached).toBe(true)
    expect(gap3.deliveryGapPaise).toBe(0)
    expect(gap3.nextMilestone.type).toBe('free_delivery_unlocked')
  })

  test('expanding rings stops at nearest tier that reaches target', () => {
    // Seed has 10000 paise (Rs 100)
    const seed = createIntent({ subtotalPaise: 10000, block: 'A', floor: '1' })

    // Tier 1 candidate (same block): 10000 paise (Rs 100). Total = 20000 >= 19900 (Target reached!)
    const sameBlockCandidate = createIntent({ subtotalPaise: 10000, block: 'A', floor: '3' })

    // Tier 2 candidate (different block): 10000 paise
    const differentBlockCandidate = createIntent({ subtotalPaise: 10000, block: 'B', floor: '1' })

    const result = proposeGroup({
      seed,
      candidates: [differentBlockCandidate, sameBlockCandidate],
      profile,
      now,
    })

    expect(result.status).toBe('pool')
    expect(result.targetReached).toBe(true)
    // Must select the same-block candidate and NOT widen to the other block
    expect(result.members).toHaveLength(2)
    expect(result.members.map((m) => m.id)).toContain(sameBlockCandidate.id)
    expect(result.members.map((m) => m.id)).not.toContain(differentBlockCandidate.id)
    expect(result.explanation).toContain('Same-block')
  })

  test('prefers fewest members to reach target', () => {
    // Seed: Rs 80 (8000 paise)
    const seed = createIntent({ subtotalPaise: 8000 })

    // One large candidate: Rs 130 (13000 paise) -> 2 members total Rs 210 >= 199 (Target reached with 2 members)
    const candidateBig = createIntent({ subtotalPaise: 13000 })

    // Two small candidates: Rs 60 each (6000 paise) -> would need 3 members to reach target
    const candidateSmall1 = createIntent({ subtotalPaise: 6000 })
    const candidateSmall2 = createIntent({ subtotalPaise: 6000 })

    const result = proposeGroup({
      seed,
      candidates: [candidateSmall1, candidateSmall2, candidateBig],
      profile,
      now,
    })

    expect(result.status).toBe('pool')
    expect(result.targetReached).toBe(true)
    // Prefers the 2-member pool over a 3-member pool
    expect(result.members).toHaveLength(2)
    expect(result.members.map((m) => m.id)).toContain(candidateBig.id)
  })

  test('strict savings rule: never proposes pool if any member loses money', () => {
    // Member who already has free delivery (observed fees = 0)
    const seed = createIntent({ subtotalPaise: 25000, observedFeesPaise: 0 })
    const other = createIntent({ subtotalPaise: 22000, observedFeesPaise: 0 })

    const result = proposeGroup({
      seed,
      candidates: [other],
      profile: DEFAULT_PROFILES.instamart,
      now,
    })

    expect(result.status).toBe('individual')
    expect(result.explanation).toContain('not recommended')
  })

  test('returns partial pool with targetReached: false when target not reached but members strictly save', () => {
    // Seed: Rs 40 (4000 paise). Solo fees: 2500 + 2000 + 500 = 5000 paise. Solo total = 9000 paise.
    const seed = createIntent({ subtotalPaise: 4000 })

    // Other: Rs 40 (4000 paise).
    // Pooled subtotal: 8000 paise (< 10000 small cart and < 19900 free delivery).
    // Pooled fees: 2500 + 2000 + 500 = 5000 paise.
    // Each share: 4000 + 2500 = 6500 paise.
    // Each saves: 9000 - 6500 = 2500 paise (Rs 25.00 each!).
    // Every member strictly saves, but target (19900) is NOT reached yet.
    const other = createIntent({ subtotalPaise: 4000 })

    const result = proposeGroup({
      seed,
      candidates: [other],
      profile,
      now,
    })

    expect(result.status).toBe('pool')
    expect(result.targetReached).toBe(false)
    expect(result.gapPaise).toBe(11900) // 19900 - 8000
    expect(result.membersNeeded).toBeGreaterThan(0)
    expect(result.explanation).toContain('short of free delivery')
  })
})
