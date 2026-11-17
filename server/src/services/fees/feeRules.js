const { isPaise } = require('../money')

const REQUIRED = ['deliveryFeePaise', 'handlingFeePaise', 'smallCartFeePaise', 'otherFeePaise']
const OPTIONAL = ['freeDeliveryAbovePaise', 'smallCartBelowPaise']

function validateProfile(profile) {
  if (!profile || typeof profile !== 'object') return 'Fee profile is missing'
  for (const key of REQUIRED) {
    if (!isPaise(profile[key]) || profile[key] < 0) return `${key} must be a non-negative integer (paise)`
  }
  for (const key of OPTIONAL) {
    const v = profile[key]
    if (v !== null && v !== undefined && (!isPaise(v) || v < 0)) return `${key} must be null or a non-negative integer (paise)`
  }
  return null
}

function computeFees(profile, subtotalPaise) {
  const problem = validateProfile(profile)
  if (problem) throw new RangeError(problem)
  if (!isPaise(subtotalPaise) || subtotalPaise < 0) throw new RangeError('Subtotal must be a non-negative integer')

  const freeAbove = profile.freeDeliveryAbovePaise ?? null
  const smallBelow = profile.smallCartBelowPaise ?? null
  const deliveryWaived = freeAbove !== null && subtotalPaise >= freeAbove
  const smallCartApplies = smallBelow !== null && subtotalPaise < smallBelow

  const lines = [
    { key: 'delivery', label: 'Delivery fee', amountPaise: deliveryWaived ? 0 : profile.deliveryFeePaise, waived: deliveryWaived },
    { key: 'handling', label: 'Handling fee', amountPaise: profile.handlingFeePaise, waived: false },
    { key: 'smallCart', label: 'Small-cart fee', amountPaise: smallCartApplies ? profile.smallCartFeePaise : 0, waived: !smallCartApplies },
    { key: 'other', label: 'Other charges', amountPaise: profile.otherFeePaise, waived: false },
  ]
  return { lines, totalPaise: lines.reduce((sum, line) => sum + line.amountPaise, 0) }
}

module.exports = { validateProfile, computeFees }
