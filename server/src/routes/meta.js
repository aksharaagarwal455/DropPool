const express = require('express')
const { env } = require('../config/env')
const { PLATFORMS } = require('../services/fees/defaultProfiles')
const { getProfile } = require('../services/fees/feeService')
const { computeFees } = require('../services/fees/feeRules')
const { getCampusHostels } = require('../utils/distance')
const { asyncHandler, AppError } = require('../middleware/errorHandler')

const router = express.Router()

router.get('/', (req, res) => {
  const campusHostels = getCampusHostels()
  const combinedHostels = [...new Set([...(env.hostels || []), ...campusHostels])].filter(Boolean)
  res.json({
    success: true,
    data: {
      platforms: PLATFORMS,
      hostels: combinedHostels.length > 0 ? combinedHostels : env.hostels,
      campusHostels,
      collegeEmailDomains: env.collegeEmailDomains,
      demoMode: env.demoMode,
      geminiConfigured: Boolean(env.geminiApiKey),
      maxGroupSize: env.maxGroupSize,
      maxProximityTier: env.maxProximityTier,
      nearMin: env.nearMin,
      enableCampusWide: env.enableCampusWide,
      minMarginalSavingPaise: env.minMarginalSavingPaise,
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
