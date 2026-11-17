const { AppError } = require('../../middleware/errorHandler')

function isPaise(value) {
  return Number.isSafeInteger(value)
}

function assertPaise(value, label = 'Amount') {
  if (!isPaise(value)) {
    throw new AppError(`${label} must be a whole number of paise`, 422)
  }
  return value
}

function parseRupeesToPaise(input) {
  const text = String(input ?? '').trim()
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(text)) {
    throw new RangeError('Invalid rupee amount')
  }
  const [whole, fraction = ''] = text.split('.')
  return Number(whole) * 100 + Number((fraction + '00').slice(0, 2))
}

function formatPaise(paise) {
  const value = Number(paise)
  const sign = value < 0 ? '-' : ''
  const abs = Math.abs(value)
  const rupees = Math.floor(abs / 100)
  const rest = abs % 100
  const grouped = rupees.toLocaleString('en-IN')
  return `${sign}₹${grouped}${rest ? '.' + String(rest).padStart(2, '0') : ''}`
}

function paiseToDecimalString(paise) {
  const abs = Math.abs(paise)
  return `${paise < 0 ? '-' : ''}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`
}

/**
 * Splits `total` paise across entries in proportion to `weights` using integer math.
 * Leftover paise go one each to entries ordered by weight (largest first), then id.
 */
function allocate(total, weights, ids) {
  if (!isPaise(total) || total < 0) {
    throw new RangeError('Total to allocate must be a non-negative integer')
  }
  if (!Array.isArray(weights) || weights.length === 0) {
    throw new RangeError('At least one weight is required')
  }
  const sumWeights = weights.reduce((sum, w) => sum + w, 0)
  const effective = sumWeights > 0 ? weights : weights.map(() => 1)
  const effectiveSum = sumWeights > 0 ? sumWeights : weights.length
  const shares = effective.map((w) => Number((BigInt(total) * BigInt(w)) / BigInt(effectiveSum)))
  let remainder = total - shares.reduce((sum, v) => sum + v, 0)
  const order = effective
    .map((w, index) => ({ w, index, id: String(ids ? ids[index] : index) }))
    .sort((a, b) => b.w - a.w || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  for (let i = 0; remainder > 0; i = (i + 1) % order.length) {
    shares[order[i].index] += 1
    remainder -= 1
  }
  return shares
}

function allocateSigned(total, weights, ids) {
  if (total >= 0) return allocate(total, weights, ids)
  return allocate(-total, weights, ids).map((v) => -v)
}

module.exports = {
  isPaise,
  assertPaise,
  parseRupeesToPaise,
  formatPaise,
  paiseToDecimalString,
  allocate,
  allocateSigned,
}
