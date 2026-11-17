const request = require('supertest')
const { createApp } = require('../src/app')

const app = createApp()

describe('health', () => {
  test('GET /api/health reports a live process and an unconfigured database', async () => {
    const response = await request(app).get('/api/health').expect(200)

    expect(response.body.success).toBe(true)
    expect(response.body.data.service).toBe('droppool-api')
    expect(response.body.data.status).toBe('ok')
    expect(response.body.data.database).toEqual({ status: 'unconfigured', error: null })
    expect(response.body.data.geminiConfigured).toBe(false)
    expect(response.body.data.collegeEmailDomains).toEqual(['college.edu', 'example.edu'])
    expect(response.body.data).not.toHaveProperty('geminiApiKey')
    expect(response.body.data).not.toHaveProperty('mongoUri')
  })

  test('GET /api/health/ready is unavailable without a database', async () => {
    const response = await request(app).get('/api/health/ready').expect(503)

    expect(response.body.success).toBe(false)
    expect(response.body.error.message).toBe('Database is not connected')
  })

  test('unknown routes return a JSON 404', async () => {
    const response = await request(app).get('/api/does-not-exist').expect(404)

    expect(response.body.success).toBe(false)
    expect(response.body.error.message).toBe('Route not found')
  })
})
