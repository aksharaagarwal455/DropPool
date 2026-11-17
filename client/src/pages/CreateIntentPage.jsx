import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { usePool } from '../context/PoolContext'
import { Api, errorMessage } from '../lib/api'
import { useAuth } from '../context/AuthContext'

export default function CreateIntentPage() {
  const {
    items,
    platform,
    setPlatform,
    hostel,
    setHostel,
    deliveryWindow,
    setDeliveryWindow,
    sameHostelOnly,
    setSameHostelOnly,
    itemsSubtotal,
    soloEstimatedFees,
    soloTotal,
    updateItemQuantity,
    addItem,
    submitIntent,
  } = usePool()

  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemPrice, setNewItemPrice] = useState('')
  const [newItemCat, setNewItemCat] = useState('Dairy')
  const [extracting, setExtracting] = useState(false)
  const [screenshotName, setScreenshotName] = useState(null)

  const handleAddNewItem = (e) => {
    e.preventDefault()
    if (!newItemName || !newItemPrice) return
    addItem(newItemName, Number(newItemPrice), newItemCat, '1 unit')
    setNewItemName('')
    setNewItemPrice('')
    setShowAddModal(false)
  }

  const handleScreenshotUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setScreenshotName(file.name)

    if (isAuthenticated) {
      setExtracting(true)
      setError(null)
      try {
        const reader = new FileReader()
        reader.onloadend = async () => {
          try {
            const base64Data = reader.result.split(',')[1]
            const res = await Api.extract({ imageBase64: base64Data, mimeType: file.type })
            if (res?.extraction?.items?.length) {
              res.extraction.items.forEach((it) => {
                addItem(it.name, (it.unitPricePaise || 5000) / 100, 'Scanned', `${it.qty || 1} unit`)
              })
            }
          } catch (err) {
            setError(errorMessage(err))
          } finally {
            setExtracting(false)
          }
        }
        reader.readAsDataURL(file)
      } catch {
        setExtracting(false)
      }
    }
  }

  const handleFindStudents = async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      const res = await submitIntent()
      if (res.success) {
        navigate('/matches')
      } else {
        setError(res.error || 'Failed to submit shopping intent')
      }
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Layout>
      {/* Eyebrow & Top Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#4F46E5]">
          01 / Your shopping intent
        </p>
        <span className="inline-flex self-start sm:self-auto items-center px-3 py-1 rounded-full text-xs font-medium bg-[#EEF2FF] text-[#4F46E5] border border-[#E0E7FF]">
          Demo setup · prefilled example
        </span>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">
          Start with your cart. Find your people.
        </h1>
        <p className="mt-2 text-sm sm:text-base text-[#64748B]">
          Tell us what you need. We'll show a pool only when the numbers work for everyone.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 font-bold ml-2">✕</button>
        </div>
      )}

      {/* Main Grid: Left (Items + Screenshot + Solo cost) & Right (Platform + Hostel + Time + CTA) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (What's in your cart?) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#F1E8E2] shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-[#0F172A]">What's in your cart?</h2>
              <button
                onClick={() => setShowAddModal(!showAddModal)}
                className="text-xs font-semibold text-[#4F46E5] hover:text-[#4338CA] transition-colors"
              >
                + Add item
              </button>
            </div>
            <p className="text-xs text-[#64748B] mb-6">
              Your items stay yours. Only the fees are shared.
            </p>

            {/* Quick add modal/inline form */}
            {showAddModal && (
              <form onSubmit={handleAddNewItem} className="mb-6 p-4 bg-[#FFF9F5] rounded-2xl border border-[#F1E8E2]">
                <p className="text-xs font-bold text-[#0F172A] mb-3">Add Custom Item</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Item name (e.g. Eggs)"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-[#4F46E5]"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Price ₹"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    className="px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-[#4F46E5]"
                    required
                  />
                  <select
                    value={newItemCat}
                    onChange={(e) => setNewItemCat(e.target.value)}
                    className="px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-[#4F46E5]"
                  >
                    <option value="Dairy">Dairy</option>
                    <option value="Bakery">Bakery</option>
                    <option value="Snacks">Snacks</option>
                    <option value="Instant Food">Instant Food</option>
                    <option value="General">General</option>
                  </select>
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
                    className="px-4 py-1.5 text-xs bg-[#4F46E5] text-white font-medium rounded-lg hover:bg-[#4338CA]"
                  >
                    Add to Cart
                  </button>
                </div>
              </form>
            )}

            {/* Table Header */}
            <div className="grid grid-cols-12 text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] border-b border-gray-100 pb-3 mb-4">
              <span className="col-span-6 sm:col-span-7">Product</span>
              <span className="col-span-3 sm:col-span-3 text-center">Quantity</span>
              <span className="col-span-3 sm:col-span-2 text-right">Price</span>
            </div>

            {/* Items List */}
            <div className="divide-y divide-gray-100">
              {items.map((item) => (
                <div key={item.id} className="py-4 grid grid-cols-12 items-center">
                  {/* Product Details with Icon */}
                  <div className="col-span-6 sm:col-span-7 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center shrink-0">
                      {item.icon === 'milk' ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      ) : item.icon === 'bread' ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M5 8h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2v-8a2 2 0 012-2z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#0F172A]">{item.name}</p>
                      <p className="text-xs text-[#64748B]">
                        {item.quantityText} · {item.category}
                      </p>
                    </div>
                  </div>

                  {/* Quantity Controller [ - ] qty [ + ] */}
                  <div className="col-span-3 sm:col-span-3 flex justify-center">
                    <div className="inline-flex items-center bg-[#F8FAFC] rounded-full border border-gray-200 px-2 py-1 gap-2">
                      <button
                        onClick={() => updateItemQuantity(item.id, -1)}
                        className="w-5 h-5 rounded-full flex items-center justify-center text-gray-500 hover:text-black hover:bg-gray-200 text-xs transition-colors"
                        aria-label="Decrease quantity"
                      >
                        –
                      </button>
                      <span className="text-xs font-bold text-[#0F172A] min-w-3 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateItemQuantity(item.id, 1)}
                        className="w-5 h-5 rounded-full flex items-center justify-center text-gray-500 hover:text-black hover:bg-gray-200 text-xs transition-colors"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="col-span-3 sm:col-span-2 text-right">
                    <span className="text-sm font-bold text-[#0F172A]">
                      ₹{item.unitPrice * item.quantity}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Line */}
            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-sm">
              <span className="text-[#64748B] font-medium">{items.length} items</span>
              <div className="flex items-baseline gap-4">
                <span className="text-xs text-[#64748B]">Item subtotal</span>
                <span className="text-xl font-extrabold text-[#0F172A]">₹{itemsSubtotal}</span>
              </div>
            </div>

            {/* Cart Screenshot Upload Box */}
            <div className="mt-6 rounded-2xl border-2 border-dashed border-[#E2E8F0] p-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#FAF8F7]/50">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 text-[#4F46E5] flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-bold text-[#0F172A]">
                    {screenshotName ? screenshotName : 'Cart screenshot'}
                  </p>
                  <p className="text-[11px] text-[#64748B]">
                    {extracting ? 'AI extracting items…' : 'Optional · PNG or JPG · You can attach one in the real product.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <label className="cursor-pointer px-3 py-1.5 rounded-full text-xs font-semibold bg-[#EEF2FF] text-[#4F46E5] hover:bg-[#E0E7FF] transition-colors">
                  <span>{screenshotName ? 'Change file' : 'Demo placeholder'}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={handleScreenshotUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* If you order alone Banner */}
          <div className="bg-[#EEF2FF] rounded-3xl p-6 sm:p-7 border border-[#E0E7FF] flex items-center justify-between">
            <div>
              <p className="text-base font-bold text-[#0F172A]">If you order alone</p>
              <p className="text-xs text-[#64748B] mt-1">
                Items ₹{itemsSubtotal} + Delivery & handling ₹{soloEstimatedFees}
              </p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-extrabold text-[#0F172A]">₹{soloTotal}</span>
              <p className="text-[11px] text-[#64748B]">illustrative total</p>
            </div>
          </div>

          <div>
            <Link to="/" className="inline-flex items-center text-xs font-semibold text-[#64748B] hover:text-[#0F172A]">
              <span>← Back to overview</span>
            </Link>
          </div>
        </div>

        {/* Right Column (Make it a good fit) */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#F1E8E2] shadow-xs">
            <h2 className="text-xl font-bold text-[#0F172A] mb-6">Make it a good fit</h2>

            <div className="space-y-5">
              {/* Shopping Platform */}
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1.5">
                  Shopping platform
                </label>
                <div className="relative">
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    className="w-full appearance-none bg-[#FFF9F5] border border-[#F1E8E2] rounded-2xl px-4 py-3.5 text-sm font-semibold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] pr-10"
                  >
                    <option value="blinkit">Blinkit</option>
                    <option value="zepto">Zepto</option>
                    <option value="instamart">Swiggy Instamart</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                <p className="text-[11px] text-[#94A3B8] mt-1.5">
                  Also supports Zepto and Instamart
                </p>
              </div>

              {/* Campus Hostel */}
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1.5">
                  Campus hostel
                </label>
                <div className="relative">
                  <select
                    value={hostel}
                    onChange={(e) => setHostel(e.target.value)}
                    className="w-full appearance-none bg-[#FFF9F5] border border-[#F1E8E2] rounded-2xl px-4 py-3.5 text-sm font-semibold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] pr-10"
                  >
                    <option value="Hostel 8 · IIT Bombay">Hostel 8 · IIT Bombay</option>
                    <option value="Hostel 12 · IIT Bombay">Hostel 12 · IIT Bombay</option>
                    <option value="Hostel 16 · IIT Bombay">Hostel 16 · IIT Bombay</option>
                    <option value="Gargi Hostel · IIT Bombay">Gargi Hostel · IIT Bombay</option>
                    <option value="Tagore Hostel · IIT Bombay">Tagore Hostel · IIT Bombay</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Delivery Window */}
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1.5">
                  Your time window
                </label>
                <div className="relative">
                  <select
                    value={deliveryWindow}
                    onChange={(e) => setDeliveryWindow(e.target.value)}
                    className="w-full appearance-none bg-[#FFF9F5] border border-[#F1E8E2] rounded-2xl px-4 py-3.5 text-sm font-semibold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] pr-10"
                  >
                    <option value="Today, 7:00–7:30 pm">Today, 7:00–7:30 pm</option>
                    <option value="Today, 8:00–8:30 pm">Today, 8:00–8:30 pm</option>
                    <option value="Tonight, 10:00–10:30 pm">Tonight, 10:00–10:30 pm</option>
                    <option value="Tomorrow, 8:00–8:30 am">Tomorrow, 8:00–8:30 am</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Same Hostel Toggle */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setSameHostelOnly(!sameHostelOnly)}
                  className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    sameHostelOnly
                      ? 'bg-[#EEF2FF] text-[#4F46E5] border border-[#E0E7FF]'
                      : 'bg-gray-100 text-gray-600 border border-gray-200'
                  }`}
                >
                  <span className="mr-1.5">{sameHostelOnly ? '✓' : '○'}</span>
                  Same hostel only
                </button>
                <p className="text-[11px] text-[#94A3B8] mt-2">
                  A good match shares your platform, location and delivery window.
                </p>
              </div>
            </div>

            {/* CTA Button */}
            <div className="mt-8">
              <button
                type="button"
                onClick={handleFindStudents}
                disabled={isSubmitting || items.length === 0}
                className="w-full inline-flex items-center justify-center px-6 py-4 rounded-2xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-semibold shadow-sm transition-all hover:shadow disabled:opacity-50"
              >
                <span>{isSubmitting ? 'Searching campus…' : 'Find compatible students'}</span>
                <span className="ml-2 font-bold text-base">→</span>
              </button>
              <p className="text-center text-xs text-[#94A3B8] mt-3">
                No order is placed. This is a guided demo.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
