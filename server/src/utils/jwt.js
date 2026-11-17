const jwt = require('jsonwebtoken')
const { env } = require('../config/env')
const { AppError } = require('../middleware/errorHandler')

function signAccessToken({ userId, role }) {
  if (!userId || (role !== 'student' && role !== 'admin')) {
    throw new AppError('Cannot issue a token without a user id and role', 500)
  }

  return jwt.sign({ role }, env.jwtSecret, {
    subject: String(userId),
    expiresIn: env.jwtExpiresIn,
  })
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtSecret)
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
}
