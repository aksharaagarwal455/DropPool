const crypto = require('crypto')
const Pool = require('../models/Pool')
const Payment = require('../models/Payment')
const ShoppingIntent = require('../models/ShoppingIntent')
const User = require('../models/User')
const { env } = require('../config/env')
const { AppError } = require('../middleware/errorHandler')
const { objectId, cleanText, firstName } = require('../utils/validate')
const { getProfile } = require('./fees/feeService')
const { optimize, finalShares } = require('./optimization/optimizer')
const { pairCompatibility, intersectWindow } = require('./matching/matcher')
const { matchConfig } = require('./matchingService')
const { toPlain, expireStale } = require('./intentService')
const { canTransition, HOST_TRIGGERED } = require('./orders/transitions')
const { buildUpiUri } = require('../utils/upi')
const { formatPaise, isPaise } = require('./money')

const PAYMENT_NOTICE = 'A UPI link or QR code starts a payment. It does not prove that money arrived. The host confirms receipt manually.'

function wrapConflict(error) {
  if (error && error.name === 'VersionError') {
    return new AppError('This pool changed at the same time. Reload and try again.', 409)
  }
  return error
}

async function saveSafely(doc) {
  try {
    await doc.save()
  } catch (error) {
    throw wrapConflict(error)
  }
}

function optimizerMembers(pool) {
  return pool.members.map((m) => ({ id: String(m.userId), label: m.name, subtotalPaise: m.subtotalPaise, observedFeesPaise: m.observedFeesPaise ?? null }))
}

function pushHistory(pool, status, by, note = '') {
  pool.history.push({ status, at: new Date(), by, note })
}

async function releaseIntents(intentIds, to) {
  const now = new Date()
  const docs = await ShoppingIntent.find({ _id: { $in: intentIds } })
  for (const d of docs) {
    const next = to === 'active' ? (d.windowEnd > now ? 'active' : 'expired') : to
    await ShoppingIntent.updateOne({ _id: d._id }, { $set: { status: next, reservedBy: null } })
  }
}

/**
 * Reserve every intent or none. Ids are claimed in sorted order with a unique token, then read back:
 * if any intent carries another token, someone else won the race and we release only our own claims.
 * This stays correct even if the database does not make the conditional update fully atomic.
 */
async function reserveAll(ids, token) {
  const claimed = []
  const fail = async () => {
    if (claimed.length) {
      await ShoppingIntent.updateMany({ _id: { $in: claimed }, reservedBy: token }, { $set: { status: 'active', reservedBy: null } })
    }
    throw new AppError('Another pool just reserved one of these intents. Run matching again.', 409)
  }
  for (const id of ids) {
    const got = await ShoppingIntent.findOneAndUpdate({ _id: id, status: 'active' }, { $set: { status: 'reserved', reservedBy: token } }, { returnDocument: 'after' })
    if (!got) return fail()
    claimed.push(id)
  }
  const check = await ShoppingIntent.find({ _id: { $in: ids } })
  if (check.length !== ids.length || check.some((c) => c.reservedBy !== token || c.status !== 'reserved')) return fail()
}

async function createPool(userId, rawIds) {
  if (!Array.isArray(rawIds) || rawIds.length < 2 || rawIds.length > env.maxGroupSize) {
    throw new AppError(`A pool needs between 2 and ${env.maxGroupSize} intents`, 422)
  }
  const ids = [...new Set(rawIds.map((id) => objectId(id, 'intent id')))].sort()
  if (ids.length !== rawIds.length) throw new AppError('Duplicate intent ids', 422)
  await expireStale()

  const docs = await ShoppingIntent.find({ _id: { $in: ids } })
  if (docs.length !== ids.length) throw new AppError('Intent not found', 404)
  if (docs.some((d) => d.status !== 'active')) throw new AppError('One of the intents is no longer available', 409)
  const owned = docs.filter((d) => String(d.userId) === String(userId))
  if (owned.length !== 1) throw new AppError('Include exactly one of your own intents; you become the host', 422)
  if (new Set(docs.map((d) => String(d.userId))).size !== docs.length) throw new AppError('Each student can only appear once in a pool', 422)

  const host = toPlain(owned[0])
  const plains = docs.map(toPlain)
  const cfg = matchConfig()
  for (const p of plains) {
    if (p.id === host.id) continue
    const compat = pairCompatibility(host, p, cfg)
    if (!compat.compatible) throw new AppError(`Intents are not compatible: ${compat.reasons.join('; ')}`, 422)
  }
  if (intersectWindow(plains).minutes < cfg.minOverlapMinutes) throw new AppError('The delivery windows do not overlap enough', 422)

  const profile = await getProfile(host.platform)
  const members = plains.map((p) => ({ id: p.userId, label: p.userName, subtotalPaise: p.subtotalPaise, observedFeesPaise: p.observedFeesPaise }))
  const optimization = optimize({ members, profile })
  if (optimization.recommendation !== 'pool') {
    throw new AppError(optimization.reason, 422, { recommendation: optimization.recommendation })
  }

  let token = crypto.randomUUID()
  try {
    await reserveAll(ids, token)
  } catch (error) {
    if (!(error instanceof AppError) || error.statusCode !== 409) throw error
    await new Promise((resolve) => setTimeout(resolve, 20 + Math.floor(Math.random() * 60)))
    token = crypto.randomUUID()
    await reserveAll(ids, token)
  }
  const reserved = ids

  const users = await User.find({ _id: { $in: plains.map((p) => p.userId) } })
  const userMap = new Map(users.map((u) => [String(u._id), u]))
  const rows = new Map(optimization.members.map((r) => [r.id, r]))
  try {
    const pool = await Pool.create({
      code: `DP-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
      hostUserId: userId,
      platform: host.platform,
      hostel: host.hostel,
      block: host.block,
      status: 'proposed',
      members: plains.map((p) => {
        const u = userMap.get(p.userId)
        return {
          userId: p.userId, intentId: p.id, name: firstName(u?.name || p.userName), hostel: p.hostel, block: p.block, floor: p.floor,
          items: p.items, subtotalPaise: p.subtotalPaise, observedFeesPaise: p.observedFeesPaise,
          confirmed: p.userId === String(userId), estimatedSharePaise: rows.get(p.userId).sharePaise,
        }
      }),
      feeProfileSnapshot: profile,
      optimization,
      isDemo: Boolean(userMap.get(String(userId))?.isDemo),
      history: [{ status: 'proposed', at: new Date(), by: userId, note: 'Pool created' }],
    })
    return viewPool(pool, userId)
  } catch (error) {
    await ShoppingIntent.updateMany({ _id: { $in: reserved }, reservedBy: token }, { $set: { status: 'active', reservedBy: null } })
    throw error
  }
}

async function loadForMember(userId, poolId) {
  const pool = await Pool.findById(objectId(poolId, 'pool id'))
  if (!pool || !pool.members.some((m) => String(m.userId) === String(userId))) throw new AppError('Pool not found', 404)
  return pool
}

async function loadForHost(userId, poolId) {
  const pool = await loadForMember(userId, poolId)
  if (String(pool.hostUserId) !== String(userId)) throw new AppError('Only the host can do this', 403)
  return pool
}

async function confirmMembership(userId, poolId) {
  const pool = await loadForMember(userId, poolId)
  if (pool.status !== 'proposed') throw new AppError('This pool is no longer waiting for confirmations', 409)
  const member = pool.members.find((m) => String(m.userId) === String(userId))
  if (member.confirmed) throw new AppError('You already confirmed', 409)
  member.confirmed = true
  if (pool.members.every((m) => m.confirmed)) {
    pool.status = 'confirmed'
    pushHistory(pool, 'confirmed', userId, 'All members confirmed')
  }
  await saveSafely(pool)
  if (pool.status === 'confirmed') {
    await ShoppingIntent.updateMany({ _id: { $in: pool.members.map((m) => m.intentId) } }, { $set: { status: 'pooled' } })
  }
  return viewPool(pool, userId)
}

async function confirmAllMembers(userId, poolId) {
  const pool = await loadForMember(userId, poolId)
  if (pool.status !== 'proposed') return viewPool(pool, userId)
  for (const m of pool.members) {
    m.confirmed = true
  }
  pool.status = 'confirmed'
  pushHistory(pool, 'confirmed', userId, 'All members confirmed')
  await saveSafely(pool)
  await ShoppingIntent.updateMany({ _id: { $in: pool.members.map((m) => m.intentId) } }, { $set: { status: 'pooled' } })
  return viewPool(pool, userId)
}

async function cancelInternal(pool, byUserId, note) {
  const before = pool.status
  pool.status = 'cancelled'
  pushHistory(pool, 'cancelled', byUserId, note)
  await saveSafely(pool)
  await releaseIntents(pool.members.map((m) => m.intentId), 'active')
  await Payment.updateMany({ poolId: pool._id, status: { $in: ['pending', 'claimed', 'rejected'] } }, { $set: { status: 'rejected', rejectReason: 'Pool cancelled', decidedAt: new Date() } })
  if (before !== 'proposed') await User.updateOne({ _id: pool.hostUserId }, { $inc: { 'trust.cancelledPools': 1 } })
}

async function leavePool(userId, poolId) {
  const pool = await loadForMember(userId, poolId)
  if (!['proposed', 'confirmed'].includes(pool.status)) throw new AppError('You can only leave before payments start', 409)
  if (String(pool.hostUserId) === String(userId)) {
    await cancelInternal(pool, userId, 'Host left, pool cancelled')
    return viewPool(pool, userId)
  }
  const leaving = pool.members.find((m) => String(m.userId) === String(userId))
  pool.members = pool.members.filter((m) => String(m.userId) !== String(userId))
  await releaseIntents([leaving.intentId], 'active')
  const optimization = pool.members.length >= 2 ? optimize({ members: optimizerMembers(pool), profile: pool.feeProfileSnapshot, allocation: pool.allocation }) : null
  if (!optimization || optimization.recommendation !== 'pool') {
    await cancelInternal(pool, userId, `${leaving.name} left and pooling no longer saves money`)
    return viewPool(pool, userId)
  }
  const rows = new Map(optimization.members.map((r) => [r.id, r]))
  for (const m of pool.members) {
    m.estimatedSharePaise = rows.get(String(m.userId)).sharePaise
    m.confirmed = String(m.userId) === String(pool.hostUserId)
  }
  pool.optimization = optimization
  pool.status = 'proposed'
  pushHistory(pool, 'proposed', userId, `${leaving.name} left. Costs recalculated; members must confirm again.`)
  await saveSafely(pool)
  await ShoppingIntent.updateMany({ _id: { $in: pool.members.map((m) => m.intentId) } }, { $set: { status: 'reserved' } })
  return viewPool(pool, userId)
}

async function recordActualTotal(userId, poolId, actualTotalPaise) {
  const pool = await loadForHost(userId, poolId)
  if (pool.status !== 'confirmed') throw new AppError('Record the checkout total once every member has confirmed', 409)
  if (!isPaise(actualTotalPaise) || actualTotalPaise <= 0 || actualTotalPaise > 100000000) throw new AppError('Enter the real checkout total in paise', 422)
  const host = await User.findById(userId).select('+upiId name isDemo')
  if (!host?.upiId) {
    if (host?.isDemo) {
      host.upiId = `${(host.name || 'kabir').toLowerCase().replace(/\s+/g, '')}.demo@okaxis`
      await host.save()
    } else {
      throw new AppError('Add your UPI id in your profile before collecting payments', 422)
    }
  }

  let result
  try {
    result = finalShares({ members: optimizerMembers(pool), actualTotalPaise, allocation: pool.allocation })
  } catch (error) {
    if (error instanceof RangeError) throw new AppError(error.message, 422)
    throw error
  }
  const shares = new Map(result.shares.map((s) => [s.id, s.sharePaise]))
  for (const m of pool.members) m.finalSharePaise = shares.get(String(m.userId))
  pool.actualTotalPaise = actualTotalPaise
  pool.extraChargesPaise = result.extraChargesPaise
  pool.status = 'awaiting_payments'
  pushHistory(pool, 'awaiting_payments', userId, `Host recorded checkout total ${formatPaise(actualTotalPaise)}`)
  await saveSafely(pool)

  const payers = pool.members.filter((m) => String(m.userId) !== String(pool.hostUserId))
  await Payment.insertMany(payers.map((m) => ({ poolId: pool._id, userId: m.userId, hostId: pool.hostUserId, amountPaise: m.finalSharePaise, isDemo: pool.isDemo })))
  return viewPool(pool, userId)
}

async function hostTransition(userId, poolId, to, body = {}) {
  const pool = await loadForHost(userId, poolId)
  if (!HOST_TRIGGERED.includes(to)) throw new AppError('That step happens automatically', 422)
  if (!canTransition(pool.status, to)) throw new AppError(`Cannot move from ${pool.status} to ${to}`, 409)
  if (to === 'cancelled') {
    await cancelInternal(pool, userId, cleanText(body.note, 'Note', 120, { required: false }) || 'Cancelled by host')
    return viewPool(pool, userId)
  }
  if (to === 'ready_for_pickup') {
    pool.pickup.location = cleanText(body.pickupLocation, 'Pickup location', 80)
    if (body.eta) {
      const eta = new Date(body.eta)
      if (Number.isNaN(eta.getTime())) throw new AppError('Estimated pickup time is invalid', 422)
      pool.pickup.eta = eta
    }
  }
  pool.status = to
  pushHistory(pool, to, userId)
  await saveSafely(pool)
  if (to === 'completed') await User.updateMany({ _id: { $in: pool.members.map((m) => m.userId) } }, { $inc: { 'trust.completedPools': 1 } })
  return viewPool(pool, userId)
}

async function listMine(userId) {
  const pools = await Pool.find({ 'members.userId': userId }).sort({ createdAt: -1 }).limit(50)
  return pools.map((p) => {
    const member = p.members.find((m) => String(m.userId) === String(userId))
    const row = p.optimization?.members?.find((r) => String(r.id) === String(userId))
    const individualTotalPaise = row?.individualTotalPaise ?? null
    const mySharePaise = member?.finalSharePaise ?? member?.estimatedSharePaise ?? row?.sharePaise ?? null
    const savingsPaise = individualTotalPaise !== null && mySharePaise !== null ? individualTotalPaise - mySharePaise : null

    return {
      id: String(p._id),
      code: p.code,
      platform: p.platform,
      status: p.status,
      isHost: String(p.hostUserId) === String(userId),
      memberCount: p.members.length,
      mySharePaise,
      individualTotalPaise,
      savingsPaise,
      createdAt: p.createdAt,
      isDemo: p.isDemo,
    }
  })
}

async function getPool(userId, poolId) {
  const pool = await loadForMember(userId, poolId)
  return viewPool(pool, userId)
}

async function viewPool(pool, viewerId) {
  const isHost = String(pool.hostUserId) === String(viewerId)
  const host = await User.findById(pool.hostUserId).select('name')
  const payments = await Payment.find({ poolId: pool._id })
  const mine = payments.find((p) => String(p.userId) === String(viewerId))
  const nameOf = new Map(pool.members.map((m) => [String(m.userId), m.name]))
  const hostWithUpi = mine || isHost ? await User.findById(pool.hostUserId).select('+upiId name') : null

  const paymentView = (p) => ({
    id: String(p._id), userId: String(p.userId), name: nameOf.get(String(p.userId)) || 'Member', amountPaise: p.amountPaise,
    status: p.status, utr: p.utr, claimedAt: p.claimedAt, rejectReason: p.rejectReason,
  })
  const myPayment = mine ? {
    ...paymentView(mine),
    upiUri: ['pending', 'rejected'].includes(mine.status) && hostWithUpi?.upiId
      ? buildUpiUri({ payeeVpa: hostWithUpi.upiId, payeeName: firstName(hostWithUpi.name), amountPaise: mine.amountPaise, note: `DropPool ${pool.code}`, reference: `${pool.code}-${String(mine._id).slice(-6)}` })
      : null,
    notice: PAYMENT_NOTICE,
  } : null

  const confirmedAll = payments.length > 0 && payments.every((p) => p.status === 'confirmed')
  const nextHost = { payments_confirmed: 'order_placed', order_placed: 'ready_for_pickup', ready_for_pickup: 'completed' }[pool.status] || null
  const warnings = []
  if (pool.actualTotalPaise) {
    for (const m of pool.members) {
      const row = pool.optimization.members.find((r) => r.id === String(m.userId))
      if (row && m.finalSharePaise > row.individualTotalPaise) warnings.push(`${m.name}'s final share (${formatPaise(m.finalSharePaise)}) is above the individual estimate (${formatPaise(row.individualTotalPaise)}).`)
    }
  }
  return {
    id: String(pool._id), code: pool.code, platform: pool.platform, status: pool.status, isDemo: pool.isDemo,
    hostel: pool.hostel, block: pool.block, isHost, hostName: host ? firstName(host.name) : 'Host',
    members: pool.members.map((m) => ({
      userId: String(m.userId), name: m.name, hostel: m.hostel, block: m.block, floor: m.floor, isHost: String(m.userId) === String(pool.hostUserId),
      confirmed: m.confirmed, items: m.items.map((i) => ({ name: i.name, qty: i.qty, unitPricePaise: i.unitPricePaise })),
      subtotalPaise: m.subtotalPaise, estimatedSharePaise: m.estimatedSharePaise, finalSharePaise: m.finalSharePaise,
    })),
    optimization: pool.optimization, feeProfileIsIllustrative: Boolean(pool.feeProfileSnapshot?.isIllustrative),
    actualTotalPaise: pool.actualTotalPaise, extraChargesPaise: pool.extraChargesPaise,
    pickup: { location: pool.pickup?.location || '', eta: pool.pickup?.eta || null },
    history: pool.history.map((h) => ({ status: h.status, at: h.at, note: h.note })),
    payments: isHost ? payments.map(paymentView) : [],
    myPayment, warnings, paymentNotice: PAYMENT_NOTICE,
    actions: {
      canConfirm: pool.status === 'proposed' && pool.members.some((m) => String(m.userId) === String(viewerId) && !m.confirmed),
      canLeave: ['proposed', 'confirmed'].includes(pool.status),
      canRecordTotal: isHost && pool.status === 'confirmed',
      nextHostStatus: isHost ? nextHost : null,
      canCancel: isHost && canTransition(pool.status, 'cancelled'),
      allPaymentsConfirmed: confirmedAll,
    },
  }
}

module.exports = { createPool, confirmMembership, confirmAllMembers, leavePool, recordActualTotal, hostTransition, listMine, getPool, PAYMENT_NOTICE, saveSafely, pushHistory }
