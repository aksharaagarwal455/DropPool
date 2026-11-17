const User = require('../src/models/User')

describe('User model', () => {
  test('defines the identity fields used by later registration', () => {
    expect(User.schema.path('email').options.unique).toBe(true)
    expect(User.schema.path('passwordHash').options.select).toBe(false)
    expect(User.schema.path('upiId').options.select).toBe(false)
    expect(User.schema.path('role').enumValues).toEqual(['student', 'admin'])
    expect(User.schema.path('isDemo')).toBeTruthy()
    expect(User.schema.path('emailVerified')).toBeTruthy()
  })
})
