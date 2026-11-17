const { resolveEnv } = require('../src/config/env')

describe('environment', () => {
  test('production refuses a missing JWT secret', () => {
    expect(() => resolveEnv({ NODE_ENV: 'production' })).toThrow(/JWT_SECRET/)
  })

  test('development can boot with a labelled fallback secret', () => {
    const resolved = resolveEnv({ NODE_ENV: 'development' })
    expect(resolved.usingDevJwtSecret).toBe(true)
    expect(resolved.jwtSecret).toBe('dev-only-not-for-production')
    expect(resolved.jwtExpiresIn).toBe('12h')
  })

  test('parses comma-separated college domains and ignores the old single key', () => {
    expect(resolveEnv({
      COLLEGE_EMAIL_DOMAINS: ' Banasthali.in, @Example.EDU, ,',
      COLLEGE_EMAIL_DOMAIN: 'old.edu',
    }).collegeEmailDomains).toEqual(['banasthali.in', 'example.edu'])
    expect(resolveEnv({}).collegeEmailDomains).toEqual([])
  })

  test('demo mode is on only when the flag is the string true', () => {
    expect(resolveEnv({ DEMO_MODE: 'true' }).demoMode).toBe(true)
    expect(resolveEnv({ DEMO_MODE: 'false' }).demoMode).toBe(false)
    expect(resolveEnv({}).demoMode).toBe(false)
  })
})
