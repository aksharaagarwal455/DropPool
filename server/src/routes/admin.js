const express = require('express')
const { requireAuth, requireRole } = require('../middleware/auth')
const { asyncHandler, AppError } = require('../middleware/errorHandler')
const { env } = require('../config/env')
const { analytics } = require('../services/adminService')
const { listProfiles, updateProfile } = require('../services/fees/feeService')
const demo = require('../services/demoService')

const router = express.Router()
router.use(requireAuth, requireRole('admin'))

function requireDemoMode(req, res, next) {
  if (!env.demoMode) return next(new AppError('Demo mode is disabled. Set DEMO_MODE=true.', 403))
  next()
}

router.get('/analytics', asyncHandler(async (req, res) => {
  res.json({ success: true, data: { analytics: await analytics(), demoMode: env.demoMode } })
}))

router.get('/fee-profiles', asyncHandler(async (req, res) => {
  res.json({ success: true, data: { profiles: await listProfiles() } })
}))

router.put('/fee-profiles/:platform', asyncHandler(async (req, res) => {
  res.json({ success: true, data: { profile: await updateProfile(req.params.platform, req.body || {}, req.auth.userId) } })
}))

router.post('/demo/seed', requireDemoMode, asyncHandler(async (req, res) => {
  res.json({ success: true, data: await demo.seed() })
}))

router.post('/demo/reset', requireDemoMode, asyncHandler(async (req, res) => {
  res.json({ success: true, data: await demo.reset() })
}))

module.exports = router
