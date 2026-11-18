const ShoppingIntent = require('../models/ShoppingIntent')
const { env } = require('../config/env')
const { AppError } = require('../middleware/errorHandler')
const { objectId } = require('../utils/validate')
const { getProfile } = require('./fees/feeService')
const { DEFAULT_CONFIG, proposeGroup } = require('./matching/matcher')
const { optimize } = require('./optimization/optimizer')
const { toPlain, expireStale } = require('./intentService')

const { proximityTier, walkMinutes, proximityLabel } = require('../utils/distance')

function matchConfig() {
  return {
    ...DEFAULT_CONFIG,
    maxGroupSize: env.maxGroupSize,
    maxProximityTier: env.maxProximityTier,
    nearMin: env.nearMin,
    enableCampusWide: env.enableCampusWide,
    minMarginalSavingPaise: env.minMarginalSavingPaise,
  }
}

function publicMember(plain, seed, config) {
  const tier = seed ? proximityTier(seed, plain, config) : null
  const walk = seed ? walkMinutes(seed.hostel, plain.hostel) : 0
  const isSelf = seed && String(plain.id) === String(seed.id)
  return {
    intentId: plain.id,
    name: plain.userName,
    hostel: plain.hostel,
    block: plain.block,
    floor: plain.floor,
    itemCount: plain.items.length,
    subtotalPaise: plain.subtotalPaise,
    isSelf,
    proximityTier: isSelf ? 0 : tier,
    walkMinutes: isSelf ? 0 : (Number.isFinite(walk) ? walk : null),
    distanceLabel: isSelf ? 'you' : proximityLabel(tier, walk),
  }
}

async function runMatching(userId, intentId) {
  await expireStale()
  const seedDoc = await ShoppingIntent.findById(objectId(intentId, 'intent id'))
  if (!seedDoc || String(seedDoc.userId) !== String(userId)) throw new AppError('Intent not found', 404)
  if (seedDoc.status !== 'active') throw new AppError('Only active intents can be matched', 409)
  const seed = toPlain(seedDoc)
  const docs = await ShoppingIntent.find({ status: 'active', platform: seed.platform, userId: { $ne: userId } }).limit(200)
  const profile = await getProfile(seed.platform)
  const cfg = matchConfig()
  const result = proposeGroup({ seed, candidates: docs.map(toPlain), profile, config: cfg })
  return {
    status: result.status,
    explanation: result.explanation,
    score: result.score,
    members: result.members.map((m) => publicMember(m, seed, cfg)),
    intentIds: result.members.map((m) => m.id),
    optimization: result.optimization,
    classified: result.classified,
    feeProfile: { version: profile?.version ?? null, isIllustrative: profile?.isIllustrative ?? true },
    targetReached: result.targetReached ?? false,
    gapPaise: result.gapPaise ?? null,
    smallCartGapPaise: result.smallCartGapPaise ?? null,
    membersNeeded: result.membersNeeded ?? null,
    milestone: result.milestone ?? null,
  }
}

async function previewOptimization(userId, intentIds, allocation) {
  if (!Array.isArray(intentIds) || intentIds.length < 1 || intentIds.length > 6) throw new AppError('Provide between 1 and 6 intent ids', 422)
  const ids = intentIds.map((id) => objectId(id, 'intent id'))
  const docs = await ShoppingIntent.find({ _id: { $in: ids } })
  if (docs.length !== ids.length) throw new AppError('Intent not found', 404)
  if (!docs.some((d) => String(d.userId) === String(userId))) throw new AppError('Include at least one of your own intents', 403)
  if (new Set(docs.map((d) => d.platform)).size !== 1) throw new AppError('All intents must use the same platform', 422)
  const profile = await getProfile(docs[0].platform)
  const members = docs.map(toPlain).map((p) => ({ id: p.id, label: p.userName, subtotalPaise: p.subtotalPaise, observedFeesPaise: p.observedFeesPaise }))
  try {
    return optimize({ members, profile, allocation: allocation || 'proportional' })
  } catch (error) {
    if (error instanceof RangeError) throw new AppError(error.message, 422)
    throw error
  }
}

module.exports = { runMatching, previewOptimization, matchConfig }
