const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const { env } = require('./config/env')
const healthRoutes = require('./routes/health')
const authRoutes = require('./routes/auth')
const userRoutes = require('./routes/users')
const intentRoutes = require('./routes/intents')
const aiRoutes = require('./routes/ai')
const matchingRoutes = require('./routes/matching')
const optimizationRoutes = require('./routes/optimization')
const poolRoutes = require('./routes/pools')
const paymentRoutes = require('./routes/payments')
const demandRoutes = require('./routes/demand')
const adminRoutes = require('./routes/admin')
const metaRoutes = require('./routes/meta')
const { createAuthRateLimiter } = require('./middleware/authRateLimit')
const { notFound, errorHandler } = require('./middleware/errorHandler')

function createApp(options = {}) {
  const app = express()

  app.use(helmet())
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, mobile apps, health checks, server-to-server)
      if (!origin || env.clientOrigins.includes(origin) || env.clientOrigins.includes('*')) {
        return callback(null, true)
      }
      return callback(null, false)
    },
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }))
  app.use('/api/ai', express.json({ limit: '8mb' }), aiRoutes)
  app.use(express.json({ limit: '1mb' }))

  const authLimiter = createAuthRateLimiter(options.authRateLimitMax)
  app.use('/api/health', healthRoutes)
  app.use('/api/auth/register', authLimiter)
  app.use('/api/auth/login', authLimiter)
  app.use('/api/meta', metaRoutes)
  app.use('/api/auth', authRoutes)
  app.use('/api/users', userRoutes)
  app.use('/api/intents', intentRoutes)
  app.use('/api/matching', matchingRoutes)
  app.use('/api/optimization', optimizationRoutes)
  app.use('/api/pools', poolRoutes)
  app.use('/api/payments', paymentRoutes)
  app.use('/api/demand', demandRoutes)
  app.use('/api/admin', adminRoutes)
  app.use(notFound)
  app.use(errorHandler)

  return app
}

module.exports = {
  createApp,
}
