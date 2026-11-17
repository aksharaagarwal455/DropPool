const express = require('express')
const { requireAuth } = require('../middleware/auth')
const { asyncHandler } = require('../middleware/errorHandler')
const { getProfile, updateProfile } = require('../services/userService')

const router = express.Router()
router.use(requireAuth)

router.get('/me', asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: await getProfile(req.auth.userId) } })
}))

router.patch('/me', asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: await updateProfile(req.auth.userId, req.body || {}) } })
}))

module.exports = router
