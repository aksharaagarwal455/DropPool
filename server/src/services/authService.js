const mongoose = require('mongoose')
const User = require('../models/User')
const { env } = require('../config/env')
const { AppError } = require('../middleware/errorHandler')
const { isAllowedCollegeEmail, normalizeEmail } = require('../utils/emailDomain')
const { hashPassword, verifyPassword } = require('../utils/password')
const { signAccessToken } = require('../utils/jwt')
const { maskUpiId } = require('../utils/upi')

const INVALID_LOGIN = 'Invalid email or password'

function cleanText(value, label, maxLength) {
  if (typeof value !== 'string') {
    throw new AppError(`${label} is required`, 422)
  }
  const trimmed = value.trim()
  if (!trimmed) {
    throw new AppError(`${label} is required`, 422)
  }
  if (trimmed.length > maxLength) {
    throw new AppError(`${label} must be at most ${maxLength} characters`, 422)
  }
  return trimmed
}

function toPublicUser(user) {
  const doc = typeof user.toObject === 'function' ? user.toObject() : { ...user }
  return {
    id: String(doc._id),
    name: doc.name,
    email: doc.email,
    hostel: doc.hostel,
    block: doc.block,
    floor: doc.floor,
    profileImage: doc.profileImage ?? null,
    role: doc.role,
    emailVerified: doc.emailVerified,
    trust: {
      completedPools: doc.trust?.completedPools ?? 0,
      cancelledPools: doc.trust?.cancelledPools ?? 0,
    },
    isDemo: Boolean(doc.isDemo),
    hasUpiId: Boolean(doc.upiId),
    upiIdMasked: maskUpiId(doc.upiId),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

function assertPublicUser(user) {
  if (user.passwordHash !== undefined || user.upiId !== undefined) {
    throw new AppError('Refusing to return a private user field', 500)
  }
}

async function register(body) {
  const name = cleanText(body?.name, 'Name', 80)
  const email = normalizeEmail(body?.email)
  const hostel = cleanText(body?.hostel, 'Hostel', 80)
  const block = cleanText(body?.block, 'Block', 80)
  const floor = cleanText(body?.floor, 'Floor', 40)

  if (!email || !email.includes('@')) {
    throw new AppError('Email is required', 422)
  }
  if (!isAllowedCollegeEmail(email, env.collegeEmailDomains)) {
    throw new AppError('Use an allowed college email domain', 422)
  }
  if (typeof body?.password !== 'string') {
    throw new AppError('Password must be at least 8 characters', 422)
  }

  const passwordHash = await hashPassword(body.password)
  try {
    const user = await User.create({
      name,
      email,
      passwordHash,
      hostel,
      block,
      floor,
      role: 'student',
    })
    const publicUser = toPublicUser(user)
    assertPublicUser(publicUser)
    return {
      token: signAccessToken({ userId: publicUser.id, role: publicUser.role }),
      user: publicUser,
    }
  } catch (error) {
    if (error && error.code === 11000) {
      throw new AppError('An account with this email already exists', 409)
    }
    throw error
  }
}

async function login(body) {
  const email = normalizeEmail(body?.email)
  const password = body?.password
  if (!email || typeof password !== 'string' || password.length === 0) {
    throw new AppError('Email and password are required', 422)
  }

  const user = await User.findOne({ email }).select('+passwordHash +upiId')
  const matches = user ? await verifyPassword(password, user.passwordHash) : false
  if (!user || !matches) {
    throw new AppError(INVALID_LOGIN, 401)
  }

  const publicUser = toPublicUser(user)
  assertPublicUser(publicUser)
  return {
    token: signAccessToken({ userId: publicUser.id, role: publicUser.role }),
    user: publicUser,
  }
}

async function getCurrentUser(userId) {
  if (!mongoose.isValidObjectId(userId)) {
    throw new AppError('Invalid or expired token', 401)
  }
  const user = await User.findById(userId).select('+upiId')
  if (!user) {
    throw new AppError('Invalid or expired token', 401)
  }
  const publicUser = toPublicUser(user)
  assertPublicUser(publicUser)
  return publicUser
}

module.exports = {
  toPublicUser,
  register,
  login,
  getCurrentUser,
  INVALID_LOGIN,
}
