const jwt = require('jsonwebtoken')
const request = require('supertest')
const { createApp } = require('../src/app')
const { signAccessToken } = require('../src/utils/jwt')

const app = createApp()

describe('auth scaffolding', () => {
  test('issues a 12-hour access token', () => {
    const token = signAccessToken({ userId: 'user-1', role: 'student' })
    const decoded = jwt.decode(token)

    expect(decoded.sub).toBe('user-1')
    expect(decoded.role).toBe('student')
    expect(decoded.exp - decoded.iat).toBe(12 * 60 * 60)
  })

  test('rejects a session request without a token', async () => {
    const response = await request(app).get('/api/auth/session').expect(401)
    expect(response.body.error.message).toBe('Authentication required')
  })

  test('returns the token claims for a valid student token', async () => {
    const token = signAccessToken({ userId: 'user-1', role: 'student' })
    const response = await request(app)
      .get('/api/auth/session')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(response.body.data).toEqual({ userId: 'user-1', role: 'student' })
  })

  test('rejects a malformed token', async () => {
    const response = await request(app)
      .get('/api/auth/session')
      .set('Authorization', 'Bearer not-a-token')
      .expect(401)

    expect(response.body.error.message).toBe('Invalid or expired token')
  })

  test('rejects an expired token', async () => {
    const token = jwt.sign(
      { role: 'student', exp: Math.floor(Date.now() / 1000) - 10 },
      process.env.JWT_SECRET,
      { subject: 'user-1' },
    )

    await request(app)
      .get('/api/auth/session')
      .set('Authorization', `Bearer ${token}`)
      .expect(401)
  })

  test('blocks a student from the admin route', async () => {
    const token = signAccessToken({ userId: 'user-1', role: 'student' })
    const response = await request(app)
      .get('/api/auth/admin/ping')
      .set('Authorization', `Bearer ${token}`)
      .expect(403)

    expect(response.body.error.message).toBe('You do not have access to this resource')
  })

  test('allows an admin token on the admin route', async () => {
    const token = signAccessToken({ userId: 'admin-1', role: 'admin' })
    const response = await request(app)
      .get('/api/auth/admin/ping')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(response.body.data).toEqual({ ok: true })
  })
})
