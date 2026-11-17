const mongoose = require('mongoose')
const { POOL_STATUSES } = require('../services/orders/transitions')

const memberItem = new mongoose.Schema({ name: String, qty: Number, unitPricePaise: Number }, { _id: false })

const memberSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    intentId: { type: mongoose.Schema.Types.ObjectId, ref: 'ShoppingIntent', required: true },
    name: { type: String, required: true },
    hostel: String,
    block: String,
    floor: String,
    items: [memberItem],
    subtotalPaise: { type: Number, required: true },
    observedFeesPaise: { type: Number, default: null },
    confirmed: { type: Boolean, default: false },
    estimatedSharePaise: { type: Number, required: true },
    finalSharePaise: { type: Number, default: null },
  },
  { _id: false },
)

const poolSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    hostUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    platform: { type: String, enum: ['blinkit', 'zepto', 'instamart'], required: true },
    hostel: { type: String, required: true },
    block: { type: String, required: true },
    status: { type: String, enum: POOL_STATUSES, default: 'proposed' },
    members: { type: [memberSchema], default: [] },
    allocation: { type: String, enum: ['proportional', 'equal'], default: 'proportional' },
    feeProfileSnapshot: { type: mongoose.Schema.Types.Mixed, required: true },
    optimization: { type: mongoose.Schema.Types.Mixed, required: true },
    actualTotalPaise: { type: Number, default: null },
    extraChargesPaise: { type: Number, default: null },
    pickup: { location: { type: String, default: '' }, eta: { type: Date, default: null } },
    history: [{ status: String, at: Date, by: mongoose.Schema.Types.ObjectId, note: String, _id: false }],
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true, optimisticConcurrency: true },
)

poolSchema.index({ 'members.userId': 1, status: 1 })
poolSchema.index({ isDemo: 1 })

module.exports = mongoose.model('Pool', poolSchema)
