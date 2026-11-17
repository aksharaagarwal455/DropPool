const express = require('express')
const { requireAuth, requireRole } = require('../middleware/auth')
const { asyncHandler } = require('../middleware/errorHandler')
const { register, login, getCurrentUser } = require('../services/authService')

const router = express.Router()

router.post('/register', asyncHandler(async (req, res) => {
  const result = await register(req.body)
  res.status(201).json({ success: true, data: result })
}))

router.post('/login', asyncHandler(async (req, res) => {
  const result = await login(req.body)
  res.json({ success: true, data: result })
}))

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const user = await getCurrentUser(req.auth.userId)
  res.json({ success: true, data: { user } })
}))

router.get('/session', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: {
      userId: req.auth.userId,
      role: req.auth.role,
    },
  })
})

router.get('/admin/ping', requireAuth, requireRole('admin'), (req, res) => {
  res.json({ success: true, data: { ok: true } })
})

module.exports = router
