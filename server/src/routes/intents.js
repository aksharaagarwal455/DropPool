const express = require('express')
const { requireAuth } = require('../middleware/auth')
const { asyncHandler } = require('../middleware/errorHandler')
const svc = require('../services/intentService')

const router = express.Router()
router.use(requireAuth)

router.get('/mine', asyncHandler(async (req, res) => {
  res.json({ success: true, data: { intents: await svc.listMine(req.auth.userId) } })
}))

router.get('/board', asyncHandler(async (req, res) => {
  res.json({ success: true, data: { intents: await svc.board(req.auth.userId) } })
}))

router.post('/', asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: { intent: await svc.createIntent(req.auth.userId, req.body || {}) } })
}))

router.get('/:id', asyncHandler(async (req, res) => {
  res.json({ success: true, data: { intent: await svc.getMine(req.auth.userId, req.params.id) } })
}))

router.patch('/:id', asyncHandler(async (req, res) => {
  res.json({ success: true, data: { intent: await svc.updateIntent(req.auth.userId, req.params.id, req.body || {}) } })
}))

router.post('/:id/cancel', asyncHandler(async (req, res) => {
  res.json({ success: true, data: { intent: await svc.cancelIntent(req.auth.userId, req.params.id) } })
}))

module.exports = router
