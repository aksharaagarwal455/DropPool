const express = require('express')
const { requireAuth } = require('../middleware/auth')
const { asyncHandler } = require('../middleware/errorHandler')
const { runMatching } = require('../services/matchingService')

const router = express.Router()
router.use(requireAuth)

router.post('/run', asyncHandler(async (req, res) => {
  res.json({ success: true, data: { proposal: await runMatching(req.auth.userId, req.body?.intentId) } })
}))

module.exports = router
