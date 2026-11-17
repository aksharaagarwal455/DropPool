const mongoose = require('mongoose')
const { createApp } = require('../src/app')
const { makeUser, api, intentBody, connect, disconnect } = require('./helpers')
const ShoppingIntent = require('../src/models/ShoppingIntent')
const Pool = require('../src/models/Pool')
const Payment = require('../src/models/Payment')
const User = require('../src/models/User')

const app = createApp()
jest.setTimeout(60000)

beforeAll(() => connect('droppool_flow_test'))
afterAll(disconnect)
afterEach(async () => {
  await Promise.all([ShoppingIntent.deleteMany({}), Pool.deleteMany({}), Payment.deleteMany({}), User.deleteMany({})])
})

async function postIntent(u, body) {
  const res = await api(app, u.token).post('/api/intents', intentBody(body)).expect(201)
  return res.body.data.intent
}

const smallCart = [{ name: 'Bread', qty: 1, unitPricePaise: 8000 }]

describe('end to end: profitable pool', () => {
  test('three compatible Zepto intents -> pool -> payments -> pickup', async () => {
    const [a, b, c] = [await makeUser(), await makeUser(), await makeUser()]
    await api(app, a.token).patch('/api/users/me', { upiId: 'host.a@okaxis' }).expect(200)
    const ia = await postIntent(a, { items: smallCart })
    const ib = await postIntent(b, { items: smallCart })
    const ic = await postIntent(c, { items: smallCart })

    const match = await api(app, a.token).post('/api/matching/run', { intentId: ia.id }).expect(200)
    const proposal = match.body.data.proposal
    expect(proposal.status).toBe('pool')
    expect(proposal.intentIds.sort()).toEqual([ia.id, ib.id, ic.id].sort())
    expect(proposal.optimization.recommendation).toBe('pool')
    for (const row of proposal.optimization.members) {
      expect(row.sharePaise).toBeLessThan(row.individualTotalPaise)
      expect(row.individualTotalPaise).toBe(13000)
    }
    expect(proposal.explanation).toContain('Matched because')

    const created = await api(app, a.token).post('/api/pools', { intentIds: proposal.intentIds }).expect(201)
    const pool = created.body.data.pool
    expect(pool.status).toBe('proposed')
    expect(pool.isHost).toBe(true)
    expect(await ShoppingIntent.countDocuments({ status: 'reserved' })).toBe(3)
    const poolId = pool.id

    await api(app, b.token).post(`/api/pools/${poolId}/confirm`).expect(200)
    await api(app, b.token).post(`/api/pools/${poolId}/confirm`).expect(409)
    const afterAll = await api(app, c.token).post(`/api/pools/${poolId}/confirm`).expect(200)
    expect(afterAll.body.data.pool.status).toBe('confirmed')
    expect(await ShoppingIntent.countDocuments({ status: 'pooled' })).toBe(3)

    await api(app, b.token).post(`/api/pools/${poolId}/actual-total`, { actualTotalPaise: 24500 }).expect(403)
    const recorded = await api(app, a.token).post(`/api/pools/${poolId}/actual-total`, { actualTotalPaise: 24500 }).expect(200)
    expect(recorded.body.data.pool.status).toBe('awaiting_payments')
    const finals = recorded.body.data.pool.members.map((m) => m.finalSharePaise)
    expect(finals.reduce((s, v) => s + v, 0)).toBe(24500)

    const viewB = await api(app, b.token).get(`/api/pools/${poolId}`).expect(200)
    const myPayment = viewB.body.data.pool.myPayment
    expect(myPayment.status).toBe('pending')
    expect(myPayment.upiUri).toContain('upi://pay?pa=host.a%40okaxis')
    expect(myPayment.upiUri).toContain('cu=INR')
    expect(myPayment.notice).toContain('does not prove')
    expect(viewB.body.data.pool.payments).toEqual([])

    await api(app, a.token).post(`/api/pools/${poolId}/status`, { to: 'order_placed' }).expect(409)

    const payB = myPayment.id
    await api(app, b.token).post(`/api/payments/${payB}/claim`, { utr: 'UTR123456' }).expect(200)
    await api(app, b.token).post(`/api/payments/${payB}/claim`, {}).expect(409)
    await api(app, c.token).post(`/api/payments/${payB}/claim`, {}).expect(404)
    await api(app, b.token).post(`/api/payments/${payB}/confirm`).expect(404)
    await api(app, a.token).post(`/api/payments/${payB}/reject`, { reason: 'Not received' }).expect(200)
    await api(app, b.token).post(`/api/payments/${payB}/claim`, { utr: 'UTR654321' }).expect(200)
    await api(app, a.token).post(`/api/payments/${payB}/confirm`).expect(200)

    const hostView = await api(app, a.token).get(`/api/pools/${poolId}`).expect(200)
    expect(hostView.body.data.pool.status).toBe('awaiting_payments')
    const poolDoc = await Pool.findById(poolId)
    const nameC = poolDoc.members.find((m) => String(m.userId) === c.id).name
    const payC = hostView.body.data.pool.payments.find((p) => p.name === nameC)
    await api(app, c.token).post(`/api/payments/${payC.id}/claim`, {}).expect(200)
    await api(app, a.token).post(`/api/payments/${payC.id}/confirm`).expect(200)
    const ready = await api(app, a.token).get(`/api/pools/${poolId}`).expect(200)
    expect(ready.body.data.pool.status).toBe('payments_confirmed')

    await api(app, a.token).post(`/api/pools/${poolId}/status`, { to: 'order_placed' }).expect(200)
    await api(app, a.token).post(`/api/pools/${poolId}/status`, { to: 'ready_for_pickup' }).expect(422)
    await api(app, a.token).post(`/api/pools/${poolId}/status`, { to: 'ready_for_pickup', pickupLocation: 'Gargi hostel gate' }).expect(200)
    await api(app, b.token).post(`/api/pools/${poolId}/status`, { to: 'completed' }).expect(403)
    const done = await api(app, a.token).post(`/api/pools/${poolId}/status`, { to: 'completed' }).expect(200)
    expect(done.body.data.pool.status).toBe('completed')
    expect((await User.findById(b.id)).trust.completedPools).toBe(1)
  })
})

describe('non-profitable pooling', () => {
  test('recommends individual ordering and refuses to create the pool', async () => {
    const [a, b] = [await makeUser(), await makeUser()]
    const cart = (price) => [{ name: 'Detergent', qty: 1, unitPricePaise: price }]
    const ia = await postIntent(a, { platform: 'instamart', items: cart(25000), observedFeesPaise: 0 })
    const ib = await postIntent(b, { platform: 'instamart', items: cart(21000), observedFeesPaise: 0 })
    const match = await api(app, a.token).post('/api/matching/run', { intentId: ia.id }).expect(200)
    expect(match.body.data.proposal.status).toBe('individual')
    expect(match.body.data.proposal.explanation).toContain('not recommended')
    const refused = await api(app, a.token).post('/api/pools', { intentIds: [ia.id, ib.id] }).expect(422)
    expect(refused.body.error.message).toContain('Pooling is not recommended')
    expect(await ShoppingIntent.countDocuments({ status: 'reserved' })).toBe(0)
  })

  test('different hostel or platform is never matched', async () => {
    const a = await makeUser()
    const other = await makeUser({ hostel: 'Tagore' })
    const ia = await postIntent(a, { items: smallCart })
    await postIntent(other, { items: smallCart })
    await postIntent(await makeUser(), { platform: 'blinkit', items: smallCart })
    const match = await api(app, a.token).post('/api/matching/run', { intentId: ia.id }).expect(200)
    expect(match.body.data.proposal.status).toBe('none')
  })
})

describe('membership changes', () => {
  test('a member leaving recalculates; too few members cancels and releases intents', async () => {
    const users = [await makeUser(), await makeUser(), await makeUser()]
    const intents = []
    for (const u of users) intents.push(await postIntent(u, { items: smallCart }))
    const pool = (await api(app, users[0].token).post('/api/pools', { intentIds: intents.map((i) => i.id) }).expect(201)).body.data.pool
    await api(app, users[1].token).post(`/api/pools/${pool.id}/confirm`).expect(200)

    const left = await api(app, users[2].token).post(`/api/pools/${pool.id}/leave`).expect(200)
    expect(left.body.data.pool.members).toHaveLength(2)
    expect(left.body.data.pool.status).toBe('proposed')
    expect(left.body.data.pool.members.find((m) => !m.isHost).confirmed).toBe(false)
    expect((await ShoppingIntent.findById(intents[2].id)).status).toBe('active')

    const cancelled = await api(app, users[1].token).post(`/api/pools/${pool.id}/leave`).expect(200)
    expect(cancelled.body.data.pool.status).toBe('cancelled')
    expect(await ShoppingIntent.countDocuments({ status: 'active' })).toBe(3)
  })

  test('host cancelling after payments lets the host record a refund', async () => {
    const [a, b] = [await makeUser(), await makeUser()]
    await api(app, a.token).patch('/api/users/me', { upiId: 'host@okaxis' }).expect(200)
    const ia = await postIntent(a, { items: smallCart })
    const ib = await postIntent(b, { items: smallCart })
    const pool = (await api(app, a.token).post('/api/pools', { intentIds: [ia.id, ib.id] }).expect(201)).body.data.pool
    await api(app, b.token).post(`/api/pools/${pool.id}/confirm`).expect(200)
    await api(app, a.token).post(`/api/pools/${pool.id}/actual-total`, { actualTotalPaise: 16500 }).expect(200)
    const pay = (await api(app, b.token).get(`/api/pools/${pool.id}`)).body.data.pool.myPayment
    await api(app, b.token).post(`/api/payments/${pay.id}/claim`, {}).expect(200)
    await api(app, a.token).post(`/api/payments/${pay.id}/confirm`).expect(200)
    await api(app, a.token).post(`/api/payments/${pay.id}/refund`).expect(409)
    await api(app, a.token).post(`/api/pools/${pool.id}/status`, { to: 'cancelled' }).expect(200)
    const refunded = await api(app, a.token).post(`/api/payments/${pay.id}/refund`).expect(200)
    expect(refunded.body.data.payment.status).toBe('refunded')
  })

  test('host needs a UPI id before collecting money', async () => {
    const [a, b] = [await makeUser(), await makeUser()]
    const ia = await postIntent(a, { items: smallCart })
    const ib = await postIntent(b, { items: smallCart })
    const pool = (await api(app, a.token).post('/api/pools', { intentIds: [ia.id, ib.id] }).expect(201)).body.data.pool
    await api(app, b.token).post(`/api/pools/${pool.id}/confirm`).expect(200)
    const res = await api(app, a.token).post(`/api/pools/${pool.id}/actual-total`, { actualTotalPaise: 16500 }).expect(422)
    expect(res.body.error.message).toContain('UPI')
  })
})

describe('authorization and safety', () => {
  test('outsiders cannot see pools; non-owners cannot touch intents', async () => {
    const [a, b, outsider] = [await makeUser(), await makeUser(), await makeUser()]
    const ia = await postIntent(a, { items: smallCart })
    const ib = await postIntent(b, { items: smallCart })
    const pool = (await api(app, a.token).post('/api/pools', { intentIds: [ia.id, ib.id] }).expect(201)).body.data.pool
    await api(app, outsider.token).get(`/api/pools/${pool.id}`).expect(404)
    await api(app, outsider.token).post(`/api/pools/${pool.id}/confirm`).expect(404)
    await api(app, outsider.token).patch(`/api/intents/${ia.id}`, { notes: 'hack' }).expect(404)
    await api(app, outsider.token).post(`/api/intents/${ia.id}/cancel`).expect(404)
    await api(app, null).get(`/api/pools/${pool.id}`).expect(401)
    await api(app, a.token).post(`/api/intents/${ia.id}/cancel`).expect(409)
  })

  test('the pool view never leaks email or UPI id', async () => {
    const [a, b] = [await makeUser(), await makeUser()]
    await api(app, a.token).patch('/api/users/me', { upiId: 'secret.host@okaxis' }).expect(200)
    const ia = await postIntent(a, { items: smallCart })
    const ib = await postIntent(b, { items: smallCart })
    const pool = (await api(app, a.token).post('/api/pools', { intentIds: [ia.id, ib.id] }).expect(201)).body.data.pool
    const text = JSON.stringify((await api(app, b.token).get(`/api/pools/${pool.id}`)).body)
    expect(text).not.toContain('@college.edu')
    expect(text).not.toContain('secret.host')
    const me = await api(app, a.token).get('/api/users/me')
    expect(JSON.stringify(me.body)).not.toContain('secret.host@okaxis')
    expect(me.body.data.user.hasUpiId).toBe(true)
  })

  test('two simultaneous pool requests cannot reserve the same intents', async () => {
    const users = [await makeUser(), await makeUser(), await makeUser()]
    const intents = []
    for (const u of users) intents.push(await postIntent(u, { items: smallCart }))
    const ids = intents.map((i) => i.id)
    const [r1, r2] = await Promise.all([
      api(app, users[0].token).post('/api/pools', { intentIds: ids }),
      api(app, users[1].token).post('/api/pools', { intentIds: ids }),
    ])
    const statuses = [r1.status, r2.status]
    const wins = statuses.filter((s) => s === 201).length
    // Safety invariant: never two pools for the same intents, and every loser gets a clean 409.
    expect(wins).toBeLessThanOrEqual(1)
    expect(statuses.filter((s) => s !== 201).every((s) => s === 409)).toBe(true)
    expect(await Pool.countDocuments()).toBe(wins)
    expect(await ShoppingIntent.countDocuments({ status: 'reserved' })).toBe(wins * 3)
    expect(await ShoppingIntent.countDocuments({ status: 'active' })).toBe(wins ? 0 : 3)
  })
})

describe('intent validation', () => {
  test('rejects bad input', async () => {
    const u = await makeUser()
    const send = (body) => api(app, u.token).post('/api/intents', intentBody(body))
    await send({ platform: 'swiggy' }).expect(422)
    await send({ items: [] }).expect(422)
    await send({ items: [{ name: 'Milk', qty: 0, unitPricePaise: 100 }] }).expect(422)
    await send({ items: [{ name: 'Milk', qty: 1.5, unitPricePaise: 100 }] }).expect(422)
    await send({ items: [{ name: 'Milk', qty: 1, unitPricePaise: 10.5 }] }).expect(422)
    await send({ items: [{ name: 'Milk', qty: 1, unitPricePaise: -5 }] }).expect(422)
    await send({ windowStart: new Date(Date.now() - 7200000).toISOString(), windowEnd: new Date(Date.now() - 3600000).toISOString() }).expect(422)
    await send({ windowStart: new Date(Date.now() + 7200000).toISOString(), windowEnd: new Date(Date.now() + 3600000).toISOString() }).expect(422)
    await api(app, u.token).post('/api/intents', {}).expect(422)
  })

  test('an intent without prices is saved but not ready, and cannot be matched', async () => {
    const u = await makeUser()
    const intent = await postIntent(u, { items: [{ name: 'Milk', qty: 1 }] })
    expect(intent.ready).toBe(false)
    expect(intent.subtotalPaise).toBeNull()
    const match = await api(app, u.token).post('/api/matching/run', { intentId: intent.id }).expect(200)
    expect(match.body.data.proposal.status).toBe('needs_prices')
  })

  test('edit, cancel and list', async () => {
    const u = await makeUser()
    const intent = await postIntent(u)
    const edited = await api(app, u.token).patch(`/api/intents/${intent.id}`, { items: [{ name: 'Milk', qty: 3, unitPricePaise: 3000 }] }).expect(200)
    expect(edited.body.data.intent.subtotalPaise).toBe(9000)
    await api(app, u.token).post(`/api/intents/${intent.id}/cancel`).expect(200)
    await api(app, u.token).patch(`/api/intents/${intent.id}`, { notes: 'x' }).expect(409)
    const list = await api(app, u.token).get('/api/intents/mine').expect(200)
    expect(list.body.data.intents[0].status).toBe('cancelled')
  })

  test('the board hides prices and other hostels', async () => {
    const [a, b, far] = [await makeUser(), await makeUser(), await makeUser({ hostel: 'Tagore' })]
    await postIntent(b)
    await postIntent(far)
    const board = (await api(app, a.token).get('/api/intents/board').expect(200)).body.data.intents
    expect(board).toHaveLength(1)
    expect(board[0].items[0].unitPricePaise).toBeUndefined()
    expect(board[0].subtotalPaise).toBeUndefined()
  })

  test('preview optimization needs one of your own intents', async () => {
    const [a, b] = [await makeUser(), await makeUser()]
    const ia = await postIntent(a, { items: smallCart })
    const ib = await postIntent(b, { items: smallCart })
    const ok = await api(app, a.token).post('/api/optimization/preview', { intentIds: [ia.id, ib.id] }).expect(200)
    expect(ok.body.data.optimization.recommendation).toBe('pool')
    await api(app, (await makeUser()).token).post('/api/optimization/preview', { intentIds: [ia.id, ib.id] }).expect(403)
  })
})
