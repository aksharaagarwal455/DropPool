const ShoppingIntent = require('../models/ShoppingIntent')
const User = require('../models/User')
const { AppError } = require('../middleware/errorHandler')
const { PLATFORMS } = require('./fees/defaultProfiles')
const { cleanText, objectId, dateValue, firstName } = require('../utils/validate')
const { isPaise } = require('./money')
const { proximityTier, walkMinutes, proximityLabel } = require('../utils/distance')
const { env } = require('../config/env')

const MAX_WINDOW_MS = 24 * 60 * 60 * 1000

function parseItems(raw) {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 30) throw new AppError('Add between 1 and 30 items', 422)
  return raw.map((item, index) => {
    const name = cleanText(item?.name, `Item ${index + 1} name`, 80)
    const qty = item?.qty
    if (!Number.isInteger(qty) || qty < 1 || qty > 50) throw new AppError(`Item ${index + 1} quantity must be a whole number from 1 to 50`, 422)
    let price = item?.unitPricePaise
    if (price === undefined || price === null || price === '') price = null
    else if (!isPaise(price) || price < 0 || price > 10000000) throw new AppError(`Item ${index + 1} price is invalid`, 422)
    return { name, qty, unitPricePaise: price }
  })
}

function computeSubtotal(items) {
  if (items.some((i) => i.unitPricePaise === null || i.unitPricePaise === undefined)) return null
  return items.reduce((sum, i) => sum + i.qty * i.unitPricePaise, 0)
}

function parseObservedFees(value) {
  if (value === undefined || value === null || value === '') return null
  if (!isPaise(value) || value < 0 || value > 1000000) throw new AppError('Observed fees are invalid', 422)
  return value
}

function parseWindow(body, now = new Date()) {
  const start = dateValue(body?.windowStart, 'Window start')
  const end = dateValue(body?.windowEnd, 'Window end')
  if (end <= start) throw new AppError('Window end must be after window start', 422)
  if (end <= now) throw new AppError('Window must end in the future', 422)
  if (end - start > MAX_WINDOW_MS) throw new AppError('Window can be at most 24 hours long', 422)
  if (start.getTime() - now.getTime() > MAX_WINDOW_MS) throw new AppError('Window must start within the next 24 hours', 422)
  return { windowStart: start, windowEnd: end }
}

function toIntentView(doc, { owner = true } = {}) {
  const o = typeof doc.toObject === 'function' ? doc.toObject() : doc
  const view = {
    id: String(o._id),
    platform: o.platform,
    items: owner ? o.items.map((i) => ({ name: i.name, qty: i.qty, unitPricePaise: i.unitPricePaise ?? null })) : o.items.map((i) => ({ name: i.name, qty: i.qty })),
    windowStart: o.windowStart,
    windowEnd: o.windowEnd,
    hostel: o.hostel,
    block: o.block,
    floor: o.floor,
    status: o.status,
    createdAt: o.createdAt,
  }
  if (owner) {
    view.subtotalPaise = o.subtotalPaise ?? null
    view.observedFeesPaise = o.observedFeesPaise ?? null
    view.notes = o.notes || ''
    view.source = o.source
    view.ready = o.subtotalPaise !== null && o.subtotalPaise !== undefined
    view.isDemo = Boolean(o.isDemo)
  } else {
    view.studentName = o.userName
  }
  return view
}

async function expireStale(now = new Date()) {
  await ShoppingIntent.updateMany({ status: 'active', windowEnd: { $lte: now } }, { $set: { status: 'expired' } })
}

async function createIntent(userId, body) {
  const user = await User.findById(userId)
  if (!user) throw new AppError('Invalid or expired token', 401)
  if (!PLATFORMS.includes(body?.platform)) throw new AppError('Choose Blinkit, Zepto or Instamart', 422)
  const items = parseItems(body.items)
  const windowParts = parseWindow(body)
  const doc = await ShoppingIntent.create({
    userId: user._id,
    userName: firstName(user.name),
    platform: body.platform,
    items,
    subtotalPaise: computeSubtotal(items),
    observedFeesPaise: parseObservedFees(body.observedFeesPaise),
    ...windowParts,
    hostel: cleanText(body.hostel ?? user.hostel, 'Hostel', 80),
    block: cleanText(body.block ?? user.block, 'Block', 80),
    floor: cleanText(body.floor ?? user.floor, 'Floor', 40),
    notes: cleanText(body.notes, 'Notes', 200, { required: false }),
    source: body.source === 'screenshot' ? 'screenshot' : 'manual',
    isDemo: Boolean(user.isDemo),
  })
  return toIntentView(doc)
}

async function loadOwned(userId, intentId) {
  const doc = await ShoppingIntent.findById(objectId(intentId, 'intent id'))
  if (!doc || String(doc.userId) !== String(userId)) throw new AppError('Intent not found', 404)
  return doc
}

async function updateIntent(userId, intentId, body) {
  const doc = await loadOwned(userId, intentId)
  if (doc.status !== 'active') throw new AppError('Only active intents can be edited', 409)
  if (body.platform !== undefined) {
    if (!PLATFORMS.includes(body.platform)) throw new AppError('Choose Blinkit, Zepto or Instamart', 422)
    doc.platform = body.platform
  }
  if (body.items !== undefined) {
    doc.items = parseItems(body.items)
    doc.subtotalPaise = computeSubtotal(doc.items)
  }
  if (body.windowStart !== undefined || body.windowEnd !== undefined) {
    const parts = parseWindow({ windowStart: body.windowStart ?? doc.windowStart, windowEnd: body.windowEnd ?? doc.windowEnd })
    doc.windowStart = parts.windowStart
    doc.windowEnd = parts.windowEnd
  }
  if (body.observedFeesPaise !== undefined) doc.observedFeesPaise = parseObservedFees(body.observedFeesPaise)
  if (body.notes !== undefined) doc.notes = cleanText(body.notes, 'Notes', 200, { required: false })
  for (const [field, label, max] of [['hostel', 'Hostel', 80], ['block', 'Block', 80], ['floor', 'Floor', 40]]) {
    if (body[field] !== undefined) doc[field] = cleanText(body[field], label, max)
  }
  try {
    await doc.save()
  } catch (error) {
    if (error.name === 'VersionError') throw new AppError('This intent changed while you were editing. Reload and try again.', 409)
    throw error
  }
  return toIntentView(doc)
}

async function cancelIntent(userId, intentId) {
  await loadOwned(userId, intentId)
  const updated = await ShoppingIntent.findOneAndUpdate(
    { _id: intentId, userId, status: 'active' },
    { $set: { status: 'cancelled' } },
    { returnDocument: 'after' },
  )
  if (!updated) throw new AppError('Only active intents can be cancelled. Leave the pool first if this one is in a pool.', 409)
  return toIntentView(updated)
}

async function listMine(userId) {
  await expireStale()
  const docs = await ShoppingIntent.find({ userId }).sort({ createdAt: -1 }).limit(100)
  return docs.map((d) => toIntentView(d))
}

async function getMine(userId, intentId) {
  return toIntentView(await loadOwned(userId, intentId))
}

async function board(userId) {
  await expireStale()
  const me = await User.findById(userId)
  const docs = await ShoppingIntent.find({ status: 'active', userId: { $ne: userId } }).sort({ windowStart: 1 }).limit(200)
  if (!me) return []

  const maxTier = env.maxProximityTier ?? 3
  const nearMin = env.nearMin ?? 7
  const enableCampusWide = env.enableCampusWide

  const annotated = []
  for (const d of docs) {
    const tier = proximityTier(me, d, { maxProximityTier: maxTier, nearMin, enableCampusWide })
    if (tier === null || tier > maxTier) continue
    const walk = walkMinutes(me.hostel, d.hostel)
    const label = proximityLabel(tier, walk)
    const view = toIntentView(d, { owner: false })
    view.proximityTier = tier
    view.walkMinutes = Number.isFinite(walk) ? walk : null
    view.distanceLabel = label
    annotated.push(view)
  }

  annotated.sort((a, b) => {
    if (a.proximityTier !== b.proximityTier) return a.proximityTier - b.proximityTier
    const walkA = a.walkMinutes ?? 0
    const walkB = b.walkMinutes ?? 0
    if (walkA !== walkB) return walkA - walkB
    return new Date(a.windowStart) - new Date(b.windowStart)
  })

  return annotated
}

function toPlain(doc) {
  const o = typeof doc.toObject === 'function' ? doc.toObject() : doc
  return {
    id: String(o._id), userId: String(o.userId), userName: o.userName, platform: o.platform,
    items: o.items.map((i) => ({ name: i.name, qty: i.qty, unitPricePaise: i.unitPricePaise ?? null })),
    subtotalPaise: o.subtotalPaise ?? null, observedFeesPaise: o.observedFeesPaise ?? null,
    windowStart: o.windowStart, windowEnd: o.windowEnd, hostel: o.hostel, block: o.block, floor: o.floor,
  }
}

module.exports = { createIntent, updateIntent, cancelIntent, listMine, getMine, board, expireStale, toPlain, toIntentView, computeSubtotal, parseItems }
