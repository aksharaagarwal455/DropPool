const mongoose = require('mongoose')
const request = require('supertest')
const User = require('../src/models/User')
const { signAccessToken } = require('../src/utils/jwt')

let counter = 0

async function makeUser(overrides = {}) {
  counter += 1
  const user = await User.create({
    name: `Student${counter} Test`, email: `s${counter}-${Date.now()}@college.edu`, passwordHash: 'x'.repeat(20),
    hostel: 'Gargi', block: 'A', floor: '2', ...overrides,
  })
  return { user, token: signAccessToken({ userId: String(user._id), role: user.role }), id: String(user._id) }
}

function api(app, token) {
  const auth = (r) => (token ? r.set('Authorization', `Bearer ${token}`) : r)
  return {
    get: (url) => auth(request(app).get(url)),
    post: (url, body) => auth(request(app).post(url)).send(body || {}),
    patch: (url, body) => auth(request(app).patch(url)).send(body || {}),
    put: (url, body) => auth(request(app).put(url)).send(body || {}),
  }
}

function windowFromNow(startMin = 0, endMin = 120) {
  const now = Date.now()
  return { windowStart: new Date(now + startMin * 60000).toISOString(), windowEnd: new Date(now + endMin * 60000).toISOString() }
}

function intentBody(overrides = {}) {
  return { platform: 'zepto', items: [{ name: 'Maggi noodles', qty: 2, unitPricePaise: 4000 }], ...windowFromNow(), ...overrides }
}

async function connect(name) {
  await mongoose.connect(`mongodb://127.0.0.1:27017/${name}`)
}

async function disconnect() {
  await mongoose.connection.dropDatabase()
  await mongoose.disconnect()
}

module.exports = { makeUser, api, intentBody, windowFromNow, connect, disconnect }
