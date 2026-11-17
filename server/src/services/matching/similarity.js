function normalizeName(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

function tokens(name) {
  return normalizeName(name).split(' ').filter((t) => t.length > 1 && !/^\d+$/.test(t))
}

function itemTokenSet(items) {
  const set = new Set()
  for (const item of items || []) for (const t of tokens(item.name)) set.add(t)
  return set
}

function productSimilarity(a, b) {
  const sa = itemTokenSet(a)
  const sb = itemTokenSet(b)
  if (sa.size === 0 || sb.size === 0) return { score: 0, shared: [] }
  const shared = [...sa].filter((t) => sb.has(t))
  const union = new Set([...sa, ...sb]).size
  return { score: Math.round((shared.length / union) * 100), shared }
}

function sharedProductNames(a, b) {
  const namesB = new Set((b || []).map((i) => normalizeName(i.name)))
  return (a || []).filter((i) => namesB.has(normalizeName(i.name))).map((i) => normalizeName(i.name))
}

module.exports = { normalizeName, productSimilarity, sharedProductNames }
