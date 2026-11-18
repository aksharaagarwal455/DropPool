const { defaultCampusMap, walkMinutes, haversineMeters, normalizeHostelName } = require('../utils/distance')
const User = require('../models/User')
const { connectDatabase } = require('../config/db')

async function runCheck() {
  console.log('=== DropPool Campus Distance Check ===\n')

  const hostels = defaultCampusMap.hostels || []
  console.log(`Configured Hostels in campusMap.json (${hostels.length}):`)
  for (const h of hostels) {
    console.log(`  - ${h.name}: (${h.lat}, ${h.lng})`)
  }
  console.log(`\nWalk speed: ${defaultCampusMap.walkSpeedMetersPerMin || 80} m/min | Detour factor: ${defaultCampusMap.detourFactor || 1.3}`)

  console.log('\n--- Pairwise Walking Minutes ---')
  for (let i = 0; i < hostels.length; i++) {
    for (let j = i + 1; j < hostels.length; j++) {
      const a = hostels[i]
      const b = hostels[j]
      const mins = walkMinutes(a.name, b.name, defaultCampusMap)
      const meters = haversineMeters(a.lat, a.lng, b.lat, b.lng)
      console.log(`  ${a.name} <-> ${b.name}: ${mins} min walk (${meters} m straight-line)`)
    }
  }

  // Check database users' hostels if MongoDB is connected
  try {
    const db = await connectDatabase()
    if (db.status === 'connected') {
      const users = await User.find({}).select('hostel email name').lean()
      const configuredNames = new Set(hostels.map((h) => normalizeHostelName(h.name)))
      const missingHostels = new Map()

      for (const u of users) {
        if (!u.hostel) continue
        const norm = normalizeHostelName(u.hostel)
        if (!configuredNames.has(norm)) {
          missingHostels.set(norm, (missingHostels.get(norm) || 0) + 1)
        }
      }

      console.log('\n--- Registered Users Hostel Audit ---')
      if (missingHostels.size === 0) {
        console.log('✓ All registered user hostels are registered in campusMap.json.')
      } else {
        console.warn('⚠️ Found user hostels MISSING from campusMap.json (treated as isolated same-hostel zones):')
        for (const [name, count] of missingHostels.entries()) {
          console.warn(`  - "${name}": ${count} user(s)`)
        }
      }
    } else {
      console.log('\n(Database not connected. Skipping registered user hostel check.)')
    }
  } catch (err) {
    console.log(`\n(Database check skipped: ${err.message})`)
  }

  console.log('\nNOTE: If coordinates are (0,0), update server/src/config/campusMap.json with real Banasthali Vidyapeeth GPS coordinates.')
}

if (require.main === module) {
  runCheck()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err)
      process.exit(1)
    })
}

module.exports = { runCheck }
