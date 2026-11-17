const express = require('express')
const { asyncHandler, AppError } = require('../middleware/errorHandler')
const { buildHealth } = require('../services/healthService')

const router = express.Router()

router.get('/', asyncHandler(async (req, res) => {
  res.json({ success: true, data: buildHealth() })
}))

router.get('/ready', asyncHandler(async (req, res) => {
  const health = buildHealth()
  if (health.database.status !== 'connected') {
    throw new AppError('Database is not connected', 503)
  }
  res.json({ success: true, data: health })
}))

module.exports = router
