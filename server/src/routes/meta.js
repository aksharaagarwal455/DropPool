const express = require('express')
const { env } = require('../config/env')
const { PLATFORMS } = require('../services/fees/defaultProfiles')

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

module.exports = router
