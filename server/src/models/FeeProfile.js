const mongoose = require('mongoose')

const paise = { type: Number, required: true, min: 0, validate: Number.isInteger }
const optionalPaise = { type: Number, default: null, min: 0, validate: { validator: (v) => v === null || Number.isInteger(v) } }

const feeProfileSchema = new mongoose.Schema(
  {
    platform: { type: String, enum: ['blinkit', 'zepto', 'instamart'], required: true },
    version: { type: Number, required: true, default: 1 },
    deliveryFeePaise: paise,
    freeDeliveryAbovePaise: optionalPaise,
    handlingFeePaise: paise,
    smallCartFeePaise: paise,
    smallCartBelowPaise: optionalPaise,
    otherFeePaise: paise,
    isIllustrative: { type: Boolean, default: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
)

feeProfileSchema.index({ platform: 1 }, { unique: true })

module.exports = mongoose.model('FeeProfile', feeProfileSchema)
