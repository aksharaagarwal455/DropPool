const Payment = require('../models/Payment')
const Pool = require('../models/Pool')
const { AppError } = require('../middleware/errorHandler')
const { objectId, cleanText } = require('../utils/validate')
const { saveSafely, pushHistory } = require('./poolService')

async function loadPayment(paymentId) {
  const payment = await Payment.findById(objectId(paymentId, 'payment id'))
  if (!payment) throw new AppError('Payment not found', 404)
  return payment
}

async function claim(userId, paymentId, body = {}) {
  const payment = await loadPayment(paymentId)
  if (String(payment.userId) !== String(userId)) throw new AppError('Payment not found', 404)
  const utr = cleanText(body.utr, 'Transaction reference', 30, { required: false })
  if (utr && !/^[A-Za-z0-9]{6,30}$/.test(utr)) throw new AppError('Transaction reference must be 6-30 letters or digits', 422)
  const updated = await Payment.findOneAndUpdate(
    { _id: payment._id, userId, status: { $in: ['pending', 'rejected'] } },
    { $set: { status: 'claimed', utr, claimedAt: new Date(), rejectReason: '' } },
    { returnDocument: 'after' },
  )
  if (!updated) throw new AppError('This payment was already claimed or settled', 409)
  return toView(updated)
}

async function loadForHost(hostId, paymentId) {
  const payment = await loadPayment(paymentId)
  if (String(payment.hostId) !== String(hostId)) throw new AppError('Payment not found', 404)
  return payment
}

async function confirm(hostId, paymentId) {
  const payment = await loadForHost(hostId, paymentId)
  const updated = await Payment.findOneAndUpdate(
    { _id: payment._id, status: 'claimed' },
    { $set: { status: 'confirmed', decidedAt: new Date() } },
    { returnDocument: 'after' },
  )
  if (!updated) throw new AppError('Only a claimed payment can be confirmed', 409)
  const all = await Payment.find({ poolId: payment.poolId })
  if (all.every((p) => p.status === 'confirmed')) {
    const pool = await Pool.findById(payment.poolId)
    if (pool && pool.status === 'awaiting_payments') {
      pool.status = 'payments_confirmed'
      pushHistory(pool, 'payments_confirmed', hostId, 'Host confirmed every share')
      await saveSafely(pool)
    }
  }
  return toView(updated)
}

async function reject(hostId, paymentId, body = {}) {
  const payment = await loadForHost(hostId, paymentId)
  const reason = cleanText(body.reason, 'Reason', 120, { required: false }) || 'Payment not received'
  const updated = await Payment.findOneAndUpdate(
    { _id: payment._id, status: 'claimed' },
    { $set: { status: 'rejected', rejectReason: reason, decidedAt: new Date() } },
    { returnDocument: 'after' },
  )
  if (!updated) throw new AppError('Only a claimed payment can be rejected', 409)
  return toView(updated)
}

async function refund(hostId, paymentId) {
  const payment = await loadForHost(hostId, paymentId)
  const pool = await Pool.findById(payment.poolId)
  if (!pool || pool.status !== 'cancelled') throw new AppError('Refunds are only recorded for cancelled pools', 409)
  const updated = await Payment.findOneAndUpdate(
    { _id: payment._id, status: 'confirmed' },
    { $set: { status: 'refunded', decidedAt: new Date() } },
    { returnDocument: 'after' },
  )
  if (!updated) throw new AppError('Only a confirmed payment can be marked refunded', 409)
  return toView(updated)
}

function toView(p) {
  return { id: String(p._id), poolId: String(p.poolId), amountPaise: p.amountPaise, status: p.status, utr: p.utr, rejectReason: p.rejectReason }
}

async function listMine(userId) {
  const docs = await Payment.find({ userId }).sort({ createdAt: -1 }).limit(50)
  return docs.map(toView)
}

module.exports = { claim, confirm, reject, refund, listMine }
