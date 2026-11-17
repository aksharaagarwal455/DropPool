const express = require('express')
const rateLimit = require('express-rate-limit')
const { requireAuth } = require('../middleware/auth')
const { asyncHandler } = require('../middleware/errorHandler')
const { extractCart } = require('../services/extractionService')

const router = express.Router()

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler(req, res) {
    res.status(429).json({ success: false, error: { message: 'Too many extraction requests. Try again later.' } })
  },
})

router.post('/extract', requireAuth, limiter, asyncHandler(async (req, res) => {
  const extraction = await extractCart(req.body || {})
  res.json({ success: true, data: { extraction } })
}))

module.exports = router
