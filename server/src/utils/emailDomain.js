function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function normalizeDomain(domain) {
  return String(domain || '').trim().toLowerCase().replace(/^@/, '')
}

function parseDomainList(domains) {
  const list = Array.isArray(domains) ? domains : String(domains || '').split(',')
  return list.map(normalizeDomain).filter(Boolean)
}

function isAllowedCollegeEmail(email, domains) {
  const normalized = normalizeEmail(email)
  const allowed = parseDomainList(domains)
  const at = normalized.lastIndexOf('@')
  if (allowed.length === 0 || at <= 0 || at === normalized.length - 1) {
    return false
  }
  return allowed.includes(normalized.slice(at + 1))
}

module.exports = {
  normalizeEmail,
  normalizeDomain,
  parseDomainList,
  isAllowedCollegeEmail,
}
