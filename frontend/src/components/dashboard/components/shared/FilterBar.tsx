import React from 'react'
import { X } from 'lucide-react'
import { useGeoHierarchy } from '../../hooks/useGeoHierarchy'
import { Dropdown, DateDropdown, ALL } from './FilterControls'
import type { GeoFilter, DateRangePreset } from '../../types/dashboard'

// Geography + date filter bar used by the Management and Collection
// dashboards. (The Admin dashboard uses AdminFilterBar instead — it
// filters strategies by search text + status, not geography.)
export default function FilterBar({
  filter, onChange,
}: {
  filter: GeoFilter
  onChange: (f: GeoFilter) => void
}) {
  const { zones, loading } = useGeoHierarchy()

  const selectedZone = zones.find(z => z.zoneCode === filter.zoneCode)

  const regionScope = selectedZone ? [selectedZone] : zones
  const regionOptions = regionScope
    .flatMap(z => z.regions)
    .map(r => ({ value: r.regionCode, label: r.regionCode }))
    .filter((r, i, arr) => arr.findIndex(x => x.value === r.value) === i)

  const selectedRegion = regionScope.flatMap(z => z.regions).find(r => r.regionCode === filter.regionCode)
  const branchScope = selectedRegion ? [selectedRegion] : regionScope.flatMap(z => z.regions)
  const branchOptions = branchScope
    .flatMap(r => r.branches)
    .map(b => ({ value: b.name, label: b.name }))
    .filter((b, i, arr) => arr.findIndex(x => x.value === b.value) === i)

  function handleZone(v: string | null) {
    onChange({ ...filter, zoneCode: v, regionCode: null, branchName: null })
  }
  function handleRegion(v: string | null) {
    onChange({ ...filter, regionCode: v, branchName: null })
  }
  function handleBranch(v: string | null) {
    onChange({ ...filter, branchName: v })
  }
  function handleDate(v: { datePreset: DateRangePreset | null; fromDate: string | null; toDate: string | null }) {
    onChange({ ...filter, ...v })
  }
  function clearAll() {
    onChange({ zoneCode: null, regionCode: null, branchName: null, datePreset: null, fromDate: null, toDate: null })
  }

  const hasActiveFilter = !!(filter.zoneCode || filter.regionCode || filter.branchName || filter.datePreset)

  return (
    <div
      style={{
        background: '#fff', border: '1px solid #E4EEF8', borderRadius: 14,
        boxShadow: '0 1px 6px rgba(5,0,88,.06)',
        padding: '10px 16px', marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      }}
    >
      <Dropdown
        label="Zone"
        value={filter.zoneCode ?? ALL}
        options={zones.map(z => ({ value: z.zoneCode, label: z.zoneCode }))}
        onSelect={handleZone}
        disabled={loading}
      />
      <Dropdown
        label="Region"
        value={filter.regionCode ?? ALL}
        options={regionOptions}
        onSelect={handleRegion}
        disabled={loading}
      />
      <Dropdown
        label="Branch"
        value={filter.branchName ?? ALL}
        options={branchOptions}
        onSelect={handleBranch}
        disabled={loading}
      />
      <DateDropdown
        datePreset={filter.datePreset}
        fromDate={filter.fromDate}
        toDate={filter.toDate}
        onChange={handleDate}
      />

      {loading && (
        <span style={{ fontSize: 11.5, color: '#9ca3af' }}>
          Loading locations…
        </span>
      )}

      {/* Always pinned to the far right of the bar, regardless of how many
          filters are active, so its position never shifts the row layout. */}
      <button
        onClick={clearAll}
        disabled={!hasActiveFilter}
        style={{
          display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px', borderRadius: 10,
          border: '1px solid #E4EEF8', background: hasActiveFilter ? '#F8FAFD' : '#FBFCFE',
          color: hasActiveFilter ? '#6b7280' : '#c7ccd4',
          fontSize: 12, fontWeight: 600, cursor: hasActiveFilter ? 'pointer' : 'not-allowed',
          marginLeft: 'auto', flexShrink: 0,
        }}
      >
        <X size={13} /> Clear filters
      </button>
    </div>
  )
}
