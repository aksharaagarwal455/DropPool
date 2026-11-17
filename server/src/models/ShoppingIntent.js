const mongoose = require('mongoose')

const itemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    qty: { type: Number, required: true, min: 1, max: 50, validate: Number.isInteger },
    unitPricePaise: { type: Number, default: null, min: 0, validate: { validator: (v) => v === null || Number.isInteger(v) } },
  },
  { _id: false },
)

const intentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    userName: { type: String, required: true },
    platform: { type: String, enum: ['blinkit', 'zepto', 'instamart'], required: true },
    items: { type: [itemSchema], validate: (v) => v.length >= 1 && v.length <= 30 },
    subtotalPaise: { type: Number, default: null },
    observedFeesPaise: { type: Number, default: null },
    windowStart: { type: Date, required: true },
    windowEnd: { type: Date, required: true },
    hostel: { type: String, required: true, trim: true },
    block: { type: String, required: true, trim: true },
    floor: { type: String, required: true, trim: true },
    notes: { type: String, default: '', maxlength: 200 },
    source: { type: String, enum: ['manual', 'screenshot'], default: 'manual' },
    status: { type: String, enum: ['active', 'reserved', 'pooled', 'expired', 'cancelled'], default: 'active' },
    reservedBy: { type: String, default: null },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true, optimisticConcurrency: true },
)

intentSchema.index({ status: 1, platform: 1, hostel: 1, windowStart: 1 })
intentSchema.index({ userId: 1, status: 1 })
intentSchema.index({ isDemo: 1 })

module.exports = mongoose.model('ShoppingIntent', intentSchema)
