const express = require('express')
const { requireAuth } = require('../middleware/auth')
const { asyncHandler } = require('../middleware/errorHandler')
const { previewOptimization } = require('../services/matchingService')

const router = express.Router()
router.use(requireAuth)

router.post('/preview', asyncHandler(async (req, res) => {
  const optimization = await previewOptimization(req.auth.userId, req.body?.intentIds, req.body?.allocation)
  res.json({ success: true, data: { optimization } })
}))

module.exports = router
