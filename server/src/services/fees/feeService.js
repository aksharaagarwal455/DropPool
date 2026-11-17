const FeeProfile = require('../../models/FeeProfile')
const { DEFAULT_PROFILES, PLATFORMS } = require('./defaultProfiles')
const { validateProfile } = require('./feeRules')
const { AppError } = require('../../middleware/errorHandler')

function stripDoc(doc) {
  const { _id, __v, createdAt, updatedAt, updatedBy, ...rest } = doc
  return rest
}

async function getProfile(platform) {
  if (!PLATFORMS.includes(platform)) return null
  const doc = await FeeProfile.findOne({ platform }).lean()
  if (doc) return { ...stripDoc(doc), updatedAt: doc.updatedAt }
  return { ...DEFAULT_PROFILES[platform], version: 0, isIllustrative: true }
}

async function listProfiles() {
  return Promise.all(PLATFORMS.map(getProfile))
}

async function updateProfile(platform, fields, adminId) {
  if (!PLATFORMS.includes(platform)) throw new AppError('Unknown platform', 404)
  const current = await getProfile(platform)
  const next = { ...current }
  for (const key of ['deliveryFeePaise', 'freeDeliveryAbovePaise', 'handlingFeePaise', 'smallCartFeePaise', 'smallCartBelowPaise', 'otherFeePaise']) {
    if (fields[key] !== undefined) next[key] = fields[key]
  }
  const problem = validateProfile(next)
  if (problem) throw new AppError(problem, 422)
  const saved = await FeeProfile.findOneAndUpdate(
    { platform },
    { $set: { ...next, platform, version: (current.version || 0) + 1, isIllustrative: false, updatedBy: adminId } },
    { upsert: true, returnDocument: 'after', lean: true },
  )
  return { ...stripDoc(saved), updatedAt: saved.updatedAt }
}

module.exports = { getProfile, listProfiles, updateProfile }
