/**
 * DropPool Money Utility
 * All internal money calculations on server and client use integer paise.
 */

export function formatPaise(paise, { showZeroRest = false } = {}) {
  if (paise === null || paise === undefined) return '—'
  const isNegative = paise < 0
  const abs = Math.abs(Math.round(paise))
  const rupees = Math.floor(abs / 100)
  const rest = abs % 100

  const rupeeStr = rupees.toLocaleString('en-IN')
  if (rest === 0) {
    return `${isNegative ? '-' : ''}₹${rupeeStr}${showZeroRest ? '.00' : ''}`
  }
  return `${isNegative ? '-' : ''}₹${rupeeStr}.${String(rest).padStart(2, '0')}`
}

export function rupeesToPaise(value) {
  if (value === null || value === undefined) return null
  const str = String(value).trim()
  if (str === '') return null
  const num = Number(str.replace(/,/g, ''))
  if (Number.isNaN(num) || !Number.isFinite(num)) return NaN
  return Math.round(num * 100)
}

export function paiseToRupees(paise) {
  if (paise === null || paise === undefined) return ''
  const val = Math.round(paise)
  const rupees = Math.floor(val / 100)
  const rest = val % 100
  if (rest === 0) return String(rupees)
  return `${rupees}.${String(rest).padStart(2, '0')}`
}
