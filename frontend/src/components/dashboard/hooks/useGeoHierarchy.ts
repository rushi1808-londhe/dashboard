import { useEffect, useState } from 'react'
import { dashboardApi } from '../services/dashboardApi'
import type { ZoneNode } from '../types/dashboard'

export function useGeoHierarchy() {
  const [zones, setZones] = useState<ZoneNode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    dashboardApi.getGeoHierarchy()
      .then(res => { if (!cancelled) setZones(res.data ?? []) })
      .catch(e => { if (!cancelled) setError(e?.response?.data?.message ?? e?.message ?? 'Failed to load locations') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return { zones, loading, error }
}
