import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { Api, errorMessage, errorFallback } from '../lib/api'
import { formatPaise, rupeesToPaise } from '../lib/money'
import { formatDateTime } from '../lib/format'

function toLocalDatetimeInput(date) {
  const d = new Date(date)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function CreateIntentPage() {
  const { user, meta } = useAuth()
  const navigate = useNavigate()

  // Cart starts completely empty per Phase 3 requirements
  const [items, setItems] = useState([])
  const [platform, setPlatform] = useState('blinkit')

  // Delivery window: default now to now + 45 min
  const [windowStart, setWindowStart] = useState(() => toLocalDatetimeInput(Date.now()))
  const [windowEnd, setWindowEnd] = useState(() => toLocalDatetimeInput(Date.now() + 45 * 60000))
  const [windowError, setWindowError] = useState(null)

  // Hostel / location defaults from user profile with optional override
  const [hostel, setHostel] = useState(user?.hostel || 'Gargi Hostel')
  const [block, setBlock] = useState(user?.block || 'A')
  const [floor, setFloor] = useState(user?.floor || '2')

  // Screenshot and AI extraction states
  const [isScreenshotSource, setIsScreenshotSource] = useState(false)
  const [observedFeesPaise, setObservedFeesPaise] = useState(null)
  const [extractionWarnings, setExtractionWarnings] = useState([])
  const [extracting, setExtracting] = useState(false)
  const [screenshotName, setScreenshotName] = useState(null)

  // Solo fee estimation from GET /api/meta/fees
  const [estimatedFees, setEstimatedFees] = useState(null)
  const [loadingFees, setLoadingFees] = useState(false)

  // Submitting & status
  const [submitting, setSubmitting] = useState(false)
  const [pageError, setPageError] = useState(null)
  const [pageSuccess, setPageSuccess] = useState(null)

  // My active intents
  const [myIntents, setMyIntents] = useState([])
  const [loadingIntents, setLoadingIntents] = useState(false)
  const [editingIntentId, setEditingIntentId] = useState(null)
  const [editWindowStart, setEditWindowStart] = useState('')
  const [editWindowEnd, setEditWindowEnd] = useState('')

  // Modal for custom item addition
  const [showAddModal, setShowAddModal] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemQty, setNewItemQty] = useState(1)
  const [newItemPrice, setNewItemPrice] = useState('')

  const debounceTimer = useRef(null)

  // Fetch active intents
  const loadMyIntents = async () => {
    setLoadingIntents(true)
    try {
      const res = await Api.intents.mine()
      if (res?.intents) {
        setMyIntents(res.intents.filter((it) => it.status === 'active' || it.status === 'reserved'))
      }
    } catch {
      // Ignored
    } finally {
      setLoadingIntents(false)
    }
  }

  useEffect(() => {
    loadMyIntents()
  }, [])

  // Calculate items subtotal in integer paise
  const subtotalPaise = items.reduce((sum, it) => {
    const paise = rupeesToPaise(it.unitPrice)
    if (!paise || Number.isNaN(paise)) return sum
    return sum + paise * Number(it.qty || 1)
  }, 0)

  // Validate window whenever start or end changes
  useEffect(() => {
    if (!windowStart || !windowEnd) {
      setWindowError('Start and end times are required')
      return
    }
    const startMs = new Date(windowStart).getTime()
    const endMs = new Date(windowEnd).getTime()
    if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
      setWindowError('Invalid date/time')
      return
    }
    if (endMs <= startMs) {
      setWindowError('End time must be after start time')
      return
    }
    if (endMs - startMs > 24 * 3600 * 1000) {
      setWindowError('Delivery window cannot exceed 24 hours')
      return
    }
    setWindowError(null)
  }, [windowStart, windowEnd])

  // Call GET /api/meta/fees?platform=&subtotalPaise= (debounced)
  useEffect(() => {
    if (observedFeesPaise !== null) {
      // Screenshot observed fees override the illustrative fee profile
      setEstimatedFees(null)
      return
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current)

    debounceTimer.current = setTimeout(async () => {
      setLoadingFees(true)
      try {
        const data = await Api.metaFees(platform, subtotalPaise)
        setEstimatedFees(data)
      } catch {
        setEstimatedFees(null)
      } finally {
        setLoadingFees(false)
      }
    }, 250)

    return () => clearTimeout(debounceTimer.current)
  }, [platform, subtotalPaise, observedFeesPaise])

  // Custom Item addition
  const handleAddItem = (e) => {
    e.preventDefault()
    if (!newItemName.trim()) return
    const pricePaise = rupeesToPaise(newItemPrice)
    if (pricePaise === null || Number.isNaN(pricePaise) || pricePaise <= 0) {
      setPageError('Please enter a valid price in rupees')
      return
    }
    const qty = Math.min(50, Math.max(1, Number(newItemQty) || 1))

    setItems((prev) => [
      ...prev,
      {
        id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: newItemName.trim(),
        qty,
        unitPrice: newItemPrice,
        needsReview: false,
      },
    ])

    setNewItemName('')
    setNewItemPrice('')
    setNewItemQty(1)
    setShowAddModal(false)
    setPageError(null)
  }

  const updateItem = (id, field, value) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it
        const updated = { ...it, [field]: value }
        if (field === 'unitPrice' && value && rupeesToPaise(value) > 0) {
          updated.needsReview = false
        }
        return updated
      })
    )
  }

  const removeItem = (id) => {
    setItems((prev) => prev.filter((it) => it.id !== id))
  }

  // Handle Cart Screenshot Upload with Gemini AI
  const handleScreenshotUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setScreenshotName(file.name)
    setExtracting(true)
    setPageError(null)
    setExtractionWarnings([])

    try {
      const reader = new FileReader()
      reader.onloadend = async () => {
        try {
          const base64Data = reader.result.split(',')[1]
          const res = await Api.extract({ imageBase64: base64Data, mimeType: file.type })
          const ext = res?.extraction

          if (ext) {
            // Per requirement: REPLACE cart with extracted items
            const extractedItems = (ext.items || []).map((it, idx) => {
              const hasPrice = it.unitPricePaise !== null && it.unitPricePaise !== undefined
              return {
                id: `ext_${idx}_${Date.now()}`,
                name: it.name || 'Unnamed item',
                qty: Math.min(50, Math.max(1, it.qty || 1)),
                unitPrice: hasPrice ? (it.unitPricePaise / 100).toFixed(2) : '',
                needsReview: !hasPrice,
              }
            })

            setItems(extractedItems)
            setIsScreenshotSource(true)

            if (ext.platform && ['blinkit', 'zepto', 'instamart'].includes(ext.platform)) {
              setPlatform(ext.platform)
            }

            if (ext.observedFeesPaise !== null && ext.observedFeesPaise !== undefined) {
              setObservedFeesPaise(ext.observedFeesPaise)
            }

            if (ext.warnings?.length) {
              setExtractionWarnings(ext.warnings)
            }
          }
        } catch (err) {
          const fallback = errorFallback(err)
          const msg = errorMessage(err)
          if (fallback === 'manual') {
            setPageError(`${msg}. Please enter your cart items manually below.`)
          } else {
            setPageError(msg)
          }
        } finally {
          setExtracting(false)
        }
      }
      reader.readAsDataURL(file)
    } catch {
      setExtracting(false)
      setPageError('Failed to read image file')
    }
  }

  // Validate and submit intent
  const handleSubmitIntent = async () => {
    setPageError(null)

    if (items.length === 0) {
      setPageError('Your cart is empty. Add at least one item before matching.')
      return
    }

    if (windowError) {
      setPageError(windowError)
      return
    }

    // Check if every item has a valid name and price
    for (const it of items) {
      if (!it.name.trim()) {
        setPageError('Every item must have a name')
        return
      }
      const pricePaise = rupeesToPaise(it.unitPrice)
      if (pricePaise === null || Number.isNaN(pricePaise) || pricePaise <= 0) {
        setPageError(`Please enter a valid price for "${it.name}"`)
        return
      }
      if (!Number.isInteger(Number(it.qty)) || it.qty < 1 || it.qty > 50) {
        setPageError(`Quantity for "${it.name}" must be between 1 and 50`)
        return
      }
    }

    setSubmitting(true)
    try {
      const payload = {
        platform,
        items: items.map((it) => ({
          name: it.name.trim(),
          qty: Number(it.qty),
          unitPricePaise: rupeesToPaise(it.unitPrice),
        })),
        windowStart: new Date(windowStart).toISOString(),
        windowEnd: new Date(windowEnd).toISOString(),
        hostel: hostel.trim(),
        block: block.trim(),
        floor: floor.trim(),
        observedFeesPaise: isScreenshotSource ? observedFeesPaise : null,
        source: isScreenshotSource ? 'screenshot' : 'manual',
      }

      const res = await Api.intents.create(payload)
      if (res?.intent) {
        navigate(`/matches?intent=${res.intent.id}`)
      } else {
        setPageError('Could not create intent. Server returned unexpected response.')
      }
    } catch (err) {
      setPageError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  // Cancel an active intent
  const handleCancelIntent = async (id) => {
    if (!window.confirm('Cancel this shopping intent?')) return
    try {
      await Api.intents.cancel(id)
      setPageSuccess('Intent cancelled successfully')
      loadMyIntents()
    } catch (err) {
      setPageError(errorMessage(err))
    }
  }

  // Edit window
  const handleSaveEditWindow = async (id) => {
    try {
      await Api.intents.update(id, {
        windowStart: new Date(editWindowStart).toISOString(),
        windowEnd: new Date(editWindowEnd).toISOString(),
      })
      setEditingIntentId(null)
      setPageSuccess('Delivery window updated')
      loadMyIntents()
    } catch (err) {
      setPageError(errorMessage(err))
    }
  }

  // Calculated solo total
  const soloFeesPaise = observedFeesPaise !== null ? observedFeesPaise : (estimatedFees?.feesPaise || 0)
  const soloTotalPaise = subtotalPaise + soloFeesPaise

  return (
    <Layout meta={meta}>
      {/* Eyebrow */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#15803D]">
          01 / Create shopping intent
        </p>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]">
          Demand Intelligence Step 1 of 7
        </span>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0F3D1E] tracking-tight">
          Start with your cart. <span className="highlight-lime">Find your pool.</span>
        </h1>
        <p className="mt-2 text-sm sm:text-base text-[#475569]">
          Tell us what you plan to order. We match you with nearby students and recommend a pool only when everyone saves.
        </p>
      </div>

      {pageError && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs sm:text-sm text-rose-800 flex items-center justify-between">
          <span>{pageError}</span>
          <button onClick={() => setPageError(null)} className="font-bold ml-2">✕</button>
        </div>
      )}

      {pageSuccess && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs sm:text-sm text-emerald-800 flex items-center justify-between">
          <span>{pageSuccess}</span>
          <button onClick={() => setPageSuccess(null)} className="font-bold ml-2">✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Cart items & AI Extraction */}
        <div className="lg:col-span-7 space-y-6">
          {/* AI Screenshot Extraction Box */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E2EBDD] shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#F0FDF4] text-[#15803D] flex items-center justify-center font-bold">
                  ⚡
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#0F3D1E]">Extract cart from screenshot</h2>
                  <p className="text-[11px] text-[#64748B]">Gemini AI reads items, quantities, and platform charges</p>
                </div>
              </div>

              {meta?.geminiConfigured ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#ECFCCB] text-[#3F6212]">
                  Gemini Active
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  Manual Entry Only
                </span>
              )}
            </div>

            {meta?.geminiConfigured ? (
              <div className="mt-4 rounded-2xl border-2 border-dashed border-[#BBF7D0] p-4 bg-[#F8FAF6] flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-[#E2EBDD] text-[#15803D] flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#0F3D1E]">
                      {screenshotName || 'Upload checkout screenshot'}
                    </p>
                    <p className="text-[11px] text-[#64748B]">
                      {extracting ? 'Gemini AI parsing items and fees…' : 'PNG, JPG · Replaces cart with detected items'}
                    </p>
                  </div>
                </div>

                <label className="cursor-pointer px-4 py-2 rounded-xl text-xs font-bold bg-[#0F3D1E] hover:bg-[#165a2d] text-white transition-colors shrink-0">
                  <span>{extracting ? 'Processing…' : 'Choose File'}</span>
                  <input
                    type="file"
                    disabled={extracting}
                    accept="image/png,image/jpeg"
                    onChange={handleScreenshotUpload}
                    className="hidden"
                  />
                </label>
              </div>
            ) : (
              <p className="mt-3 text-xs text-[#64748B] bg-amber-50/50 p-3 rounded-xl border border-amber-100">
                AI cart extraction is not configured with a Gemini API key on the server. Please enter your cart items manually below.
              </p>
            )}

            {/* Warnings from extraction */}
            {extractionWarnings.length > 0 && (
              <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                <p className="font-bold mb-1">Extraction notices:</p>
                <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                  {extractionWarnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Cart Items Table */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E2EBDD] shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-[#0F3D1E]">What's in your cart?</h2>
                <p className="text-xs text-[#64748B]">Your items stay yours. Only the platform fees are shared.</p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#F0FDF4] text-[#15803D] hover:bg-[#DCFCE7] border border-[#BBF7D0] transition-colors"
              >
                + Add Item
              </button>
            </div>

            {/* Inline Add Item Form / Modal */}
            {showAddModal && (
              <form onSubmit={handleAddItem} className="mb-6 p-4 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0]">
                <p className="text-xs font-bold text-[#0F3D1E] mb-3">Add item to cart</p>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-6">
                    <label className="block text-[10px] font-bold uppercase text-[#475569] mb-1">Item Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Britannia Bread 400g"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      className="w-full bg-white border border-[#E2EBDD] rounded-xl px-3 py-2 text-xs text-[#0F3D1E] focus:outline-none focus:border-[#84CC16]"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-bold uppercase text-[#475569] mb-1">Quantity</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={50}
                      value={newItemQty}
                      onChange={(e) => setNewItemQty(e.target.value)}
                      className="w-full bg-white border border-[#E2EBDD] rounded-xl px-3 py-2 text-xs text-[#0F3D1E] focus:outline-none focus:border-[#84CC16]"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-bold uppercase text-[#475569] mb-1">Unit Price (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="e.g. 50"
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(e.target.value)}
                      className="w-full bg-white border border-[#E2EBDD] rounded-xl px-3 py-2 text-xs text-[#0F3D1E] focus:outline-none focus:border-[#84CC16]"
                    />
                  </div>
                </div>

                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-bold bg-[#0F3D1E] text-white rounded-lg hover:bg-[#165a2d]"
                  >
                    Add to Cart
                  </button>
                </div>
              </form>
            )}

            {/* Empty Cart State */}
            {items.length === 0 ? (
              <div className="py-12 text-center rounded-2xl border border-dashed border-[#E2EBDD] bg-[#F8FAF6]">
                <div className="w-12 h-12 mx-auto rounded-full bg-[#ECFCCB] text-[#3F6212] flex items-center justify-center text-xl mb-3">
                  🛒
                </div>
                <p className="text-sm font-bold text-[#0F3D1E]">Your cart is currently empty</p>
                <p className="text-xs text-[#64748B] mt-1 max-w-sm mx-auto">
                  Click "+ Add Item" above or upload your platform checkout screenshot to get started.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                <div className="grid grid-cols-12 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] pb-2">
                  <span className="col-span-6">Product</span>
                  <span className="col-span-2 text-center">Qty</span>
                  <span className="col-span-3 text-right">Unit Price (₹)</span>
                  <span className="col-span-1 text-right"></span>
                </div>

                {items.map((item) => (
                  <div key={item.id} className="py-3.5 grid grid-cols-12 items-center text-xs">
                    <div className="col-span-6 pr-2">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                        className="w-full font-semibold text-[#0F3D1E] bg-transparent border-b border-transparent hover:border-gray-300 focus:border-[#84CC16] focus:outline-none py-1"
                      />
                      {item.needsReview && (
                        <span className="inline-block text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded mt-0.5">
                          ⚠️ Price required
                        </span>
                      )}
                    </div>

                    <div className="col-span-2 text-center">
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={item.qty}
                        onChange={(e) => updateItem(item.id, 'qty', Math.max(1, Math.min(50, Number(e.target.value))))}
                        className="w-12 text-center font-bold bg-[#F8FAF6] border border-[#E2EBDD] rounded-lg py-1 focus:outline-none focus:border-[#84CC16]"
                      />
                    </div>

                    <div className="col-span-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <span className="text-gray-400">₹</span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(item.id, 'unitPrice', e.target.value)}
                          className={`w-20 text-right font-bold rounded-lg py-1 px-2 border focus:outline-none ${item.needsReview
                              ? 'border-amber-400 bg-amber-50'
                              : 'border-[#E2EBDD] bg-[#F8FAF6] focus:border-[#84CC16]'
                            }`}
                        />
                      </div>
                    </div>

                    <div className="col-span-1 text-right">
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-gray-400 hover:text-rose-600 transition-colors font-bold p-1"
                        aria-label="Remove item"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}

                {/* Subtotal row */}
                <div className="pt-4 flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#64748B]">{items.length} items in cart</span>
                  <div className="flex items-baseline gap-3">
                    <span className="text-xs text-[#64748B]">Cart subtotal:</span>
                    <span className="text-xl font-extrabold text-[#0F3D1E]">{formatPaise(subtotalPaise)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Solo Order Fee Estimation Card */}
          <div className="bg-[#F0FDF4] rounded-3xl p-6 sm:p-7 border border-[#BBF7D0]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-bold text-[#0F3D1E]">If you order alone</p>
                <p className="text-xs text-[#475569] mt-0.5">
                  Products {formatPaise(subtotalPaise)} + Delivery & platform fees {formatPaise(soloFeesPaise)}
                </p>
                <p className="text-[10px] text-[#65A30D] font-semibold mt-1">
                  {observedFeesPaise !== null
                    ? '• Observed from screenshot charges'
                    : loadingFees
                      ? 'Calculating fees…'
                      : '• Calculated via platform illustrative fee rules'}
                </p>
              </div>

              <div className="text-right">
                <span className="text-3xl font-extrabold text-[#0F3D1E]">{formatPaise(soloTotalPaise)}</span>
                <p className="text-[10px] text-[#64748B]">estimated payable</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Platform, Window, Location & Submit */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E2EBDD] shadow-xs">
            <h2 className="text-lg font-bold text-[#0F3D1E] mb-5">Pool Match Parameters</h2>

            <div className="space-y-4">
              {/* Shopping Platform */}
              <div>
                <label className="block text-xs font-bold text-[#0F3D1E] mb-1.5">
                  Shopping Platform
                </label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full bg-[#F8FAF6] border border-[#E2EBDD] rounded-xl px-4 py-3 text-sm font-semibold text-[#0F3D1E] focus:outline-none focus:border-[#84CC16]"
                >
                  <option value="blinkit">Blinkit</option>
                  <option value="zepto">Zepto</option>
                  <option value="instamart">Swiggy Instamart</option>
                </select>
                <p className="text-[11px] text-[#64748B] mt-1">Students must order on the same platform to pool.</p>
              </div>

              {/* Delivery Window (Pickers validated <= 24h) */}
              <div className="p-4 rounded-2xl bg-[#F8FAF6] border border-[#E2EBDD]">
                <label className="block text-xs font-bold text-[#0F3D1E] mb-2">
                  Delivery Window
                </label>

                <div className="space-y-2">
                  <div>
                    <span className="block text-[10px] font-bold uppercase text-[#64748B] mb-0.5">Start Time</span>
                    <input
                      type="datetime-local"
                      value={windowStart}
                      onChange={(e) => setWindowStart(e.target.value)}
                      className="w-full bg-white border border-[#E2EBDD] rounded-lg px-3 py-2 text-xs font-medium text-[#0F3D1E] focus:outline-none focus:border-[#84CC16]"
                    />
                  </div>

                  <div>
                    <span className="block text-[10px] font-bold uppercase text-[#64748B] mb-0.5">End Time</span>
                    <input
                      type="datetime-local"
                      value={windowEnd}
                      onChange={(e) => setWindowEnd(e.target.value)}
                      className="w-full bg-white border border-[#E2EBDD] rounded-lg px-3 py-2 text-xs font-medium text-[#0F3D1E] focus:outline-none focus:border-[#84CC16]"
                    />
                  </div>
                </div>

                {windowError ? (
                  <p className="text-[11px] text-rose-600 font-bold mt-2">{windowError}</p>
                ) : (
                  <p className="text-[10px] text-[#64748B] mt-2">
                    Default is next 45 min. Must end after start and span at most 24h.
                  </p>
                )}
              </div>

              {/* Hostel / Block / Floor with overrides */}
              <div className="p-4 rounded-2xl bg-[#F8FAF6] border border-[#E2EBDD]">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-[#0F3D1E]">Hostel Pickup Location</label>
                  <span className="text-[10px] text-[#15803D] font-bold bg-[#ECFCCB] px-2 py-0.5 rounded">Profile Default</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="block text-[10px] text-[#64748B]">Hostel</span>
                    <select
                      value={hostel}
                      onChange={(e) => setHostel(e.target.value)}
                      className="w-full bg-white border border-[#E2EBDD] rounded-lg px-3 py-2 font-medium text-[#0F3D1E] focus:outline-none focus:border-[#84CC16]"
                    >
                      {(meta?.hostels?.length ? meta.hostels : ['Gargi Hostel', 'Maitreyi Hostel', 'Shri Shanta Nilaya', 'Kasturba Hostel', 'Vaidehi Hostel']).map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="block text-[10px] text-[#64748B]">Block</span>
                      <input
                        type="text"
                        value={block}
                        onChange={(e) => setBlock(e.target.value)}
                        className="w-full bg-white border border-[#E2EBDD] rounded-lg px-3 py-2 font-medium text-[#0F3D1E] focus:outline-none focus:border-[#84CC16]"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#64748B]">Floor</span>
                      <input
                        type="text"
                        value={floor}
                        onChange={(e) => setFloor(e.target.value)}
                        className="w-full bg-white border border-[#E2EBDD] rounded-lg px-3 py-2 font-medium text-[#0F3D1E] focus:outline-none focus:border-[#84CC16]"
                      />
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-[#475569] mt-2 pt-2 border-t border-gray-200">
                  ℹ️ Matching strictly pairs students within the same hostel and time window (enforced by server).
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <div className="mt-6">
              <button
                type="button"
                onClick={handleSubmitIntent}
                disabled={submitting || items.length === 0 || !!windowError}
                className="w-full inline-flex items-center justify-center px-6 py-4 rounded-2xl bg-[#0F3D1E] hover:bg-[#165a2d] text-white text-sm font-bold shadow-xs transition-all disabled:opacity-50"
              >
                <span>{submitting ? 'Creating Intent on Server…' : 'Find Compatible Students'}</span>
                <span className="ml-2 font-bold text-base">→</span>
              </button>
              <p className="text-center text-[11px] text-[#64748B] mt-2">
                Creates an active intent and executes the server matching algorithm.
              </p>
            </div>
          </div>

          {/* My Active Intents Section */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E2EBDD] shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-[#0F3D1E]">My Active Intents</h3>
              <button
                onClick={loadMyIntents}
                className="text-[11px] text-[#15803D] hover:underline font-bold"
              >
                Refresh
              </button>
            </div>

            {loadingIntents ? (
              <p className="text-xs text-gray-500 py-3">Loading active intents…</p>
            ) : myIntents.length === 0 ? (
              <p className="text-xs text-[#64748B] py-3">No other active intents. Create one above to begin matching!</p>
            ) : (
              <div className="space-y-3">
                {myIntents.map((it) => (
                  <div key={it.id} className="p-3.5 rounded-2xl bg-[#F8FAF6] border border-[#E2EBDD] text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#0F3D1E] uppercase tracking-wide">
                        {it.platform} · {formatPaise(it.subtotalPaise)}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ECFCCB] text-[#3F6212]">
                        {it.status}
                      </span>
                    </div>

                    <p className="text-[11px] text-[#475569] mt-1">
                      {it.items?.length} items ({it.items?.map((x) => x.name).slice(0, 2).join(', ')}…)
                    </p>
                    <p className="text-[10px] text-[#64748B] mt-0.5">
                      Window: {formatDateTime(it.windowStart)} – {formatDateTime(it.windowEnd)}
                    </p>

                    {/* Window Edit Form */}
                    {editingIntentId === it.id ? (
                      <div className="mt-3 pt-2 border-t border-gray-200 space-y-2">
                        <input
                          type="datetime-local"
                          value={editWindowStart}
                          onChange={(e) => setEditWindowStart(e.target.value)}
                          className="w-full bg-white border rounded px-2 py-1 text-[11px]"
                        />
                        <input
                          type="datetime-local"
                          value={editWindowEnd}
                          onChange={(e) => setEditWindowEnd(e.target.value)}
                          className="w-full bg-white border rounded px-2 py-1 text-[11px]"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingIntentId(null)}
                            className="px-2 py-1 text-[10px] text-gray-500"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveEditWindow(it.id)}
                            className="px-2.5 py-1 text-[10px] font-bold bg-[#0F3D1E] text-white rounded"
                          >
                            Save Window
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 pt-2 border-t border-gray-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingIntentId(it.id)
                              setEditWindowStart(toLocalDatetimeInput(it.windowStart))
                              setEditWindowEnd(toLocalDatetimeInput(it.windowEnd))
                            }}
                            className="text-[10px] font-bold text-gray-600 hover:text-black"
                          >
                            Edit Window
                          </button>
                          <span>·</span>
                          <button
                            type="button"
                            onClick={() => handleCancelIntent(it.id)}
                            className="text-[10px] font-bold text-rose-600 hover:underline"
                          >
                            Cancel
                          </button>
                        </div>

                        <Link
                          to={`/matches?intent=${it.id}`}
                          className="text-[11px] font-bold text-[#15803D] hover:underline"
                        >
                          Run matching →
                        </Link>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
