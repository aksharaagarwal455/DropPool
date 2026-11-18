const { createApp } = require('../src/app')
const { makeUser, api, intentBody, connect, disconnect } = require('./helpers')
const ShoppingIntent = require('../src/models/ShoppingIntent')
const Pool = require('../src/models/Pool')
const Payment = require('../src/models/Payment')
const User = require('../src/models/User')
const FeeProfile = require('../src/models/FeeProfile')

const app = createApp()
jest.setTimeout(90000)
process.env.DEMO_MODE = 'true'

let dbConnected = false

beforeAll(async () => {
  try {
    await connect('droppool_platform_test')
    dbConnected = true
  } catch (err) {
    console.warn(`[platform.test.js] MongoDB not running (${err.message}). Database integration tests will be skipped.`)
  }
})

afterAll(async () => {
  if (dbConnected) await disconnect()
})

afterEach(async () => {
  if (dbConnected) {
    await Promise.all([ShoppingIntent.deleteMany({}), Pool.deleteMany({}), Payment.deleteMany({}), User.deleteMany({}), FeeProfile.deleteMany({})])
  }
})

const dbTest = (title, fn) => {
  test(title, async () => {
    if (!dbConnected) return
    await fn()
  })
}

describe('profile and UPI id', () => {
  dbTest('validates UPI ids and never returns the full id', async () => {
    const u = await makeUser()
    await api(app, u.token).patch('/api/users/me', { upiId: 'not a upi id' }).expect(422)
    const ok = await api(app, u.token).patch('/api/users/me', { upiId: 'asha.k@okhdfc', hostel: 'Tagore' }).expect(200)
    expect(ok.body.data.user.hostel).toBe('Tagore')
    expect(ok.body.data.user.upiIdMasked).toBe('as****@okhdfc')
    expect(JSON.stringify(ok.body)).not.toContain('asha.k@okhdfc')
    const cleared = await api(app, u.token).patch('/api/users/me', { upiId: '' }).expect(200)
    expect(cleared.body.data.user.hasUpiId).toBe(false)
  })
})

describe('admin and fee profiles', () => {
  dbTest('students cannot reach admin routes; admins can edit fees and new pools use them', async () => {
    const student = await makeUser()
    await api(app, student.token).get('/api/admin/analytics').expect(403)
    await api(app, student.token).put('/api/admin/fee-profiles/zepto', { handlingFeePaise: 0 }).expect(403)

    const admin = await makeUser({ role: 'admin' })
    const profiles = await api(app, admin.token).get('/api/admin/fee-profiles').expect(200)
    expect(profiles.body.data.profiles).toHaveLength(3)
    expect(profiles.body.data.profiles[0].isIllustrative).toBe(true)
    await api(app, admin.token).put('/api/admin/fee-profiles/zepto', { handlingFeePaise: -5 }).expect(422)
    await api(app, admin.token).put('/api/admin/fee-profiles/nope', { handlingFeePaise: 5 }).expect(404)

    const updated = await api(app, admin.token).put('/api/admin/fee-profiles/zepto', { deliveryFeePaise: 0, smallCartFeePaise: 0, handlingFeePaise: 0 }).expect(200)
    expect(updated.body.data.profile.version).toBe(1)
    expect(updated.body.data.profile.isIllustrative).toBe(false)

    const a = await makeUser()
    const b = await makeUser()
    const mk = async (u) => (await api(app, u.token).post('/api/intents', intentBody({ items: [{ name: 'Bread', qty: 1, unitPricePaise: 8000 }] })).expect(201)).body.data.intent
    const ia = await mk(a)
    await mk(b)
    const match = await api(app, a.token).post('/api/matching/run', { intentId: ia.id }).expect(200)
    expect(match.body.data.proposal.status).toBe('individual')
    expect(match.body.data.proposal.feeProfile.version).toBe(1)
  })
})

describe('demand intelligence', () => {
  dbTest('summarises observed data and labels heuristics', async () => {
    const users = [await makeUser(), await makeUser(), await makeUser()]
    for (const u of users) {
      await api(app, u.token).post('/api/intents', intentBody({ items: [{ name: 'Maggi noodles', qty: 1, unitPricePaise: 8000 }] })).expect(201)
    }
    const res = await api(app, users[0].token).get('/api/demand/summary').expect(200)
    const d = res.body.data
    expect(d.totals.activeIntents).toBe(3)
    expect(d.topProducts[0]).toMatchObject({ name: 'Maggi noodles', intents: 3, kind: 'observed' })
    expect(d.byHour).toHaveLength(24)
    expect(d.blocks[0]).toMatchObject({ hostel: 'Gargi', block: 'A', activeIntents: 3, kind: 'observed' })
    expect(d.opportunities[0]).toMatchObject({ kind: 'heuristic', students: 3 })
    expect(d.disclaimer).toContain('not trained model predictions')
    await api(app, null).get('/api/demand/summary').expect(401)
  })

  dbTest('an empty campus returns empty, honest results', async () => {
    const u = await makeUser()
    const d = (await api(app, u.token).get('/api/demand/summary').expect(200)).body.data
    expect(d.topProducts).toEqual([])
    expect(d.peak).toBeNull()
    expect(d.opportunities).toEqual([])
  })
})

describe('demo mode', () => {
  dbTest('seeds fictional data, demonstrates both outcomes, and resets without touching real accounts', async () => {
    const { env } = require('../src/config/env')
    env.demoMode = true
    const real = await makeUser()
    const admin = await makeUser({ role: 'admin' })
    const seeded = await api(app, admin.token).post('/api/admin/demo/seed').expect(200)
    expect(seeded.body.data.password).toBeTruthy()
    expect(seeded.body.data.accounts.length).toBeGreaterThan(5)

    const aarav = await User.findOne({ email: 'aarav@demo.droppool.test' })
    expect(aarav.isDemo).toBe(true)
    const login = await api(app, null).post('/api/auth/login', { email: 'aarav@demo.droppool.test', password: seeded.body.data.password }).expect(200)
    const aaravIntent = (await api(app, login.body.data.token).get('/api/intents/mine').expect(200)).body.data.intents[0]
    const profitable = await api(app, login.body.data.token).post('/api/matching/run', { intentId: aaravIntent.id }).expect(200)
    expect(profitable.body.data.proposal.status).toBe('pool')
    expect(profitable.body.data.proposal.members).toHaveLength(4)

    const rohan = await api(app, null).post('/api/auth/login', { email: 'rohan@demo.droppool.test', password: seeded.body.data.password }).expect(200)
    const rohanIntent = (await api(app, rohan.body.data.token).get('/api/intents/mine').expect(200)).body.data.intents[0]
    const unprofitable = await api(app, rohan.body.data.token).post('/api/matching/run', { intentId: rohanIntent.id }).expect(200)
    expect(unprofitable.body.data.proposal.status).toBe('individual')

    const vihaan = await api(app, null).post('/api/auth/login', { email: 'vihaan@demo.droppool.test', password: seeded.body.data.password }).expect(200)
    const vIntent = (await api(app, vihaan.body.data.token).get('/api/intents/mine').expect(200)).body.data.intents[0]
    expect((await api(app, vihaan.body.data.token).post('/api/matching/run', { intentId: vIntent.id }).expect(200)).body.data.proposal.status).toBe('none')

    const sara = await api(app, null).post('/api/auth/login', { email: 'sara@demo.droppool.test', password: seeded.body.data.password }).expect(200)
    const pools = (await api(app, sara.body.data.token).get('/api/pools/mine').expect(200)).body.data.pools
    expect(pools[0].status).toBe('awaiting_payments')
    const detail = (await api(app, sara.body.data.token).get(`/api/pools/${pools[0].id}`).expect(200)).body.data.pool
    expect(detail.payments.map((p) => p.status).sort()).toEqual(['claimed', 'confirmed'])

    const analytics = (await api(app, admin.token).get('/api/admin/analytics').expect(200)).body.data.analytics
    expect(analytics.demo.users).toBeGreaterThan(5)
    expect(analytics.real.users).toBe(2)

    const again = await api(app, admin.token).post('/api/admin/demo/seed').expect(200)
    expect(again.body.data.accounts.length).toBe(seeded.body.data.accounts.length)
    await api(app, admin.token).post('/api/admin/demo/reset').expect(200)
    expect(await User.countDocuments({ isDemo: true })).toBe(0)
    expect(await ShoppingIntent.countDocuments({ isDemo: true })).toBe(0)
    expect(await Pool.countDocuments({ isDemo: true })).toBe(0)
    expect(await Payment.countDocuments({ isDemo: true })).toBe(0)
    expect(await User.findById(real.id)).not.toBeNull()
  })

  dbTest('is refused when demo mode is off', async () => {
    const { env } = require('../src/config/env')
    env.demoMode = false
    const admin = await makeUser({ role: 'admin' })
    await api(app, admin.token).post('/api/admin/demo/seed').expect(403)
    env.demoMode = true
  })
})

describe('AI route', () => {
  dbTest('requires login and falls back to manual when Gemini is not configured', async () => {
    await api(app, null).post('/api/ai/extract', {}).expect(401)
    const u = await makeUser()
    const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(16)]).toString('base64')
    const res = await api(app, u.token).post('/api/ai/extract', { imageBase64: png, mimeType: 'image/png' })
    expect(res.status).toBe(503)
    expect(res.body.error.fallback).toBe('manual')
    await api(app, u.token).post('/api/ai/extract', { imageBase64: 'AAAA', mimeType: 'image/png' }).expect(422)
  })
})
