const bcrypt = require('bcryptjs')
const { AppError } = require('../middleware/errorHandler')

const ROUNDS = 12

function hashPassword(plain) {
  if (typeof plain !== 'string' || plain.length < 8) {
    return Promise.reject(new AppError('Password must be at least 8 characters', 422))
  }
  if (plain.length > 72) {
    return Promise.reject(new AppError('Password must be at most 72 characters', 422))
  }
  return bcrypt.hash(plain, ROUNDS)
}

function verifyPassword(plain, passwordHash) {
  if (typeof plain !== 'string' || typeof passwordHash !== 'string') {
    return Promise.resolve(false)
  }
  return bcrypt.compare(plain, passwordHash)
}

module.exports = {
  hashPassword,
  verifyPassword,
}
