const mongoose = require('mongoose')

const paymentSchema = new mongoose.Schema(
  {
    poolId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pool', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amountPaise: { type: Number, required: true, min: 0, validate: Number.isInteger },
    status: { type: String, enum: ['pending', 'claimed', 'confirmed', 'rejected', 'refunded'], default: 'pending' },
    utr: { type: String, default: '', maxlength: 30 },
    claimedAt: { type: Date, default: null },
    decidedAt: { type: Date, default: null },
    rejectReason: { type: String, default: '', maxlength: 120 },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true, optimisticConcurrency: true },
)

paymentSchema.index({ poolId: 1, userId: 1 }, { unique: true })
paymentSchema.index({ isDemo: 1 })

module.exports = mongoose.model('Payment', paymentSchema)
