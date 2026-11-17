const POOL_STATUSES = [
  'proposed', 'confirmed', 'awaiting_payments', 'payments_confirmed',
  'order_placed', 'ready_for_pickup', 'completed', 'cancelled',
]

const TRANSITIONS = {
  proposed: ['confirmed', 'cancelled'],
  confirmed: ['awaiting_payments', 'cancelled'],
  awaiting_payments: ['payments_confirmed', 'cancelled'],
  payments_confirmed: ['order_placed', 'cancelled'],
  order_placed: ['ready_for_pickup'],
  ready_for_pickup: ['completed'],
  completed: [],
  cancelled: [],
}

// Steps the host may trigger directly. The others are driven by the system.
const HOST_TRIGGERED = ['order_placed', 'ready_for_pickup', 'completed', 'cancelled']

function canTransition(from, to) {
  return Boolean(TRANSITIONS[from] && TRANSITIONS[from].includes(to))
}

module.exports = { POOL_STATUSES, TRANSITIONS, HOST_TRIGGERED, canTransition }
