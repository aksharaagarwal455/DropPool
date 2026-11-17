const { connectDatabase } = require('../config/db')
const User = require('../models/User')

async function main() {
  const email = String(process.argv[2] || '').trim().toLowerCase()
  if (!email) throw new Error('Usage: npm run make-admin -w droppool-server -- student@college.edu')
  const db = await connectDatabase()
  if (db.status !== 'connected') throw new Error('Database is not connected. Check MONGO_URI.')
  const user = await User.findOneAndUpdate({ email }, { $set: { role: 'admin' } }, { returnDocument: 'after' })
  if (!user) throw new Error('No account with that email. Register first.')
  console.log(`${email} is now an admin. Log in again to get a fresh token.`)
  process.exit(0)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
