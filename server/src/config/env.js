const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')

const envPath = path.resolve(__dirname, '../../../.env')
if (process.env.NODE_ENV !== 'test' && fs.existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

function parseCollegeEmailDomains(value) {
  return String(value || '')
    .split(',')
    .map((domain) => domain.trim().toLowerCase().replace(/^@/, ''))
    .filter(Boolean)
}

function resolveEnv(source = process.env) {
  const nodeEnv = source.NODE_ENV || 'development'
  const jwtSecret = source.JWT_SECRET || ''

  if (nodeEnv === 'production' && jwtSecret.length < 24) {
    throw new Error('JWT_SECRET must be at least 24 characters in production')
  }

  const parsedPort = Number(source.PORT)
  const port = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 4000

  return {
    nodeEnv,
    port,
    mongoUri: source.MONGO_URI || '',
    mongoDbName: source.MONGO_DB_NAME || '',
    jwtSecret: jwtSecret || 'dev-only-not-for-production',
    jwtExpiresIn: source.JWT_EXPIRES_IN || '12h',
    clientOrigin: source.CLIENT_ORIGIN || 'http://localhost:5173',
    collegeEmailDomains: parseCollegeEmailDomains(source.COLLEGE_EMAIL_DOMAINS),
    demoMode: source.DEMO_MODE === 'true',
    geminiApiKey: source.GEMINI_API_KEY || '',
    geminiModel: source.GEMINI_MODEL || 'gemini-3.5-flash-lite',
    hostels: String(source.HOSTELS || '').split(',').map((h) => h.trim()).filter(Boolean),
    tzOffsetMinutes: Number.isFinite(Number(source.TZ_OFFSET_MINUTES)) && source.TZ_OFFSET_MINUTES !== undefined && source.TZ_OFFSET_MINUTES !== '' ? Number(source.TZ_OFFSET_MINUTES) : 330,
    maxGroupSize: Number.isInteger(Number(source.MAX_GROUP_SIZE)) && Number(source.MAX_GROUP_SIZE) >= 2 ? Number(source.MAX_GROUP_SIZE) : 4,
    maxProximityTier: Number.isInteger(Number(source.MAX_PROXIMITY_TIER)) ? Number(source.MAX_PROXIMITY_TIER) : 3,
    nearMin: Number.isInteger(Number(source.NEAR_MIN)) && Number(source.NEAR_MIN) > 0 ? Number(source.NEAR_MIN) : 7,
    enableCampusWide: source.ENABLE_CAMPUS_WIDE === 'true',
    minMarginalSavingPaise: Number.isInteger(Number(source.MIN_MARGINAL_SAVING_PAISE)) && Number(source.MIN_MARGINAL_SAVING_PAISE) >= 0 ? Number(source.MIN_MARGINAL_SAVING_PAISE) : 500,
    usingDevJwtSecret: !jwtSecret && nodeEnv !== 'production',
  }
}

function loadEnv() {
  return resolveEnv(process.env)
}

module.exports = {
  parseCollegeEmailDomains,
  resolveEnv,
  env: loadEnv(),
}
