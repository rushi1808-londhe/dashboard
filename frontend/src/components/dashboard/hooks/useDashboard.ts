import { useState, useEffect, useCallback } from 'react'
import { dashboardApi } from '../services/dashboardApi'
import type {
  ManagementDashboard,
  CollectionManagerDashboard, AdminDashboard, DashboardRole, GeoFilter, AdminFilter
} from '../types/dashboard'

type RoleData<R extends DashboardRole> =
  R extends 'management' ? ManagementDashboard :
  R extends 'collection' ? CollectionManagerDashboard :
  R extends 'admin'   ? AdminDashboard      : never

// Admin uses its own filter shape (search + status, no geography);
// Management/Collection use the geography+date GeoFilter.
type RoleFilter<R extends DashboardRole> = R extends 'admin' ? AdminFilter : GeoFilter

const fetchers = {
  management: (f: GeoFilter) => dashboardApi.getManagement(f).then(r => r.data),
  collection: (f: GeoFilter) => dashboardApi.getCollection(f).then(r => r.data),
  admin:   (f: AdminFilter) => dashboardApi.getAdmin(f)     .then(r => r.data),
}

export function useDashboard<R extends DashboardRole>(role: R, filter: RoleFilter<R>) {
  const [data,    setData]    = useState<RoleData<R> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  // Admin's `search` is debounced inside AdminFilterBar before it's ever
  // committed to `filter`, so including it here is safe — it only changes
  // (and re-fetches) after the debounce window, not on every keystroke.
  const f = filter as GeoFilter & AdminFilter
  const fetch = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const result = await (fetchers[role] as (f: RoleFilter<R>) => Promise<RoleData<R>>)(filter)
      setData(result)
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, f.zoneCode, f.regionCode, f.branchName, f.datePreset, f.fromDate, f.toDate, f.search, f.status, f.bucket])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}