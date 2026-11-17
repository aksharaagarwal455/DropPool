const { env } = require('../config/env')
const { getDatabaseStatus } = require('../config/db')

function buildHealth() {
  return {
    service: 'droppool-api',
    status: 'ok',
    database: getDatabaseStatus(),
    demoMode: env.demoMode,
    geminiConfigured: Boolean(env.geminiApiKey),
    collegeEmailDomains: env.collegeEmailDomains,
    timestamp: new Date().toISOString(),
  }
}

module.exports = {
  buildHealth,
}
