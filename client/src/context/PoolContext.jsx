import { createContext, useContext, useState, useEffect } from 'react'
import { Api, errorMessage } from '../lib/api'
import { useAuth } from './AuthContext'
import avatarAanya from '../assets/avatar_aanya.png'
import avatarKabir from '../assets/avatar_kabir.png'
import avatarMeera from '../assets/avatar_meera.png'

const PoolContext = createContext(null)

// Authentic Figma Default Dataset
export const DEFAULT_CART_ITEMS = [
  { id: 'item_1', name: 'Amul toned milk', category: 'Dairy', quantityText: '500 ml', unitPrice: 60, quantity: 1, icon: 'milk' },
  { id: 'item_2', name: 'Britannia whole wheat bread', category: 'Bakery', quantityText: '400 g', unitPrice: 60, quantity: 1, icon: 'bread' },
]

export const POOL_MEMBERS = [
  {
    id: 'aanya',
    name: 'Aanya',
    label: 'Aanya (you)',
    role: 'You · Host',
    isYou: true,
    avatar: avatarAanya,
    itemsText: 'Milk + bread',
    itemCount: 2,
    subtotal: 120,
    soloFees: 30,
    soloTotal: 150,
    pooledShare: 130,
    savings: 20,
    hostel: 'Hostel 8',
    block: 'A',
    floor: '3',
    timeWindow: '7:00–7:30 pm',
    sameHostel: true,
    sameTime: true,
    items: [
      { name: 'Amul toned milk', detail: '500 ml · Qty 1', price: 60 },
      { name: 'Whole wheat bread', detail: '400 g · Qty 1', price: 60 },
    ],
  },
  {
    id: 'kabir',
    name: 'Kabir',
    label: 'Kabir Shah',
    role: 'Member',
    isYou: false,
    avatar: avatarKabir,
    itemsText: 'Oats + bananas',
    itemCount: 2,
    subtotal: 100,
    soloFees: 30,
    soloTotal: 130,
    pooledShare: 110,
    savings: 20,
    hostel: 'Hostel 8',
    block: 'B',
    floor: '2',
    timeWindow: '7:00–7:30 pm',
    sameHostel: true,
    sameTime: true,
    items: [
      { name: 'Quaker oats', detail: '200 g · Qty 1', price: 70 },
      { name: 'Bananas', detail: '3 pcs · Qty 1', price: 30 },
    ],
  },
  {
    id: 'meera',
    name: 'Meera',
    label: 'Meera Iyer',
    role: 'Member',
    isYou: false,
    avatar: avatarMeera,
    itemsText: 'Noodles + biscuits',
    itemCount: 2,
    subtotal: 80,
    soloFees: 30,
    soloTotal: 110,
    pooledShare: 90,
    savings: 20,
    hostel: 'Hostel 8',
    block: 'A',
    floor: '2',
    timeWindow: '7:00–7:30 pm',
    sameHostel: true,
    sameTime: true,
    items: [
      { name: 'Instant noodles', detail: 'Pack of 2 · Qty 1', price: 50 },
      { name: 'Marie biscuits', detail: '150 g · Qty 1', price: 30 },
    ],
  },
]

export const REJECTED_SCENARIO = {
  total: 360,
  shares: {
    aanya: 132,
    kabir: 116,
    meera: 112,
  },
  reason: 'Meera pays ₹2 more than ₹110 alone. This pool is rejected. Strict rule: each pooled total must be lower than that member\'s individual total.',
}

export function PoolProvider({ children }) {
  const { user, isAuthenticated } = useAuth()

  // Shopping Intent State
  const [items, setItems] = useState(DEFAULT_CART_ITEMS)
  const [platform, setPlatform] = useState('blinkit')
  const [hostel, setHostel] = useState('Hostel 8 · IIT Bombay')
  const [deliveryWindow, setDeliveryWindow] = useState('Today, 7:00–7:30 pm')
  const [sameHostelOnly, setSameHostelOnly] = useState(true)
  const [screenshotUploaded, setScreenshotUploaded] = useState(false)
  const [createdIntentId, setCreatedIntentId] = useState(null)

  // Matching & Optimization State
  const [allocationRule, setAllocationRule] = useState('proportional') // 'proportional' | 'equal'
  const [activeScenario, setActiveScenario] = useState('recommended') // 'recommended' | 'rejected' | 'incomplete'
  const [poolStatusStep, setPoolStatusStep] = useState(2) // 1: Matched, 2: Reviewing costs, 3: Ready to order, 4: Collected
  const [backendMeta, setBackendMeta] = useState(null)
  const [backendIntents, setBackendIntents] = useState([])
  const [backendPools, setBackendPools] = useState([])
  const [isBackendConnected, setIsBackendConnected] = useState(false)

  // Calculate items subtotal
  const itemsSubtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  const soloEstimatedFees = 30
  const soloTotal = itemsSubtotal + soloEstimatedFees

  // Check backend meta on mount
  useEffect(() => {
    Api.meta()
      .then((data) => {
        setBackendMeta(data)
        setIsBackendConnected(true)
      })
      .catch(() => {
        setIsBackendConnected(false)
      })
  }, [])

  // If user is authenticated, attempt to fetch user's real intents and pools
  useEffect(() => {
    if (isAuthenticated) {
      Api.intents.mine()
        .then((data) => {
          if (data?.intents) setBackendIntents(data.intents)
        })
        .catch(() => {})

      Api.pools.mine()
        .then((data) => {
          if (data?.pools) setBackendPools(data.pools)
        })
        .catch(() => {})
    }
  }, [isAuthenticated])

  // Intent Item operations
  const updateItemQuantity = (id, delta) => {
    setItems((prev) =>
      prev
        .map((it) => (it.id === id ? { ...it, quantity: Math.max(0, it.quantity + delta) } : it))
        .filter((it) => it.quantity > 0)
    )
  }

  const addItem = (name, unitPrice, category = 'General', quantityText = '1 pc') => {
    const newItem = {
      id: `item_${Date.now()}`,
      name,
      unitPrice: Number(unitPrice),
      quantity: 1,
      category,
      quantityText,
      icon: 'cart',
    }
    setItems((prev) => [...prev, newItem])
  }

  // Savings computation according to product rules:
  // "DropPool must recommend a pool only when every participating student has positive net savings.
  // If any student loses money, show that pooling is not recommended.
  // If fee information is missing, show that the comparison is incomplete."
  const getOptimizerData = () => {
    if (activeScenario === 'incomplete') {
      return {
        recommendation: 'insufficient_data',
        reason: 'Fee data is missing for this comparison, so savings cannot be verified.',
        members: POOL_MEMBERS,
        soloGrandTotal: 390,
        pooledGrandTotal: null,
        totalSavings: 0,
        feeBreakdown: null,
      }
    }

    if (activeScenario === 'rejected') {
      return {
        recommendation: 'individual',
        reason: REJECTED_SCENARIO.reason,
        soloGrandTotal: 390,
        pooledGrandTotal: REJECTED_SCENARIO.total,
        totalSavings: 30,
        members: POOL_MEMBERS.map((m) => {
          const share = REJECTED_SCENARIO.shares[m.id]
          const savings = m.soloTotal - share
          return {
            ...m,
            pooledShare: share,
            savings,
            isNegative: savings <= 0,
          }
        }),
        feeBreakdown: {
          itemsCost: 300,
          deliveryFees: 60,
          sharedFeePerMember: 20,
        },
      }
    }

    // Default recommended scenario
    const pooledItemsSubtotal = 300
    const pooledSharedFees = 30
    const pooledGrandTotal = pooledItemsSubtotal + pooledSharedFees
    const soloGrandTotal = 390
    const totalSavings = soloGrandTotal - pooledGrandTotal

    const calculatedMembers = POOL_MEMBERS.map((m) => {
      let sharedFee = 10
      if (allocationRule === 'proportional') {
        sharedFee = Math.round((m.subtotal / pooledItemsSubtotal) * pooledSharedFees)
      } else {
        sharedFee = Math.round(pooledSharedFees / POOL_MEMBERS.length)
      }
      const pooledShare = m.subtotal + sharedFee
      const savings = m.soloTotal - pooledShare
      return {
        ...m,
        pooledShare,
        savings,
        isNegative: savings <= 0,
      }
    })

    const hasLoser = calculatedMembers.some((m) => m.savings <= 0)

    return {
      recommendation: hasLoser ? 'individual' : 'pool',
      reason: hasLoser
        ? 'Pooling is not recommended. At least one member pays more than ordering individually.'
        : `Recommended pool: ${POOL_MEMBERS.length} students. Estimated savings: ₹20 per member.`,
      soloGrandTotal,
      pooledGrandTotal,
      totalSavings,
      members: calculatedMembers,
      feeBreakdown: {
        itemsCost: 300,
        deliveryFees: 30,
        sharedFeePerMember: 10,
      },
    }
  }

  // Create intent call
  const submitIntent = async () => {
    if (isAuthenticated) {
      try {
        const payload = {
          platform,
          items: items.map((it) => ({
            name: it.name,
            qty: it.quantity,
            unitPricePaise: it.unitPrice * 100,
          })),
          windowStart: new Date().toISOString(),
          windowEnd: new Date(Date.now() + 180 * 60000).toISOString(),
        }
        const res = await Api.intents.create(payload)
        if (res?.intent) {
          setCreatedIntentId(res.intent.id)
          return { success: true, intent: res.intent }
        }
      } catch (err) {
        return { success: false, error: errorMessage(err) }
      }
    }
    // Demo mode: simulate success
    setCreatedIntentId('intent_demo_108')
    return { success: true, isDemo: true }
  }

  return (
    <PoolContext.Provider
      value={{
        items,
        platform,
        setPlatform,
        hostel,
        setHostel,
        deliveryWindow,
        setDeliveryWindow,
        sameHostelOnly,
        setSameHostelOnly,
        screenshotUploaded,
        setScreenshotUploaded,
        itemsSubtotal,
        soloEstimatedFees,
        soloTotal,
        updateItemQuantity,
        addItem,
        submitIntent,
        createdIntentId,
        allocationRule,
        setAllocationRule,
        activeScenario,
        setActiveScenario,
        poolStatusStep,
        setPoolStatusStep,
        getOptimizerData,
        isBackendConnected,
        backendMeta,
        backendIntents,
        backendPools,
      }}
    >
      {children}
    </PoolContext.Provider>
  )
}

export const usePool = () => useContext(PoolContext)
