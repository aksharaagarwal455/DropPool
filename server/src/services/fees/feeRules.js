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

function feeTargets(profile) {
  if (!profile || typeof profile !== 'object') return null
  const freeAbove = profile.freeDeliveryAbovePaise ?? null
  const smallBelow = profile.smallCartBelowPaise ?? null
  return {
    freeDeliveryAbovePaise: freeAbove,
    smallCartBelowPaise: smallBelow,
    targetPaise: freeAbove,
    deliveryFeePaise: profile.deliveryFeePaise ?? 0,
    smallCartFeePaise: profile.smallCartFeePaise ?? 0,
  }
}

function gapToTarget(profile, pooledSubtotalPaise = 0) {
  const targets = feeTargets(profile)
  if (!targets) {
    return {
      deliveryGapPaise: 0,
      smallCartGapPaise: 0,
      gapPaise: 0,
      targetReached: false,
      nextMilestone: null,
    }
  }

  const freeAbove = targets.freeDeliveryAbovePaise ?? 0
  const smallBelow = targets.smallCartBelowPaise ?? 0

  const deliveryGapPaise = freeAbove > 0 ? Math.max(0, freeAbove - pooledSubtotalPaise) : 0
  const smallCartGapPaise = smallBelow > 0 ? Math.max(0, smallBelow - pooledSubtotalPaise) : 0
  const targetReached = freeAbove > 0 ? deliveryGapPaise === 0 : true

  let nextMilestone = null
  if (smallCartGapPaise > 0) {
    nextMilestone = {
      type: 'waive_small_cart_fee',
      label: 'Waive small-cart fee',
      gapPaise: smallCartGapPaise,
      thresholdPaise: smallBelow,
    }
  } else if (deliveryGapPaise > 0) {
    nextMilestone = {
      type: 'free_delivery',
      label: 'Free delivery',
      gapPaise: deliveryGapPaise,
      thresholdPaise: freeAbove,
    }
  } else {
    nextMilestone = {
      type: 'free_delivery_unlocked',
      label: 'Free delivery unlocked',
      gapPaise: 0,
      thresholdPaise: freeAbove,
    }
  }

  return {
    deliveryGapPaise,
    smallCartGapPaise,
    gapPaise: deliveryGapPaise > 0 ? deliveryGapPaise : smallCartGapPaise,
    targetReached,
    nextMilestone,
  }
}

module.exports = { validateProfile, computeFees, feeTargets, gapToTarget }
