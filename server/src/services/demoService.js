const User = require('../models/User')
const ShoppingIntent = require('../models/ShoppingIntent')
const Pool = require('../models/Pool')
const Payment = require('../models/Payment')
const { hashPassword } = require('../utils/password')
const poolService = require('./poolService')
const paymentService = require('./paymentService')
const { computeSubtotal } = require('./intentService')

const DEMO_DOMAIN = 'demo.droppool.test'
const DEMO_PASSWORD = 'demo-pass-123'

const PEOPLE = [
  ['aarav', 'Aarav Mehta', 'Gargi Hostel', 'A', '2'], ['diya', 'Diya Sharma', 'Gargi Hostel', 'A', '2'],
  ['kabir', 'Kabir Singh', 'Gargi Hostel', 'A', '3'], ['meera', 'Meera Iyer', 'Gargi Hostel', 'A', '2'],
  ['rohan', 'Rohan Das', 'Tagore Hostel', 'C', '1'], ['ishita', 'Ishita Nair', 'Tagore Hostel', 'C', '1'],
  ['vihaan', 'Vihaan Rao', 'Gargi Hostel', 'A', '1'], ['arjun', 'Arjun Verma', 'Tagore Hostel', 'A', '2'],
  ['sara', 'Sara Khan', 'Gargi Hostel', 'B', '3'], ['dev', 'Dev Patel', 'Gargi Hostel', 'B', '3'],
  ['tanvi', 'Tanvi Joshi', 'Gargi Hostel', 'B', '2'],
]

async function reset() {
  const pools = await Pool.find({ isDemo: true }).select('_id')
  await Payment.deleteMany({ $or: [{ isDemo: true }, { poolId: { $in: pools.map((p) => p._id) } }] })
  await Pool.deleteMany({ isDemo: true })
  await ShoppingIntent.deleteMany({ isDemo: true })
  const users = await User.deleteMany({ isDemo: true })
  return { removedUsers: users.deletedCount ?? 0 }
}

async function seed() {
  await reset()
  const passwordHash = await hashPassword(DEMO_PASSWORD)
  const users = {}
  for (const [key, name, hostel, block, floor] of PEOPLE) {
    users[key] = await User.create({ name, email: `${key}@${DEMO_DOMAIN}`, passwordHash, hostel, block, floor, emailVerified: true, isDemo: true, upiId: key === 'sara' ? 'sara.demo@okaxis' : null })
  }
  users.admin = await User.create({ name: 'Demo Admin', email: `admin@${DEMO_DOMAIN}`, passwordHash, hostel: 'Gargi Hostel', block: 'A', floor: '1', role: 'admin', emailVerified: true, isDemo: true })

  const now = Date.now()
  const window = (startMin, endMin) => ({ windowStart: new Date(now + startMin * 60000), windowEnd: new Date(now + endMin * 60000) })
  const make = async (key, platform, items, extra = {}) => {
    const u = users[key]
    return ShoppingIntent.create({
      userId: u._id, userName: u.name.split(' ')[0], platform, items, subtotalPaise: computeSubtotal(items),
      hostel: u.hostel, block: u.block, floor: u.floor, isDemo: true, ...window(0, 180), ...extra,
    })
  }
  const it = (name, qty, rupees) => ({ name, qty, unitPricePaise: rupees * 100 })

  await make('aarav', 'zepto', [it('Maggi noodles', 2, 14), it('Bread', 1, 52)])
  await make('diya', 'zepto', [it('Lays chips', 2, 20), it('Coke', 1, 40)])
  await make('kabir', 'zepto', [it('Maggi noodles', 1, 14), it('Eggs (6)', 1, 66)])
  await make('meera', 'zepto', [it('Bread', 1, 52), it('Chocolate bar', 2, 14)])
  await make('rohan', 'instamart', [it('Detergent', 1, 190), it('Soap', 2, 30)], { observedFeesPaise: 0, notes: 'Free-delivery pass active' })
  await make('ishita', 'instamart', [it('Shampoo', 1, 150), it('Toothpaste', 2, 30)], { observedFeesPaise: 0, notes: 'Free-delivery pass active' })
  await make('vihaan', 'blinkit', [it('Milk', 1, 28), it('Curd', 1, 35)], window(300, 420))
  await make('arjun', 'zepto', [it('Maggi noodles', 2, 14), it('Milk', 1, 28)])

  const sara = await make('sara', 'blinkit', [it('Rice 1kg', 1, 90)])
  const dev = await make('dev', 'blinkit', [it('Dal 500g', 1, 75)])
  const tanvi = await make('tanvi', 'blinkit', [it('Oats', 1, 85)])
  const pool = await poolService.createPool(users.sara._id, [sara._id, dev._id, tanvi._id])
  await poolService.confirmMembership(users.dev._id, pool.id)
  await poolService.confirmMembership(users.tanvi._id, pool.id)
  const recorded = await poolService.recordActualTotal(users.sara._id, pool.id, 25500)
  const payments = await Payment.find({ poolId: pool.id })
  const forDev = payments.find((p) => String(p.userId) === String(users.dev._id))
  const forTanvi = payments.find((p) => String(p.userId) === String(users.tanvi._id))
  await paymentService.claim(users.dev._id, forDev._id, {})
  await paymentService.claim(users.tanvi._id, forTanvi._id, {})
  await paymentService.confirm(users.sara._id, forTanvi._id)

  return {
    password: DEMO_PASSWORD,
    accounts: [...PEOPLE.map((p) => `${p[0]}@${DEMO_DOMAIN}`), `admin@${DEMO_DOMAIN}`],
    scenarios: [
      'aarav@: four Zepto students in Gargi Block A. Run matching to see a profitable pool.',
      'rohan@: two Instamart students who both have free delivery. Matching recommends ordering individually.',
      'vihaan@ and arjun@: intents that stay independent (different time window or hostel).',
      `sara@ (host): pool ${recorded.code} is in awaiting_payments with one claimed and one confirmed payment.`,
    ],
  }
}

module.exports = { seed, reset, DEMO_DOMAIN, DEMO_PASSWORD }
