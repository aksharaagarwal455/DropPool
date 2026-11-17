const mongoose = require('mongoose')
const { AppError } = require('../middleware/errorHandler')

function cleanText(value, label, maxLength, { required = true } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw new AppError(`${label} is required`, 422)
    return ''
  }
  if (typeof value !== 'string') throw new AppError(`${label} must be text`, 422)
  const trimmed = value.trim()
  if (!trimmed && required) throw new AppError(`${label} is required`, 422)
  if (trimmed.length > maxLength) throw new AppError(`${label} must be at most ${maxLength} characters`, 422)
  return trimmed
}

function objectId(value, label = 'id') {
  if (!mongoose.isValidObjectId(value) || String(value).length !== 24) throw new AppError(`Invalid ${label}`, 422)
  return String(value)
}

function dateValue(value, label) {
  const date = new Date(value)
  if (value === undefined || value === null || Number.isNaN(date.getTime())) throw new AppError(`${label} must be a valid date`, 422)
  return date
}

function firstName(name) {
  return String(name || '').trim().split(/\s+/)[0] || 'Student'
}

module.exports = { cleanText, objectId, dateValue, firstName }
