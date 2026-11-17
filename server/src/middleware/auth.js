const { verifyAccessToken } = require('../utils/jwt')
const { AppError } = require('./errorHandler')

function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''

  if (!token) {
    next(new AppError('Authentication required', 401))
    return
  }

  try {
    const payload = verifyAccessToken(token)
    if (!payload.sub || (payload.role !== 'student' && payload.role !== 'admin')) {
      next(new AppError('Invalid or expired token', 401))
      return
    }
    req.auth = { userId: payload.sub, role: payload.role }
    next()
  } catch {
    next(new AppError('Invalid or expired token', 401))
  }
}

function requireRole(...roles) {
  return function roleGuard(req, res, next) {
    if (!req.auth) {
      next(new AppError('Authentication required', 401))
      return
    }
    if (!roles.includes(req.auth.role)) {
      next(new AppError('You do not have access to this resource', 403))
      return
    }
    next()
  }
}

module.exports = {
  requireAuth,
  requireRole,
}
