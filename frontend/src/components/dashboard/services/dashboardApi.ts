// ─────────────────────────────────────────────────────────────
//  Dashboard API Service — Axios calls to .NET backend
//  All endpoints: GET /api/dashboard/{management|collection-manager|admin}
// ─────────────────────────────────────────────────────────────
import axios from 'axios'
import type {
  ManagementDashboard,
  CollectionManagerDashboard, AdminDashboard, GeoFilter, AdminFilter, ZoneNode
} from '../types/dashboard'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

// Attach JWT token on every request if present
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('authToken')
  if (token && cfg.headers) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

// ── Backend envelope shape ──────────────────────────────────────
// Every controller action wraps its real payload like this:
//   { apiCode, statusCode, message, payload: <actual DTO> }
// so we unwrap `.payload` here and hand callers the real DTO directly.
interface ApiEnvelope<T> {
  apiCode: string
  statusCode: number
  message: string
  payload: T
}

async function unwrap<T>(promise: Promise<{ data: ApiEnvelope<T> }>): Promise<{ data: T }> {
  const res = await promise
  return { data: res.data.payload }
}

// Turns a date-range preset into a concrete [fromDate, toDate] pair
// (both as YYYY-MM-DD strings). 'custom' just passes through the
// explicit fromDate/toDate already chosen by the user.
// Shared by both filter shapes (GeoFilter and AdminFilter) — they both
// carry the same datePreset/fromDate/toDate trio.
function resolveDateRange(filter: Pick<GeoFilter, 'datePreset' | 'fromDate' | 'toDate'>): { fromDate?: string; toDate?: string } {
  const { datePreset, fromDate, toDate } = filter
  if (!datePreset) return {}

  if (datePreset === 'custom') {
    const params: { fromDate?: string; toDate?: string } = {}
    if (fromDate) params.fromDate = fromDate
    if (toDate) params.toDate = toDate
    return params
  }

  const days: Record<Exclude<typeof datePreset, 'custom'>, number> = {
    last_week: 7,
    '1_month': 30,
    '3_month': 90,
    '6_month': 180,
  }

  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - days[datePreset])

  const toIso = (d: Date) => d.toISOString().slice(0, 10)
  return { fromDate: toIso(from), toDate: toIso(to) }
}

// Converts a GeoFilter into axios params, omitting nulls so unset
// filters don't show up as ?zoneCode=null in the query string.
function toParams(filter?: GeoFilter) {
  if (!filter) return {}
  const { zoneCode, regionCode, branchName } = filter
  const params: Record<string, string> = {}
  if (zoneCode) params.zoneCode = zoneCode
  if (regionCode) params.regionCode = regionCode
  if (branchName) params.branchName = branchName
  Object.assign(params, resolveDateRange(filter))
  return params
}

// Converts an AdminFilter into axios params — search text + status +
// resolved date range. No geography here; the Admin dashboard filters
// strategies, not branches/zones/regions.
function toAdminParams(filter?: AdminFilter) {
  if (!filter) return {}
  const { search, status, bucket } = filter
  const params: Record<string, string> = {}
  if (search && search.trim()) params.search = search.trim()
  if (status) params.status = status
  if (bucket) params.bucket = bucket
  Object.assign(params, resolveDateRange(filter))
  return params
}

// ── Endpoints ────────────────────────────────────────────────
export const dashboardApi = {
  getManagement: (filter?: GeoFilter) =>
    unwrap<ManagementDashboard>(api.get('/api/dashboard/management', { params: toParams(filter) })),
  getCollection: (filter?: GeoFilter) =>
    unwrap<CollectionManagerDashboard>(api.get('/api/dashboard/collection-manager', { params: toParams(filter) })),
  getAdmin: (filter?: AdminFilter) =>
    unwrap<AdminDashboard>(api.get('/api/dashboard/admin', { params: toAdminParams(filter) })),
  getGeoHierarchy: () =>
    unwrap<ZoneNode[]>(api.get('/api/dashboard/geo-hierarchy')),
}