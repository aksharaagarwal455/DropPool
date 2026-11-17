const express = require('express')
const { requireAuth } = require('../middleware/auth')
const { asyncHandler } = require('../middleware/errorHandler')
const svc = require('../services/paymentService')

const router = express.Router()
router.use(requireAuth)
const send = (res, payment) => res.json({ success: true, data: { payment } })

router.get('/mine', asyncHandler(async (req, res) => {
  res.json({ success: true, data: { payments: await svc.listMine(req.auth.userId) } })
}))
router.post('/:id/claim', asyncHandler(async (req, res) => send(res, await svc.claim(req.auth.userId, req.params.id, req.body || {}))))
router.post('/:id/confirm', asyncHandler(async (req, res) => send(res, await svc.confirm(req.auth.userId, req.params.id))))
router.post('/:id/reject', asyncHandler(async (req, res) => send(res, await svc.reject(req.auth.userId, req.params.id, req.body || {}))))
router.post('/:id/refund', asyncHandler(async (req, res) => send(res, await svc.refund(req.auth.userId, req.params.id))))

module.exports = router
