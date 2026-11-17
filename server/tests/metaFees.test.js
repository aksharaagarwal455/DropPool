const request = require('supertest')
const { createApp } = require('../src/app')

describe('GET /api/meta/fees', () => {
  const app = createApp()

  it('rejects an invalid platform', async () => {
    const res = await request(app).get('/api/meta/fees?platform=amazon&subtotalPaise=1000')
    expect(res.status).toBe(422)
    expect(res.body.success).toBe(false)
  })

  it('rejects an invalid subtotalPaise', async () => {
    const res = await request(app).get('/api/meta/fees?platform=zepto&subtotalPaise=-50')
    expect(res.status).toBe(422)
    expect(res.body.success).toBe(false)
  })

  it('calculates illustrative fees for a valid platform and subtotal', async () => {
    const res = await request(app).get('/api/meta/fees?platform=zepto&subtotalPaise=12000')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.isIllustrative).toBe(true)
    expect(typeof res.body.data.feesPaise).toBe('number')
    expect(res.body.data.totalPaise).toBe(12000 + res.body.data.feesPaise)
    expect(Array.isArray(res.body.data.lines)).toBe(true)
  })

  it('calculates fees for blinkit', async () => {
    const res = await request(app).get('/api/meta/fees?platform=blinkit&subtotalPaise=8000')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.feesPaise).toBeGreaterThan(0)
    expect(res.body.data.totalPaise).toBe(8000 + res.body.data.feesPaise)
  })
})
