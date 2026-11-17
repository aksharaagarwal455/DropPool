const express = require('express')
const { env } = require('../config/env')
const { PLATFORMS } = require('../services/fees/defaultProfiles')
const { getProfile } = require('../services/fees/feeService')
const { computeFees } = require('../services/fees/feeRules')
const { asyncHandler, AppError } = require('../middleware/errorHandler')

const router = express.Router()

router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      platforms: PLATFORMS,
      hostels: env.hostels,
      collegeEmailDomains: env.collegeEmailDomains,
      demoMode: env.demoMode,
      geminiConfigured: Boolean(env.geminiApiKey),
      maxGroupSize: env.maxGroupSize,
    },
  })
})

router.get('/fees', asyncHandler(async (req, res) => {
  const platform = String(req.query?.platform || '').toLowerCase()
  const rawSubtotal = req.query?.subtotalPaise
  const subtotalPaise = Number(rawSubtotal)

  if (!PLATFORMS.includes(platform)) {
    throw new AppError('Invalid platform', 422)
  }
  if (!Number.isInteger(subtotalPaise) || subtotalPaise < 0) {
    throw new AppError('subtotalPaise must be a non-negative integer', 422)
  }

  const profile = await getProfile(platform)
  if (!profile) {
    throw new AppError('Fee profile not found', 404)
  }

  const fees = computeFees(profile, subtotalPaise)
  res.json({
    success: true,
    data: {
      feesPaise: fees.totalPaise,
      totalPaise: subtotalPaise + fees.totalPaise,
      isIllustrative: Boolean(profile.isIllustrative),
      lines: fees.lines,
    },
  })
}))

module.exports = router
