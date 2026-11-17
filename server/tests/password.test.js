const { hashPassword, verifyPassword } = require('../src/utils/password')

describe('password hashing', () => {
  test('stores a hash and verifies the original password', async () => {
    const hash = await hashPassword('correct-horse')

    expect(hash).not.toContain('correct-horse')
    expect(await verifyPassword('correct-horse', hash)).toBe(true)
    expect(await verifyPassword('wrong-password', hash)).toBe(false)
  })

  test('rejects a short password', async () => {
    await expect(hashPassword('short')).rejects.toMatchObject({
      statusCode: 422,
      message: 'Password must be at least 8 characters',
    })
  })

  test('rejects a password longer than 72 characters', async () => {
    await expect(hashPassword('a'.repeat(73))).rejects.toMatchObject({
      statusCode: 422,
      message: 'Password must be at most 72 characters',
    })
  })
})
