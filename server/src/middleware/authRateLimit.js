const rateLimit = require('express-rate-limit')

const WINDOW_MS = 15 * 60 * 1000
const DEFAULT_MAX = 20

function createAuthRateLimiter(max = DEFAULT_MAX) {
  const limit = Number.isInteger(max) && max > 0 ? max : DEFAULT_MAX

  return rateLimit({
    windowMs: WINDOW_MS,
    max: limit,
    standardHeaders: true,
    legacyHeaders: false,
    handler(req, res) {
      res.status(429).json({
        success: false,
        error: { message: 'Too many attempts. Try again later.' },
      })
    },
  })
}

module.exports = {
  createAuthRateLimiter,
  AUTH_RATE_LIMIT_WINDOW_MS: WINDOW_MS,
  AUTH_RATE_LIMIT_MAX: DEFAULT_MAX,
}
