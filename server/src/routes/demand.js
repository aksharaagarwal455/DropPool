const express = require('express')
const { requireAuth } = require('../middleware/auth')
const { asyncHandler } = require('../middleware/errorHandler')
const { summary } = require('../services/demandService')

const router = express.Router()
router.use(requireAuth)

router.get('/summary', asyncHandler(async (req, res) => {
  res.json({ success: true, data: await summary() })
}))

module.exports = router
