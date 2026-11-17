const ShoppingIntent = require('../models/ShoppingIntent')
const { env } = require('../config/env')
const { expireStale, toPlain } = require('./intentService')
const { getProfile } = require('./fees/feeService')
const { proposeGroup, intersectWindow } = require('./matching/matcher')
const { matchConfig } = require('./matchingService')
const { normalizeName } = require('./matching/similarity')

const DISCLAIMER = 'Observed cards are counts from real intent data. Heuristic cards are rules over live intents, not trained model predictions, and carry no accuracy claim.'

function localHour(date, offsetMinutes) {
  return new Date(new Date(date).getTime() + offsetMinutes * 60000).getUTCHours()
}

function hourLabel(h) {
  const suffix = h >= 12 ? 'PM' : 'AM'
  const twelve = h % 12 === 0 ? 12 : h % 12
  return `${twelve} ${suffix}`
}

async function summary(now = new Date()) {
  await expireStale(now)
  const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const docs = await ShoppingIntent.find({ createdAt: { $gte: since }, status: { $ne: 'cancelled' } }).limit(3000)

  const products = new Map()
  const byHour = Array.from({ length: 24 }, () => 0)
  for (const d of docs) {
    byHour[localHour(d.windowStart, env.tzOffsetMinutes)] += 1
    const seen = new Set()
    for (const item of d.items) {
      const key = normalizeName(item.name)
      if (!key || seen.has(key)) continue
      seen.add(key)
      const entry = products.get(key) || { name: item.name, intents: 0 }
      entry.intents += 1
      products.set(key, entry)
    }
  }
  const topProducts = [...products.values()].sort((a, b) => b.intents - a.intents || a.name.localeCompare(b.name)).slice(0, 8)

  const total = docs.length
  const peakCount = Math.max(...byHour)
  const peakHour = byHour.indexOf(peakCount)
  const peak = total > 0 && peakCount > 0
    ? { hour: peakHour, label: hourLabel(peakHour), intents: peakCount, message: `Most delivery windows start around ${hourLabel(peakHour)} (${peakCount} of ${total} intents in the last 30 days).`, kind: 'observed' }
    : null

  const active = docs.filter((d) => d.status === 'active' && d.windowEnd > now)
  const blockMap = new Map()
  for (const d of active) {
    const key = `${normalizeName(d.hostel)}|${normalizeName(d.block)}`
    const entry = blockMap.get(key) || { hostel: d.hostel, block: d.block, activeIntents: 0 }
    entry.activeIntents += 1
    blockMap.set(key, entry)
  }
  const blocks = [...blockMap.values()].sort((a, b) => b.activeIntents - a.activeIntents)

  const groups = new Map()
  for (const d of active) {
    const key = `${d.platform}|${normalizeName(d.hostel)}`
    groups.set(key, [...(groups.get(key) || []), toPlain(d)])
  }
  const opportunities = []
  const seenSets = new Set()
  for (const list of groups.values()) {
    if (list.length < 2) continue
    const profile = await getProfile(list[0].platform)
    for (const seed of list) {
      const result = proposeGroup({ seed, candidates: list.filter((x) => x.id !== seed.id), profile, config: matchConfig(), now })
      if (result.status !== 'pool') continue
      const idKey = result.members.map((m) => m.id).sort().join(',')
      if (seenSets.has(idKey)) continue
      seenSets.add(idKey)
      const mins = result.optimization.members.map((m) => m.savingsPaise)
      opportunities.push({
        kind: 'heuristic', platform: seed.platform, hostel: seed.hostel, students: result.members.length,
        windowMinutes: intersectWindow(result.members).minutes,
        minSavingsPaise: Math.min(...mins), maxSavingsPaise: Math.max(...mins),
        message: `${result.members.length} students on ${seed.platform} in ${seed.hostel} could pool within their shared window.`,
      })
    }
  }
  opportunities.sort((a, b) => b.students - a.students || b.minSavingsPaise - a.minSavingsPaise)

  return {
    totals: { intentsLast30Days: total, activeIntents: active.length },
    topProducts: topProducts.map((p) => ({ ...p, kind: 'observed' })),
    byHour: byHour.map((count, hour) => ({ hour, label: hourLabel(hour), count })),
    peak,
    blocks: blocks.map((b) => ({ ...b, kind: 'observed' })),
    opportunities,
    disclaimer: DISCLAIMER,
  }
}

module.exports = { summary, DISCLAIMER }
