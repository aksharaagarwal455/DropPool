const { isAllowedCollegeEmail, normalizeEmail } = require('../src/utils/emailDomain')

describe('college email domain', () => {
  test('accepts any domain in a comma-separated list', () => {
    const domains = ' Banasthali.in, @Example.EDU '
    expect(isAllowedCollegeEmail('Ada@College.edu', 'college.edu')).toBe(true)
    expect(isAllowedCollegeEmail('Ada@Banasthali.in', domains)).toBe(true)
    expect(isAllowedCollegeEmail('ada@example.edu', domains)).toBe(true)
    expect(isAllowedCollegeEmail('ada@cs.college.edu', 'college.edu')).toBe(false)
    expect(isAllowedCollegeEmail('ada@gmail.com', domains)).toBe(false)
    expect(isAllowedCollegeEmail('ada@college.edu', '')).toBe(false)
    expect(isAllowedCollegeEmail('not-an-email', 'college.edu')).toBe(false)
  })

  test('normalizes surrounding space and case', () => {
    expect(normalizeEmail('  Ada@College.edu ')).toBe('ada@college.edu')
  })
})
