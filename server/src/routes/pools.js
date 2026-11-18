const express = require('express')
const { requireAuth } = require('../middleware/auth')
const { asyncHandler } = require('../middleware/errorHandler')
const svc = require('../services/poolService')

const router = express.Router()
router.use(requireAuth)
const send = (res, pool, status = 200) => res.status(status).json({ success: true, data: { pool } })

router.get('/mine', asyncHandler(async (req, res) => {
  res.json({ success: true, data: { pools: await svc.listMine(req.auth.userId) } })
}))

router.post('/', asyncHandler(async (req, res) => {
  send(res, await svc.createPool(req.auth.userId, req.body?.intentIds), 201)
}))

router.get('/:id', asyncHandler(async (req, res) => send(res, await svc.getPool(req.auth.userId, req.params.id))))
router.post('/:id/confirm', asyncHandler(async (req, res) => send(res, await svc.confirmMembership(req.auth.userId, req.params.id))))
router.post('/:id/confirm-all', asyncHandler(async (req, res) => send(res, await svc.confirmAllMembers(req.auth.userId, req.params.id))))
router.post('/:id/leave', asyncHandler(async (req, res) => send(res, await svc.leavePool(req.auth.userId, req.params.id))))
router.post('/:id/actual-total', asyncHandler(async (req, res) => send(res, await svc.recordActualTotal(req.auth.userId, req.params.id, req.body?.actualTotalPaise))))
router.post('/:id/status', asyncHandler(async (req, res) => send(res, await svc.hostTransition(req.auth.userId, req.params.id, req.body?.to, req.body || {}))))

module.exports = router
