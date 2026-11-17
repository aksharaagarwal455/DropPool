const User = require('../models/User')
const ShoppingIntent = require('../models/ShoppingIntent')
const Pool = require('../models/Pool')
const Payment = require('../models/Payment')

function tally(docs, field) {
  const out = {}
  for (const d of docs) out[d[field]] = (out[d[field]] || 0) + 1
  return out
}

async function analytics() {
  const [users, intents, pools, payments] = await Promise.all([
    User.find({}).select('isDemo role'), ShoppingIntent.find({}).select('status platform isDemo'),
    Pool.find({}).select('status isDemo optimization'), Payment.find({}).select('status isDemo'),
  ])
  const real = (docs) => docs.filter((d) => !d.isDemo)
  const demo = (docs) => docs.filter((d) => d.isDemo)
  const block = (u, i, p, pay) => ({
    users: u.length, intents: i.length, intentsByStatus: tally(i, 'status'), intentsByPlatform: tally(i, 'platform'),
    pools: p.length, poolsByStatus: tally(p, 'status'), payments: pay.length, paymentsByStatus: tally(pay, 'status'),
  })
  return { real: block(real(users), real(intents), real(pools), real(payments)), demo: block(demo(users), demo(intents), demo(pools), demo(payments)) }
}

module.exports = { analytics }
