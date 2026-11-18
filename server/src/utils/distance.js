const fs = require('fs')
const path = require('path')

let defaultCampusMap
try {
  defaultCampusMap = require('../config/campusMap.json')
} catch {
  defaultCampusMap = {
    hostels: [],
    walkSpeedMetersPerMin: 80,
    detourFactor: 1.3,
  }
}

const loggedMissingHostels = new Set()

function normalizeHostelName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+hostel$/, '')
    .replace(/\s+bhawan$/, '')
    .trim()
}

function warnMissingHostel(name) {
  const norm = normalizeHostelName(name)
  if (!norm || loggedMissingHostels.has(norm)) return
  loggedMissingHostels.add(norm)
  console.warn(`[CampusMap] Hostel "${name}" is missing from campusMap.json. Isolated zone: same-hostel matching only.`)
}

function getCampusHostels(map = defaultCampusMap) {
  return (map.hostels || []).map((h) => h.name)
}

function findHostelEntry(name, map = defaultCampusMap) {
  const norm = normalizeHostelName(name)
  if (!norm) return null
  const entry = (map.hostels || []).find((h) => normalizeHostelName(h.name) === norm)
  if (!entry) {
    warnMissingHostel(name)
    return null
  }
  return entry
}

/**
 * Standard Haversine distance in meters between two lat/lng points.
 */
function haversineMeters(lat1, lon1, lat2, lon2) {
  if (lat1 === lat2 && lon1 === lon2) return 0
  const R = 6371000 // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c)
}

/**
 * Walking minutes between two hostels (or locations).
 * Kept behind this single function so OSRM or a distance matrix can replace it later.
 */
function walkMinutes(a, b, map = defaultCampusMap) {
  const nameA = typeof a === 'string' ? a : a?.hostel || a?.name || ''
  const nameB = typeof b === 'string' ? b : b?.hostel || b?.name || ''

  const normA = normalizeHostelName(nameA)
  const normB = normalizeHostelName(nameB)

  if (!normA || !normB) return Infinity
  if (normA === normB) return 0

  const entryA = findHostelEntry(nameA, map)
  const entryB = findHostelEntry(nameB, map)

  if (!entryA || !entryB) return Infinity

  const meters = haversineMeters(entryA.lat, entryA.lng, entryB.lat, entryB.lng)
  const walkSpeed = Number(map.walkSpeedMetersPerMin) || 80
  const detour = Number(map.detourFactor) || 1.3

  return Math.round((meters * detour) / walkSpeed)
}

/**
 * Proximity tier between two intents or users:
 * 0: same floor
 * 1: same block
 * 2: same hostel
 * 3: nearby hostel (walkMinutes <= nearMin)
 * 4: campus-wide (only if enableCampusWide === true)
 * null: not eligible / too far
 */
function proximityTier(a, b, options = {}) {
  const clean = (val) => String(val || '').trim().toLowerCase()
  const hostelA = clean(a?.hostel)
  const hostelB = clean(b?.hostel)

  if (!hostelA || !hostelB) return null

  // Same hostel comparison
  if (hostelA === hostelB) {
    const blockA = clean(a?.block)
    const blockB = clean(b?.block)
    if (blockA && blockB && blockA === blockB) {
      const floorA = clean(a?.floor)
      const floorB = clean(b?.floor)
      if (floorA && floorB && floorA === floorB) {
        return 0
      }
      return 1
    }
    return 2
  }

  // Cross-hostel comparison
  const nearMin = typeof options.nearMin === 'number' ? options.nearMin : 7
  const enableCampusWide = Boolean(options.enableCampusWide)
  const maxTier = typeof options.maxProximityTier === 'number' ? options.maxProximityTier : 3

  const walk = walkMinutes(a?.hostel, b?.hostel)
  if (walk <= nearMin && maxTier >= 3) {
    return 3
  }

  if (enableCampusWide && maxTier >= 4 && Number.isFinite(walk)) {
    return 4
  }

  return null
}

function proximityLabel(tier, minutes = 0) {
  switch (tier) {
    case 0:
      return 'same floor'
    case 1:
      return 'same block'
    case 2:
      return 'same hostel'
    case 3:
      return minutes > 0 ? `${minutes} min walk` : 'nearby hostel'
    case 4:
      return minutes > 0 ? `${minutes} min walk (campus-wide)` : 'campus-wide'
    default:
      return 'different hostel'
  }
}

module.exports = {
  haversineMeters,
  walkMinutes,
  proximityTier,
  proximityLabel,
  findHostelEntry,
  getCampusHostels,
  normalizeHostelName,
  defaultCampusMap,
  loggedMissingHostels,
}
