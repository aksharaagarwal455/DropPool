const User = require('../models/User')
const { AppError } = require('../middleware/errorHandler')
const { cleanText } = require('../utils/validate')
const { isValidUpiId, maskUpiId } = require('../utils/upi')
const { toPublicUser } = require('./authService')

async function updateProfile(userId, body) {
  const user = await User.findById(userId).select('+upiId')
  if (!user) throw new AppError('Invalid or expired token', 401)
  if (body.name !== undefined) user.name = cleanText(body.name, 'Name', 80)
  if (body.hostel !== undefined) user.hostel = cleanText(body.hostel, 'Hostel', 80)
  if (body.block !== undefined) user.block = cleanText(body.block, 'Block', 80)
  if (body.floor !== undefined) user.floor = cleanText(body.floor, 'Floor', 40)
  if (body.upiId !== undefined) {
    if (body.upiId === null || body.upiId === '') user.upiId = null
    else if (isValidUpiId(body.upiId)) user.upiId = body.upiId.trim()
    else throw new AppError('Enter a valid UPI id like name@bank', 422)
  }
  await user.save()
  return { ...toPublicUser(user), hasUpiId: Boolean(user.upiId), upiIdMasked: maskUpiId(user.upiId) }
}

async function getProfile(userId) {
  const user = await User.findById(userId).select('+upiId')
  if (!user) throw new AppError('Invalid or expired token', 401)
  return { ...toPublicUser(user), hasUpiId: Boolean(user.upiId), upiIdMasked: maskUpiId(user.upiId) }
}

module.exports = { updateProfile, getProfile }
