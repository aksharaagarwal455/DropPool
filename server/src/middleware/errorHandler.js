class AppError extends Error {
  constructor(message, statusCode, extra = {}) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = true
    this.extra = extra
  }
}

function notFound(req, res, next) {
  next(new AppError('Route not found', 404))
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    next(err)
    return
  }

  if (err.type === 'entity.parse.failed') {
    res.status(400).json({ success: false, error: { message: 'Request body is not valid JSON' } })
    return
  }
  if (err.type === 'entity.too.large') {
    res.status(413).json({ success: false, error: { message: 'Request body is too large' } })
    return
  }

  const statusCode = err.statusCode || 500
  const message = err.isOperational ? err.message : 'Internal server error'

  if (!err.isOperational) {
    console.error(err)
  }

  res.status(statusCode).json({
    success: false,
    error: { message, ...(err.isOperational && err.extra ? err.extra : {}) },
  })
}

function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

module.exports = {
  AppError,
  notFound,
  errorHandler,
  asyncHandler,
}
