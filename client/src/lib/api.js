import axios from 'axios'

const TOKEN_KEY = 'droppool_token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

const http = axios.create({ baseURL: import.meta.env.VITE_API_URL || '', timeout: 30000 })

http.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || ''
    if (error.response?.status === 401 && !url.includes('/auth/login') && !url.includes('/auth/register')) {
      clearToken()
      window.dispatchEvent(new Event('droppool:logout'))
    }
    return Promise.reject(error)
  },
)

export function errorMessage(error) {
  if (error?.response?.data?.error?.message) return error.response.data.error.message
  if (error?.request) return 'Cannot reach the server. Check that the API is running.'
  return error?.message || 'Something went wrong'
}

export function errorFallback(error) {
  return error?.response?.data?.error?.fallback || null
}

const unwrap = (promise) => promise.then((r) => r.data.data)

export const Api = {
  health: () => unwrap(http.get('/api/health')),
  meta: () => unwrap(http.get('/api/meta')),
  metaFees: (platform, subtotalPaise) => unwrap(http.get('/api/meta/fees', { params: { platform, subtotalPaise } })),
  register: (body) => unwrap(http.post('/api/auth/register', body)),
  login: (body) => unwrap(http.post('/api/auth/login', body)),
  me: () => unwrap(http.get('/api/users/me')),
  updateProfile: (body) => unwrap(http.patch('/api/users/me', body)),
  intents: {
    mine: () => unwrap(http.get('/api/intents/mine')),
    board: () => unwrap(http.get('/api/intents/board')),
    get: (id) => unwrap(http.get(`/api/intents/${id}`)),
    create: (body) => unwrap(http.post('/api/intents', body)),
    update: (id, body) => unwrap(http.patch(`/api/intents/${id}`, body)),
    cancel: (id) => unwrap(http.post(`/api/intents/${id}/cancel`)),
  },
  extract: (body) => unwrap(http.post('/api/ai/extract', body)),
  match: (intentId) => unwrap(http.post('/api/matching/run', { intentId })).then((d) => d?.proposal || d),
  optimization: {
    preview: (intentIds, allocation) => unwrap(http.post('/api/optimization/preview', { intentIds, allocation })),
  },
  pools: {
    mine: () => unwrap(http.get('/api/pools/mine')),
    create: (intentIds) => unwrap(http.post('/api/pools', { intentIds })).then((d) => d?.pool || d),
    get: (id) => unwrap(http.get(`/api/pools/${id}`)).then((d) => d?.pool || d),
    confirm: (id) => unwrap(http.post(`/api/pools/${id}/confirm`)).then((d) => d?.pool || d),
    leave: (id) => unwrap(http.post(`/api/pools/${id}/leave`)).then((d) => d?.pool || d),
    actualTotal: (id, actualTotalPaise) => unwrap(http.post(`/api/pools/${id}/actual-total`, { actualTotalPaise })).then((d) => d?.pool || d),
    status: (id, body) => unwrap(http.post(`/api/pools/${id}/status`, body)).then((d) => d?.pool || d),
  },
  payments: {
    mine: () => unwrap(http.get('/api/payments/mine')),
    claim: (id, utr) => unwrap(http.post(`/api/payments/${id}/claim`, { utr })),
    confirm: (id) => unwrap(http.post(`/api/payments/${id}/confirm`)),
    reject: (id, reason) => unwrap(http.post(`/api/payments/${id}/reject`, { reason })),
    refund: (id) => unwrap(http.post(`/api/payments/${id}/refund`)),
  },
  demand: () => unwrap(http.get('/api/demand/summary')),
  admin: {
    analytics: () => unwrap(http.get('/api/admin/analytics')),
    feeProfiles: () => unwrap(http.get('/api/admin/fee-profiles')),
    saveFeeProfile: (platform, body) => unwrap(http.put(`/api/admin/fee-profiles/${platform}`, body)),
    seedDemo: () => unwrap(http.post('/api/admin/demo/seed')),
    resetDemo: () => unwrap(http.post('/api/admin/demo/reset')),
  },
}

export const getHealth = () => Api.health()
