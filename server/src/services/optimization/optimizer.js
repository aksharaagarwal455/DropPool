const { computeFees } = require('../fees/feeRules')
const { allocate, allocateSigned, formatPaise, isPaise } = require('../money')

const ALLOCATIONS = ['proportional', 'equal']

function describeRule(allocation) {
  return allocation === 'equal'
    ? 'Shared charges are split equally. Leftover paise go to the member with the largest cart, then by id.'
    : 'Shared charges are split in proportion to each member\u2019s product subtotal. Leftover paise go to the largest carts first, then by id.'
}

function validateMembers(members) {
  if (!Array.isArray(members) || members.length === 0) return 'At least one member is required'
  const seen = new Set()
  for (const m of members) {
    if (!m || m.id === undefined || m.id === null) return 'Every member needs an id'
    if (seen.has(String(m.id))) return 'Member ids must be unique'
    seen.add(String(m.id))
    if (m.subtotalPaise === null || m.subtotalPaise === undefined) {
      return `${m.label || 'A member'} has an item without a price`
    }
    if (!isPaise(m.subtotalPaise) || m.subtotalPaise < 0) return 'Member subtotals must be non-negative integers'
    if (m.observedFeesPaise !== null && m.observedFeesPaise !== undefined && (!isPaise(m.observedFeesPaise) || m.observedFeesPaise < 0)) {
      return 'Observed fees must be null or a non-negative integer'
    }
  }
  return null
}

function insufficient(reason) {
  return { recommendation: 'insufficient_data', reason, members: [], pooled: null, totalSavingsPaise: 0 }
}

/**
 * members: [{ id, label?, subtotalPaise, observedFeesPaise? }]
 * observedFeesPaise (from a real screenshot) overrides the fee profile for that member's solo order.
 */
function optimize({ members, profile, allocation = 'proportional' }) {
  if (!ALLOCATIONS.includes(allocation)) throw new RangeError('Unknown allocation rule')
  if (!profile) return insufficient('Fee data is missing for this platform, so savings cannot be calculated')
  const problem = validateMembers(members)
  if (problem) return insufficient(problem)

  const subtotals = members.map((m) => m.subtotalPaise)
  const pooledSubtotal = subtotals.reduce((a, b) => a + b, 0)
  const pooledFees = computeFees(profile, pooledSubtotal)
  const ids = members.map((m) => String(m.id))
  const weights = allocation === 'equal' ? members.map(() => 1) : subtotals
  const feeShares = allocate(pooledFees.totalPaise, weights, ids)

  const rows = members.map((m, i) => {
    const individualFees = m.observedFeesPaise ?? computeFees(profile, m.subtotalPaise).totalPaise
    const individualTotal = m.subtotalPaise + individualFees
    const sharePaise = m.subtotalPaise + feeShares[i]
    const savingsPaise = individualTotal - sharePaise
    return {
      id: String(m.id),
      label: m.label || String(m.id),
      subtotalPaise: m.subtotalPaise,
      individualFeesPaise: individualFees,
      individualFeesSource: m.observedFeesPaise !== null && m.observedFeesPaise !== undefined ? 'screenshot' : 'fee_profile',
      individualTotalPaise: individualTotal,
      sharedFeePaise: feeShares[i],
      sharePaise,
      savingsPaise,
      savingsPercent: individualTotal > 0 ? Math.round((savingsPaise * 1000) / individualTotal) / 10 : 0,
    }
  })

  const base = {
    members: rows,
    pooled: {
      subtotalPaise: pooledSubtotal,
      feeLines: pooledFees.lines,
      feesPaise: pooledFees.totalPaise,
      totalPaise: pooledSubtotal + pooledFees.totalPaise,
    },
    allocation,
    allocationRule: describeRule(allocation),
    feeProfileVersion: profile.version ?? null,
    totalSavingsPaise: rows.reduce((sum, r) => sum + r.savingsPaise, 0),
  }

  if (members.length < 2) {
    return { ...base, recommendation: 'individual', reason: 'A pool needs at least 2 students. Order individually.' }
  }

  const losers = rows.filter((r) => r.savingsPaise <= 0)
  if (losers.length > 0) {
    const worst = losers.reduce((a, b) => (a.savingsPaise <= b.savingsPaise ? a : b))
    const detail = worst.savingsPaise === 0
      ? `${worst.label} would save nothing`
      : `ordering individually is cheaper by ${formatPaise(-worst.savingsPaise)} for ${worst.label}`
    return {
      ...base,
      recommendation: 'individual',
      reason: `Pooling is not recommended. Estimated ${detail}.`,
    }
  }

  const min = Math.min(...rows.map((r) => r.savingsPaise))
  const max = Math.max(...rows.map((r) => r.savingsPaise))
  const range = min === max ? formatPaise(min) : `${formatPaise(min)} to ${formatPaise(max)}`
  return {
    ...base,
    recommendation: 'pool',
    reason: `Recommended pool: ${members.length} students. Estimated savings: ${range} per member.`,
  }
}

/** After the host enters the real checkout total, recompute each member's final share. */
function finalShares({ members, actualTotalPaise, allocation = 'proportional' }) {
  if (!isPaise(actualTotalPaise) || actualTotalPaise <= 0) throw new RangeError('Actual total must be a positive integer')
  const subtotals = members.map((m) => m.subtotalPaise)
  const pooledSubtotal = subtotals.reduce((a, b) => a + b, 0)
  const extra = actualTotalPaise - pooledSubtotal
  const ids = members.map((m) => String(m.id))
  const weights = allocation === 'equal' ? members.map(() => 1) : subtotals
  const parts = allocateSigned(extra, weights, ids)
  const shares = members.map((m, i) => ({ id: String(m.id), sharePaise: m.subtotalPaise + parts[i], sharedChargePaise: parts[i] }))
  if (shares.some((s) => s.sharePaise < 0)) throw new RangeError('Actual total gives a negative share')
  return { shares, extraChargesPaise: extra }
}

module.exports = { optimize, finalShares, ALLOCATIONS }
