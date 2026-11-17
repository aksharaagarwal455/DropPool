const { paiseToDecimalString } = require('../services/money')

const UPI_ID = /^[a-zA-Z0-9.\-_]{2,64}@[a-zA-Z][a-zA-Z0-9]{1,31}$/

function isValidUpiId(value) {
  return typeof value === 'string' && UPI_ID.test(value.trim())
}

function maskUpiId(value) {
  if (!value) return null
  const [name, handle] = String(value).split('@')
  return `${name.slice(0, 2)}${'*'.repeat(Math.max(1, name.length - 2))}@${handle}`
}

function buildUpiUri({ payeeVpa, payeeName, amountPaise, note, reference }) {
  const params = new URLSearchParams()
  params.set('pa', payeeVpa)
  params.set('pn', payeeName)
  params.set('am', paiseToDecimalString(amountPaise))
  params.set('cu', 'INR')
  params.set('tn', note)
  params.set('tr', reference)
  return `upi://pay?${params.toString().replace(/\+/g, '%20')}`
}

module.exports = { isValidUpiId, maskUpiId, buildUpiUri }
