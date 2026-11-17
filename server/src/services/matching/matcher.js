const { optimize } = require('../optimization/optimizer')
const { formatPaise } = require('../money')
const { productSimilarity, sharedProductNames, normalizeName } = require('./similarity')

const DEFAULT_CONFIG = {
  maxGroupSize: 4,
  minOverlapMinutes: 15,
  allowCrossHostel: false,
  weights: { product: 20, proximity: 20, time: 20, readiness: 10, benefit: 30 },
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
  const reasons = []
  if (String(a.userId) === String(b.userId)) reasons.push('Same student')
  if (a.platform !== b.platform) reasons.push('Different shopping platforms')
  if (!config.allowCrossHostel && key(a.hostel) !== key(b.hostel)) reasons.push('Different hostels')
  if (new Date(b.windowEnd).getTime() <= now.getTime()) reasons.push('Intent has expired')
  const overlap = overlapMinutes(a.windowStart, a.windowEnd, b.windowStart, b.windowEnd)
  if (overlap < config.minOverlapMinutes) reasons.push('Delivery windows do not overlap enough')
  return { compatible: reasons.length === 0, reasons, overlapMinutes: overlap }
}

function proximityScore(a, b) {
  if (key(a.hostel) !== key(b.hostel)) return { score: 20, label: 'different hostels' }
  if (key(a.block) !== key(b.block)) return { score: 50, label: 'same hostel' }
  if (key(a.floor) === key(b.floor)) return { score: 100, label: 'same floor' }
  return { score: 80, label: 'same block' }
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
  const proximity = proximityScore(a, b)
  const time = timeScore(a, b, config)
  const readiness = Math.min(readinessScore(a), readinessScore(b))
  const w = config.weights
  const denom = w.product + w.proximity + w.time + w.readiness
  const total = Math.round((product.score * w.product + proximity.score * w.proximity + time.score * w.time + readiness * w.readiness) / denom)
  return {
    total,
    components: { product: product.score, proximity: proximity.score, time: time.score, readiness },
    sharedProducts: sharedProductNames(a.items, b.items),
    proximityLabel: proximity.label,
    overlapMinutes: time.overlap,
  }
}

function intersectWindow(members) {
  const start = Math.max(...members.map((m) => new Date(m.windowStart).getTime()))
  const end = Math.min(...members.map((m) => new Date(m.windowEnd).getTime()))
  return { start, end, minutes: Math.max(0, Math.floor((end - start) / MIN)) }
}

function toOptimizerMember(intent) {
  return { id: String(intent.id), label: intent.userName || String(intent.id), subtotalPaise: intent.subtotalPaise, observedFeesPaise: intent.observedFeesPaise ?? null }
}

function buildExplanation(group, optimization, config) {
  const platformName = group[0].platform
  const locations = new Set(group.map((m) => key(m.hostel)))
  const where = locations.size === 1 ? `${group[0].hostel}` : 'nearby hostels'
  const win = intersectWindow(group)
  const sharedLists = []
  const seed = group[0]
  for (const other of group.slice(1)) sharedLists.push(...sharedProductNames(seed.items, other.items))
  const shared = [...new Set(sharedLists)].slice(0, 3)
  const parts = [`all ${group.length} students chose ${platformName}`, `are in ${where}`, `have delivery windows that overlap for about ${win.minutes} minutes`]
  if (shared.length) parts.push(`share products like ${shared.join(', ')}`)
  const base = `Matched because ${parts.join(', ')}.`
  return optimization.recommendation === 'pool' ? `${base} ${optimization.reason}` : `${base} ${optimization.reason}`
}

/**
 * seed: the intent of the student asking. candidates: other active intents (plain objects).
 * Never groups intents just because the platform is the same.
 */
function proposeGroup({ seed, candidates, profile, config = DEFAULT_CONFIG, now = new Date(), allocation = 'proportional' }) {
  const cfg = { ...DEFAULT_CONFIG, ...config, weights: { ...DEFAULT_CONFIG.weights, ...(config.weights || {}) } }
  const classified = []
  const eligible = []

  if (seed.subtotalPaise === null || seed.subtotalPaise === undefined) {
    return { status: 'needs_prices', members: [seed], optimization: null, score: null, explanation: 'Add a price for every item before matching.', classified }
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
    eligible.push({ intent: c, score })
  }
  eligible.sort((a, b) => b.score.total - a.score.total || String(a.intent.id).localeCompare(String(b.intent.id)))

  if (eligible.length === 0) {
    return { status: 'none', members: [seed], optimization: null, score: null, explanation: 'No compatible intents yet. Order individually or wait for more students.', classified }
  }

  const group = [seed]
  let best = null
  let firstEvaluated = null
  for (const { intent } of eligible) {
    if (group.length >= cfg.maxGroupSize) break
    const trial = [...group, intent]
    if (intersectWindow(trial).minutes < cfg.minOverlapMinutes) {
      classified.push({ intentId: String(intent.id), class: 'incompatible', reason: 'Window does not overlap with the rest of the group' })
      continue
    }
    const optimization = optimize({ members: trial.map(toOptimizerMember), profile, allocation })
    if (!firstEvaluated) firstEvaluated = { trial, optimization }
    if (optimization.recommendation === 'pool') {
      const better = !best || optimization.totalSavingsPaise > best.optimization.totalSavingsPaise
      if (better) best = { trial, optimization }
      group.push(intent)
    } else if (optimization.recommendation === 'insufficient_data') {
      classified.push({ intentId: String(intent.id), class: 'potential', reason: optimization.reason })
    } else {
      classified.push({ intentId: String(intent.id), class: 'incompatible', reason: 'Adding this student would remove the savings' })
    }
  }

  if (!best) {
    const ref = firstEvaluated
    return {
      status: 'individual',
      members: ref ? ref.trial : [seed],
      optimization: ref ? ref.optimization : null,
      score: null,
      explanation: ref ? ref.optimization.reason : 'No pool would save money.',
      classified,
    }
  }

  const memberIds = new Set(best.trial.map((m) => String(m.id)))
  for (const { intent, score } of eligible) {
    if (memberIds.has(String(intent.id)) && String(intent.id) !== String(seed.id)) {
      classified.push({ intentId: String(intent.id), class: score.total >= 60 ? 'strong' : 'potential', reason: `Match score ${score.total}/100 (${score.proximityLabel})` })
    }
  }

  const pairScores = best.trial.slice(1).map((m) => pairScore(seed, m, cfg))
  const avg = (fn) => Math.round(pairScores.reduce((s, p) => s + fn(p), 0) / pairScores.length)
  const minPct = Math.min(...best.optimization.members.map((m) => m.savingsPercent))
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
  const total = Math.round((components.product * w.product + components.proximity * w.proximity + components.time * w.time + components.readiness * w.readiness + components.benefit * w.benefit) / denom)

  return {
    status: 'pool',
    members: best.trial,
    optimization: best.optimization,
    score: { total, components },
    explanation: buildExplanation(best.trial, best.optimization, cfg),
    classified,
  }
}

module.exports = { DEFAULT_CONFIG, overlapMinutes, pairCompatibility, pairScore, intersectWindow, proposeGroup, toOptimizerMember }
