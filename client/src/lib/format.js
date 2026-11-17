// Display and input parsing only. All savings and share calculations happen on the server.
export function formatPaise(paise) {
  if (paise === null || paise === undefined) return '—'
  const abs = Math.abs(paise)
  const rupees = Math.floor(abs / 100)
  const rest = abs % 100
  return `${paise < 0 ? '-' : ''}₹${rupees.toLocaleString('en-IN')}${rest ? '.' + String(rest).padStart(2, '0') : ''}`
}

// "81.25" -> 8125. Returns null for empty, NaN for invalid.
export function rupeesToPaise(text) {
  const value = String(text ?? '').trim()
  if (value === '') return null
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(value)) return NaN
  const [whole, fraction = ''] = value.split('.')
  return Number(whole) * 100 + Number((fraction + '00').slice(0, 2))
}

export function paiseToInput(paise) {
  if (paise === null || paise === undefined) return ''
  const rest = paise % 100
  return `${Math.floor(paise / 100)}${rest ? '.' + String(rest).padStart(2, '0') : ''}`
}

export function formatDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
}

export function formatWindow(start, end) {
  const s = new Date(start)
  const e = new Date(end)
  const time = (d) => d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
  const sameDay = s.toDateString() === e.toDateString()
  return sameDay ? `${s.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${time(s)} – ${time(e)}` : `${formatDateTime(s)} – ${formatDateTime(e)}`
}

export function toLocalInput(date) {
  const d = new Date(date)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export const PLATFORM_LABELS = { blinkit: 'Blinkit', zepto: 'Zepto', instamart: 'Swiggy Instamart' }
export const PLATFORM_SITES = { blinkit: 'https://blinkit.com', zepto: 'https://www.zeptonow.com', instamart: 'https://www.swiggy.com/instamart' }
export const STATUS_LABELS = {
  active: 'Active', reserved: 'In a pool proposal', pooled: 'Pooled', expired: 'Expired', cancelled: 'Cancelled',
  proposed: 'Pool proposed', confirmed: 'Pool confirmed', awaiting_payments: 'Awaiting payments', payments_confirmed: 'Payments confirmed',
  order_placed: 'Order placed', ready_for_pickup: 'Ready for pickup', completed: 'Completed',
  pending: 'Payment pending', claimed: 'Payment claimed', rejected: 'Rejected', refunded: 'Refunded',
}
