const { env } = require('../config/env')
const { connectDatabase } = require('../config/db')
const demo = require('../services/demoService')

async function main() {
  if (!env.demoMode) throw new Error('Set DEMO_MODE=true in .env before seeding demonstration data')
  const db = await connectDatabase()
  if (db.status !== 'connected') throw new Error('Database is not connected. Check MONGO_URI.')
  const mode = process.argv[2]
  const result = mode === 'reset' ? await demo.reset() : await demo.seed()
  console.log(JSON.stringify(result, null, 2))
  process.exit(0)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
