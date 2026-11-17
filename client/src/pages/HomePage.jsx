import { useEffect, useState } from 'react'
import { getHealth } from '../lib/api'

export default function HomePage() {
  const [health, setHealth] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    getHealth()
      .then((data) => {
        if (!cancelled) setHealth(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Health check failed')
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="min-h-screen bg-stone-50 text-stone-900">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
        <p className="text-sm font-semibold tracking-wide text-teal-800">DropPool</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Foundation is running</h1>
        <p className="mt-3 text-base leading-relaxed text-stone-600">
          Predict demand. Match students. Optimize savings. This screen only checks that the
          client can reach the API. Registration, matching, and cost comparison are not built yet.
        </p>

        <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm" aria-live="polite">
          <h2 className="text-sm font-medium text-stone-500">API health</h2>
          {error ? (
            <p className="mt-3 text-sm text-red-800">{error}</p>
          ) : health ? (
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-stone-500">Service</dt>
                <dd className="font-medium">{health.service}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-stone-500">Status</dt>
                <dd className="font-medium">{health.status}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-stone-500">Database</dt>
                <dd className="font-medium">{health.database?.status}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-stone-500">Gemini configured</dt>
                <dd className="font-medium">{health.geminiConfigured ? 'Yes' : 'No'}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-3 text-sm text-stone-500">Checking the API…</p>
          )}
        </section>
      </div>
    </main>
  )
}
