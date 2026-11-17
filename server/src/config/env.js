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
    geminiModel: source.GEMINI_MODEL || 'gemini-2.5-flash',
    hostels: String(source.HOSTELS || '').split(',').map((h) => h.trim()).filter(Boolean),
    tzOffsetMinutes: Number.isFinite(Number(source.TZ_OFFSET_MINUTES)) && source.TZ_OFFSET_MINUTES !== undefined && source.TZ_OFFSET_MINUTES !== '' ? Number(source.TZ_OFFSET_MINUTES) : 330,
    maxGroupSize: Number.isInteger(Number(source.MAX_GROUP_SIZE)) && Number(source.MAX_GROUP_SIZE) >= 2 ? Number(source.MAX_GROUP_SIZE) : 4,
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
