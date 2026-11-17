const mongoose = require('mongoose')
const { env } = require('./env')

const state = {
  status: env.mongoUri ? 'disconnected' : 'unconfigured',
  error: null,
}

function getDatabaseStatus() {
  if (!env.mongoUri) {
    return { status: 'unconfigured', error: null }
  }
  if (mongoose.connection.readyState === 1) {
    return { status: 'connected', error: null }
  }
  return { status: state.status, error: state.error }
}

async function connectDatabase() {
  if (!env.mongoUri) {
    state.status = 'unconfigured'
    state.error = null
    return getDatabaseStatus()
  }

  state.status = 'connecting'
  const options = { serverSelectionTimeoutMS: 8000 }
  if (env.mongoDbName) {
    options.dbName = env.mongoDbName
  }

  try {
    await mongoose.connect(env.mongoUri, options)
    state.status = 'connected'
    state.error = null
  } catch (error) {
    state.status = 'disconnected'
    state.error = 'Database connection failed'
    console.error('MongoDB connection failed')
  }

  return getDatabaseStatus()
}

module.exports = {
  connectDatabase,
  getDatabaseStatus,
}
