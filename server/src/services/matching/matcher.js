const { optimize } = require('../optimization/optimizer')
const { formatPaise } = require('../money')
const { productSimilarity, sharedProductNames, normalizeName } = require('./similarity')
const { proximityTier, walkMinutes, proximityLabel } = require('../../utils/distance')
const { gapToTarget, feeTargets } = require('../fees/feeRules')

const DEFAULT_CONFIG = {
  maxGroupSize: 4,
  minOverlapMinutes: 15,
  maxProximityTier: 3,
  nearMin: 7,
  enableCampusWide: false,
  minMarginalSavingPaise: 500,
  weights: { product: 20, proximity: 25, time: 20, readiness: 10, benefit: 25 },
}

const MIN = 60 * 1000

function key(value) {
  return normalizeName(value)
}

function overlapMinutes(startA, endA, startB, endB) {
  const start = Math.max(new Date(startA).getTime(), new Date(startB).getTime())
  const end = Math.min(new Date(endA).getTime(), new Date(endB).getTime())
  return Math.max(0, Math.floor((end - start) / MIN))
}

function pairCompatibility(a, b, config = DEFAULT_CONFIG, now = new Date()) {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  const reasons = []

  if (String(a.userId) === String(b.userId)) reasons.push('Same student')
  if (a.platform !== b.platform) reasons.push('Different shopping platforms')

  const tier = proximityTier(a, b, cfg)
  const maxTier = cfg.maxProximityTier ?? 3
  if (tier === null || tier > maxTier) {
    reasons.push('Hostels outside walking proximity')
  }

  if (new Date(b.windowEnd).getTime() <= now.getTime()) reasons.push('Intent has expired')

  const overlap = overlapMinutes(a.windowStart, a.windowEnd, b.windowStart, b.windowEnd)
  if (overlap < (cfg.minOverlapMinutes ?? 15)) reasons.push('Delivery windows do not overlap enough')

  const walk = walkMinutes(a?.hostel, b?.hostel)

  return {
    compatible: reasons.length === 0,
    reasons,
    overlapMinutes: overlap,
    tier,
    walkMinutes: Number.isFinite(walk) ? walk : null,
  }
}

function proximityScore(a, b, config = DEFAULT_CONFIG) {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  const tier = proximityTier(a, b, cfg)
  const walk = walkMinutes(a?.hostel, b?.hostel)

  if (tier === 0) return { score: 100, label: 'same floor', tier, walkMinutes: 0 }
  if (tier === 1) return { score: 85, label: 'same block', tier, walkMinutes: 0 }
  if (tier === 2) return { score: 70, label: 'same hostel', tier, walkMinutes: 0 }
  if (tier === 3) return { score: 45, label: proximityLabel(tier, walk), tier, walkMinutes: walk }
  if (tier === 4) return { score: 20, label: proximityLabel(tier, walk), tier, walkMinutes: walk }
  return { score: 0, label: 'different hostel', tier: null, walkMinutes: Infinity }
}

function timeScore(a, b, config) {
  const overlap = overlapMinutes(a.windowStart, a.windowEnd, b.windowStart, b.windowEnd)
  const shorter = Math.min(
    (new Date(a.windowEnd) - new Date(a.windowStart)) / MIN,
    (new Date(b.windowEnd) - new Date(b.windowStart)) / MIN,
  )
  if (shorter <= 0) return { score: 0, overlap }
  return { score: Math.min(100, Math.round((overlap / shorter) * 100)), overlap }
}

function readinessScore(item) {
  return item.subtotalPaise === null || item.subtotalPaise === undefined ? 0 : 100
}

function pairScore(a, b, config = DEFAULT_CONFIG) {
  const product = productSimilarity(a.items, b.items)
  const proximity = proximityScore(a, b, config)
  const time = timeScore(a, b, config)
  const readiness = Math.min(readinessScore(a), readinessScore(b))
  const w = config.weights || DEFAULT_CONFIG.weights
  const denom = w.product + w.proximity + w.time + w.readiness
  const total = Math.round(
    (product.score * w.product + proximity.score * w.proximity + time.score * w.time + readiness * w.readiness) / denom,
  )
  return {
    total,
    components: { product: product.score, proximity: proximity.score, time: time.score, readiness },
    sharedProducts: sharedProductNames(a.items, b.items),
    proximityLabel: proximity.label,
    tier: proximity.tier,
    walkMinutes: proximity.walkMinutes,
    overlapMinutes: time.overlap,
  }
}

function intersectWindow(members) {
  const start = Math.max(...members.map((m) => new Date(m.windowStart).getTime()))
  const end = Math.min(...members.map((m) => new Date(m.windowEnd).getTime()))
  return { start, end, minutes: Math.max(0, Math.floor((end - start) / MIN)) }
}

function toOptimizerMember(intent) {
  return {
    id: String(intent.id),
    label: intent.userName || String(intent.id),
    subtotalPaise: intent.subtotalPaise,
    observedFeesPaise: intent.observedFeesPaise ?? null,
  }
}

function formatRupeesOnly(paise) {
  const rupees = Math.round(paise / 100)
  return `${rupees}`
}

function buildGoalExplanation(group, optimization, targetInfo, ringTier) {
  const locations = new Set(group.map((m) => key(m.hostel)))
  const isSameFloor = ringTier === 0
  const isSameBlock = ringTier === 1
  const isSameHostel = ringTier === 2 || locations.size === 1
  const where = isSameFloor ? 'Same-floor' : isSameBlock ? 'Same-block' : isSameHostel ? 'Same-hostel' : 'Nearby-hostel'

  const count = group.length
  const minSav = Math.min(...optimization.members.map((m) => m.savingsPaise))
  const maxSav = Math.max(...optimization.members.map((m) => m.savingsPaise))
  const savText = minSav === maxSav ? `₹${formatRupeesOnly(minSav)}` : `₹${formatRupeesOnly(minSav)} to ₹${formatRupeesOnly(maxSav)}`

  if (targetInfo.targetReached) {
    return `${where} pool of ${count} crosses free delivery; each of you saves ${savText}.`
  }

  const gapText = `₹${formatRupeesOnly(targetInfo.gapPaise)}`
  return `${where} pool of ${count} saves ${savText} each, but is ${gapText} short of free delivery.`
}

/**
 * Generate combinations of an array up to maxSize
 */
function getCombinations(array, minSize, maxSize) {
  const results = []
  function fork(index, current) {
    if (current.length >= minSize && current.length <= maxSize) {
      results.push([...current])
    }
    if (current.length === maxSize || index === array.length) {
      return
    }
    for (let i = index; i < array.length; i++) {
      current.push(array[i])
      fork(i + 1, current)
      current.pop()
    }
  }
  fork(0, [])
  return results
}

/**
 * Goal-driven proposeGroup with Expanding Rings (Tier 0 -> Tier 3/4)
 */
function proposeGroup({
  seed,
  candidates = [],
  profile,
  config = DEFAULT_CONFIG,
  now = new Date(),
  allocation = 'proportional',
}) {
  const cfg = {
    ...DEFAULT_CONFIG,
    ...config,
    weights: { ...DEFAULT_CONFIG.weights, ...(config.weights || {}) },
  }
  const classified = []
  const eligible = []

  if (seed.subtotalPaise === null || seed.subtotalPaise === undefined) {
    return {
      status: 'needs_prices',
      members: [seed],
      optimization: null,
      score: null,
      explanation: 'Add a price for every item before matching.',
      classified,
      targetReached: false,
      gapPaise: null,
      membersNeeded: null,
      milestone: null,
    }
  }

  for (const c of candidates) {
    const compat = pairCompatibility(seed, c, cfg, now)
    if (!compat.compatible) {
      classified.push({ intentId: String(c.id), class: 'incompatible', reason: compat.reasons.join('; ') })
      continue
    }
    if (c.subtotalPaise === null || c.subtotalPaise === undefined) {
      classified.push({ intentId: String(c.id), class: 'potential', reason: 'Waiting for prices on this intent' })
      continue
    }
    const score = pairScore(seed, c, cfg)
    eligible.push({ intent: c, score, tier: compat.tier, walkMinutes: compat.walkMinutes })
  }

  // Sort eligible candidates by pair score descending
  eligible.sort((a, b) => b.score.total - a.score.total || String(a.intent.id).localeCompare(String(b.intent.id)))

  if (eligible.length === 0) {
    return {
      status: 'none',
      members: [seed],
      optimization: null,
      score: null,
      explanation: 'No compatible intents yet. Order individually or wait for more students.',
      classified,
      targetReached: false,
      gapPaise: null,
      membersNeeded: null,
      milestone: null,
    }
  }

  const maxTier = cfg.maxProximityTier ?? 3
  const maxGroupSize = cfg.maxGroupSize ?? 4
  const minOverlapMinutes = cfg.minOverlapMinutes ?? 15
  const minMarginalSavingPaise = cfg.minMarginalSavingPaise ?? 500

  let chosenPool = null
  let bestPartialPool = null

  // Expanding rings: search from closest tier outward
  for (let ringTier = 0; ringTier <= maxTier; ringTier++) {
    const ringCandidates = eligible
      .filter((e) => e.tier !== null && e.tier <= ringTier)
      .slice(0, 25) // Cap candidates for subset combinatorial search

    if (ringCandidates.length === 0) continue

    // Combinations of size 1..(maxGroupSize - 1) to pair with seed
    const candidateCombos = getCombinations(ringCandidates, 1, maxGroupSize - 1)
    const validPoolsInRing = []

    for (const combo of candidateCombos) {
      const trial = [seed, ...combo.map((c) => c.intent)]

      // Check mutual window overlap
      const win = intersectWindow(trial)
      if (win.minutes < minOverlapMinutes) continue

      // Check mutual distance between all pairs in trial
      let mutualOk = true
      for (let i = 0; i < trial.length; i++) {
        for (let j = i + 1; j < trial.length; j++) {
          const t = proximityTier(trial[i], trial[j], cfg)
          if (t === null || t > maxTier) {
            mutualOk = false
            break
          }
        }
        if (!mutualOk) break
      }
      if (!mutualOk) continue

      // Optimize trial
      const optimization = optimize({ members: trial.map(toOptimizerMember), profile, allocation })
      if (optimization.recommendation !== 'pool') continue // STRICT SAVINGS RULE

      // Goal-driven gap check
      const pooledSubtotal = trial.reduce((sum, m) => sum + (m.subtotalPaise || 0), 0)
      const targetInfo = gapToTarget(profile, pooledSubtotal)
      const maxWalk = Math.max(...trial.map((m) => walkMinutes(seed.hostel, m.hostel)))
      const minSavings = Math.min(...optimization.members.map((m) => m.savingsPaise))
      const totalSavings = optimization.totalSavingsPaise

      validPoolsInRing.push({
        trial,
        optimization,
        targetInfo,
        ringTier,
        size: trial.length,
        maxWalk: Number.isFinite(maxWalk) ? maxWalk : 0,
        minSavings,
        totalSavings,
      })
    }

    if (validPoolsInRing.length === 0) continue

    const targetReachedPools = validPoolsInRing.filter((p) => p.targetInfo.targetReached)
    const partialPools = validPoolsInRing.filter((p) => !p.targetInfo.targetReached)

    if (targetReachedPools.length > 0) {
      // Rank target-reaching pools by:
      // (1) Fewest members (size ascending)
      // (2) Smallest max walking distance (maxWalk ascending)
      // (3) Highest minimum savings (minSavings descending)
      // (4) Highest total savings (totalSavings descending)
      targetReachedPools.sort((a, b) => {
        if (a.size !== b.size) return a.size - b.size
        if (a.maxWalk !== b.maxWalk) return a.maxWalk - b.maxWalk
        if (a.minSavings !== b.minSavings) return b.minSavings - a.minSavings
        return b.totalSavings - a.totalSavings
      })

      // Select smallest group, but allow larger group if it satisfies marginal savings
      let bestReached = targetReachedPools[0]
      for (let i = 1; i < targetReachedPools.length; i++) {
        const candidateLarger = targetReachedPools[i]
        if (candidateLarger.size > bestReached.size) {
          const allGainedEnough = bestReached.trial.every((member) => {
            const memberId = String(member.id)
            const currentSav = bestReached.optimization.members.find((m) => m.id === memberId)?.savingsPaise ?? 0
            const newSav = candidateLarger.optimization.members.find((m) => m.id === memberId)?.savingsPaise ?? 0
            return newSav - currentSav >= minMarginalSavingPaise
          })
          if (allGainedEnough && candidateLarger.minSavings >= bestReached.minSavings) {
            bestReached = candidateLarger
          }
        }
      }

      chosenPool = bestReached
      break // STOP! Do not widen further to wider rings once target is reached!
    }

    // No target-reaching pool in this ring; track best strictly-saving partial pool
    if (partialPools.length > 0) {
      partialPools.sort((a, b) => {
        if (a.targetInfo.deliveryGapPaise !== b.targetInfo.deliveryGapPaise) {
          return a.targetInfo.deliveryGapPaise - b.targetInfo.deliveryGapPaise // Closest to target
        }
        if (a.minSavings !== b.minSavings) return b.minSavings - a.minSavings
        if (a.maxWalk !== b.maxWalk) return a.maxWalk - b.maxWalk
        return a.size - b.size
      })

      if (
        !bestPartialPool ||
        partialPools[0].targetInfo.deliveryGapPaise < bestPartialPool.targetInfo.deliveryGapPaise ||
        partialPools[0].minSavings > bestPartialPool.minSavings
      ) {
        bestPartialPool = partialPools[0]
      }
    }
  }

  const selected = chosenPool || bestPartialPool

  if (!selected) {
    // If no candidate ever saved money
    return {
      status: 'individual',
      members: [seed],
      optimization: null,
      score: null,
      explanation: 'Pooling is not recommended. Individual ordering is cheaper or fee savings cannot be achieved.',
      classified,
      targetReached: false,
      gapPaise: null,
      membersNeeded: null,
      milestone: null,
    }
  }

  // Populate classified tags for chosen members
  const memberIds = new Set(selected.trial.map((m) => String(m.id)))
  for (const { intent, score } of eligible) {
    if (memberIds.has(String(intent.id)) && String(intent.id) !== String(seed.id)) {
      classified.push({
        intentId: String(intent.id),
        class: score.total >= 60 ? 'strong' : 'potential',
        reason: `Match score ${score.total}/100 (${score.proximityLabel})`,
      })
    }
  }

  // Compute composite score for selected pool
  const pairScores = selected.trial.slice(1).map((m) => pairScore(seed, m, cfg))
  const avg = (fn) => (pairScores.length ? Math.round(pairScores.reduce((s, p) => s + fn(p), 0) / pairScores.length) : 100)
  const minPct = Math.min(...selected.optimization.members.map((m) => m.savingsPercent))
  const benefit = Math.max(0, Math.min(100, Math.round(minPct * 5)))
  const w = cfg.weights
  const denom = w.product + w.proximity + w.time + w.readiness + w.benefit
  const components = {
    product: avg((p) => p.components.product),
    proximity: avg((p) => p.components.proximity),
    time: avg((p) => p.components.time),
    readiness: avg((p) => p.components.readiness),
    benefit,
  }
  const total = Math.round(
    (components.product * w.product +
      components.proximity * w.proximity +
      components.time * w.time +
      components.readiness * w.readiness +
      components.benefit * w.benefit) /
    denom,
  )

  const pooledSubtotal = selected.trial.reduce((sum, m) => sum + (m.subtotalPaise || 0), 0)
  const avgCart = selected.trial.length > 0 ? pooledSubtotal / selected.trial.length : 1
  const membersNeeded =
    selected.targetInfo.deliveryGapPaise > 0 && avgCart > 0
      ? Math.ceil(selected.targetInfo.deliveryGapPaise / avgCart)
      : 0

  return {
    status: 'pool',
    members: selected.trial,
    optimization: selected.optimization,
    score: { total, components },
    explanation: buildGoalExplanation(selected.trial, selected.optimization, selected.targetInfo, selected.ringTier),
    classified,
    targetReached: selected.targetInfo.targetReached,
    gapPaise: selected.targetInfo.deliveryGapPaise,
    smallCartGapPaise: selected.targetInfo.smallCartGapPaise,
    membersNeeded: membersNeeded > 0 ? membersNeeded : null,
    milestone: selected.targetInfo.nextMilestone,
  }
}

module.exports = {
  DEFAULT_CONFIG,
  overlapMinutes,
  pairCompatibility,
  proximityScore,
  pairScore,
  intersectWindow,
  proposeGroup,
  toOptimizerMember,
  buildGoalExplanation,
}
