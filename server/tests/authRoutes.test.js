const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const request = require('supertest')
const { createApp } = require('../src/app')
const User = require('../src/models/User')

const app = createApp()
jest.setTimeout(30000)

function student(overrides = {}) {
  return {
    name: 'Ada Lovelace',
    email: 'ada@college.edu',
    password: 'correct-horse',
    hostel: 'Shree',
    block: 'A',
    floor: '2',
    ...overrides,
  }
}

let dbConnected = false

beforeAll(async () => {
  try {
    const baseUri = process.env.MONGO_URI_TEST || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/droppool_auth_test'
    await mongoose.connect(baseUri, { serverSelectionTimeoutMS: 2500 })
    dbConnected = true
  } catch (err) {
    console.warn(`[authRoutes.test.js] MongoDB not running (${err.message}). Database integration tests will be skipped.`)
  }
})

afterEach(async () => {
  if (dbConnected) await User.deleteMany({})
})

afterAll(async () => {
  if (dbConnected) {
    await mongoose.connection.dropDatabase()
    await mongoose.disconnect()
  }
})

const dbTest = (title, fn) => {
  test(title, async () => {
    if (!dbConnected) return
    await fn()
  })
}

describe('student authentication', () => {
  dbTest('rejects an email outside the allowed college domains', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send(student({ email: 'ada@gmail.com' }))
      .expect(422)

    expect(response.body).toEqual({
      success: false,
      error: { message: 'Use an allowed college email domain' },
    })
    expect(await User.countDocuments()).toBe(0)
  })

  dbTest('accepts every configured college domain', async () => {
    const first = await request(app)
      .post('/api/auth/register')
      .send(student({ email: 'Ada@College.edu' }))
      .expect(201)
    const second = await request(app)
      .post('/api/auth/register')
      .send(student({ email: 'grace@example.edu', name: 'Grace Hopper' }))
      .expect(201)

    expect(first.body.data.user.email).toBe('ada@college.edu')
    expect(second.body.data.user.email).toBe('grace@example.edu')
    expect(first.body.data.user.role).toBe('student')
    expect(second.body.data.user.role).toBe('student')
  })

  dbTest('returns 409 when the email is already registered', async () => {
    await request(app).post('/api/auth/register').send(student()).expect(201)
    const response = await request(app)
      .post('/api/auth/register')
      .send(student({ name: 'Another Ada' }))
      .expect(409)

    expect(response.body).toEqual({
      success: false,
      error: { message: 'An account with this email already exists' },
    })
    expect(JSON.stringify(response.body)).not.toMatch(/E11000|Mongo/i)
  })

  dbTest('ignores a client-supplied role and always creates a student', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send(student({ role: 'admin', isDemo: true, emailVerified: true }))
      .expect(201)

    expect(response.body.data.user.role).toBe('student')
    expect(response.body.data.user.isDemo).toBe(false)
    expect(response.body.data.user.emailVerified).toBe(false)
    const decoded = jwt.decode(response.body.data.token)
    expect(decoded.role).toBe('student')
    expect(decoded.exp - decoded.iat).toBe(12 * 60 * 60)

    const stored = await User.findById(response.body.data.user.id)
    expect(stored.role).toBe('student')
  })

  dbTest('uses the same 401 message for an unknown email and a wrong password', async () => {
    await request(app).post('/api/auth/register').send(student()).expect(201)

    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ada@college.edu', password: 'wrong-password' })
    const unknownEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: 'missing@college.edu', password: 'wrong-password' })

    expect(wrongPassword.status).toBe(401)
    expect(unknownEmail.status).toBe(401)
    expect(wrongPassword.body).toEqual(unknownEmail.body)
    expect(wrongPassword.body).toEqual({
      success: false,
      error: { message: 'Invalid email or password' },
    })
  })

  dbTest('login returns a 12-hour token and the public user', async () => {
    await request(app).post('/api/auth/register').send(student()).expect(201)
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: '  Ada@College.edu ', password: 'correct-horse' })
      .expect(200)

    const decoded = jwt.decode(response.body.data.token)
    expect(decoded.sub).toBe(response.body.data.user.id)
    expect(decoded.role).toBe('student')
    expect(decoded.exp - decoded.iat).toBe(12 * 60 * 60)
    expect(response.body.data.user).not.toHaveProperty('passwordHash')
    expect(response.body.data.user).not.toHaveProperty('upiId')

    const stored = await User.findOne({ email: 'ada@college.edu' }).select('+passwordHash')
    expect(stored.passwordHash).not.toBe('correct-horse')
    expect(stored.passwordHash.startsWith('$2')).toBe(true)
    expect(stored.passwordHash.includes('$12$')).toBe(true)
  })

  dbTest('GET /api/auth/me requires a token', async () => {
    const response = await request(app).get('/api/auth/me').expect(401)
    expect(response.body).toEqual({
      success: false,
      error: { message: 'Authentication required' },
    })
  })

  dbTest('GET /api/auth/me returns the current user without passwordHash or upiId', async () => {
    const registered = await request(app).post('/api/auth/register').send(student()).expect(201)
    await User.updateOne({ _id: registered.body.data.user.id }, { upiId: 'ada@okbank' })

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${registered.body.data.token}`)
      .expect(200)

    expect(response.body.data.user.email).toBe('ada@college.edu')
    expect(response.body.data.user).not.toHaveProperty('passwordHash')
    expect(response.body.data.user).not.toHaveProperty('upiId')
    expect(JSON.stringify(response.body)).not.toMatch(/passwordHash|upiId|ada@okbank|correct-horse/)
  })

  dbTest('rejects passwords outside 8 to 72 characters', async () => {
    const short = await request(app)
      .post('/api/auth/register')
      .send(student({ password: 'short' }))
      .expect(422)
    const long = await request(app)
      .post('/api/auth/register')
      .send(student({ password: 'a'.repeat(73) }))
      .expect(422)

    expect(short.body.error.message).toBe('Password must be at least 8 characters')
    expect(long.body.error.message).toBe('Password must be at most 72 characters')
  })

  dbTest('rate limit triggers on repeated login attempts', async () => {
    const limited = createApp({ authRateLimitMax: 2 })
    const body = { email: 'ada@college.edu', password: 'wrong-password' }

    await request(limited).post('/api/auth/login').send(body).expect(401)
    await request(limited).post('/api/auth/login').send(body).expect(401)
    const blocked = await request(limited).post('/api/auth/login').send(body).expect(429)

    expect(blocked.body).toEqual({
      success: false,
      error: { message: 'Too many attempts. Try again later.' },
    })
  })
})
