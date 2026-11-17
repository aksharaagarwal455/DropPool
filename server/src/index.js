const { env } = require('./config/env')
const { connectDatabase } = require('./config/db')
const { createApp } = require('./app')

async function start() {
  if (env.usingDevJwtSecret) {
    console.warn('JWT_SECRET is not set. Using a development-only secret.')
  }
  if (!env.mongoUri) {
    console.warn('MONGO_URI is not set. The API will start without a database.')
  }

  const database = await connectDatabase()
  const app = createApp()

  app.listen(env.port, () => {
    console.log(`DropPool API listening on port ${env.port}`)
    console.log(`Database status: ${database.status}`)
  })
}

start().catch((error) => {
  console.error(error.message || 'Failed to start the API')
  process.exit(1)
})
