const mongoose = require('mongoose')

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    hostel: { type: String, required: true, trim: true },
    block: { type: String, required: true, trim: true },
    floor: { type: String, required: true, trim: true },
    profileImage: { type: String, default: null },
    upiId: { type: String, default: null, select: false },
    role: { type: String, enum: ['student', 'admin'], default: 'student' },
    emailVerified: { type: Boolean, default: false },
    trust: {
      completedPools: { type: Number, default: 0 },
      cancelledPools: { type: Number, default: 0 },
    },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true },
)

userSchema.index({ hostel: 1, block: 1 })
userSchema.index({ isDemo: 1 })

module.exports = mongoose.model('User', userSchema)
