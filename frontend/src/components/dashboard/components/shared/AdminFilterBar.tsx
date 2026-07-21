import React, { useEffect, useRef, useState } from 'react'
import { Search, X, ChevronRight, ChevronDown } from 'lucide-react'
import { C } from './DashboardShared'
import { Dropdown, DateDropdown, DROPDOWN_STYLE, ALL } from './FilterControls'
import type { AdminFilter, DateRangePreset, StrategyStatusCode } from '../../types/dashboard'

// The 6 lifecycle states a strategy can be in (mirrors strategy_status_master).
const STATUS_OPTIONS: { value: StrategyStatusCode; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'REJECTED', label: 'Rejected' },
]

// DPD buckets, in canonical severity order — shown as a submenu when
// clicking "DPD" in the Case Type dropdown.
const DPD_BUCKETS = ['0+', '30+', '60+', 'NPA']

// The value stored in filter.bucket for the two non-DPD case types.
const PRE_EMI_VALUE = 'Pre-EMI'
const BOUNCE_VALUE = 'Bounce'

// Selecting "All" under DPD matches every DPD case regardless of bucket.
const DPD_ALL_VALUE = 'DPD'

const SEARCH_DEBOUNCE_MS = 300

// Column widths across the bar: Search 25%, Status / Case Type / Date
// 20% each, Clear filters 15% — kept as flex-basis percentages so the
// row stays proportioned at any viewport width instead of relying on
// each control's own intrinsic size.
const COL = {
  search: { flex: '0 1 25%', minWidth: 0 },
  control: { flex: '0 1 21%', minWidth: 0 },
  clear: { flex: '0 1 10%', minWidth: 0 },
} as const

// Filter bar for the Admin (Strategy) dashboard: a live-search box over
// strategy name/code, a status dropdown, a Case Type dropdown (Pre-EMI /
// DPD w/ bucket submenu / Bounce), and the same date-range filter used
// elsewhere. No geography here — strategies aren't scoped to a
// branch/zone/region.
export default function AdminFilterBar({
  filter, onChange,
}: {
  filter: AdminFilter
  onChange: (f: AdminFilter) => void
}) {
  // The input reflects every keystroke instantly for a responsive feel;
  // the actual filter (and therefore the API call) only updates after a
  // short debounce, so the dashboard is filtering "as you type" without
  // firing a request on every single character.
  const [searchInput, setSearchInput] = useState(filter.search)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keep the input in sync if the filter is reset elsewhere (e.g. Clear filters).
  useEffect(() => { setSearchInput(filter.search) }, [filter.search])

  function handleSearchInput(v: string) {
    setSearchInput(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onChange({ ...filter, search: v })
    }, SEARCH_DEBOUNCE_MS)
  }

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

  function handleStatus(v: string | null) {
    onChange({ ...filter, status: (v as StrategyStatusCode) ?? null })
  }
  function handleCaseType(v: string | null) {
    onChange({ ...filter, bucket: v })
  }
  function handleDate(v: { datePreset: DateRangePreset | null; fromDate: string | null; toDate: string | null }) {
    onChange({ ...filter, ...v })
  }
  function clearAll() {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setSearchInput('')
    onChange({ search: '', status: null, bucket: null, datePreset: null, fromDate: null, toDate: null })
  }

  const statusLabel = STATUS_OPTIONS.find(s => s.value === filter.status)?.label ?? ALL
  const hasActiveFilter = !!(filter.search || filter.status || filter.bucket || filter.datePreset)

  return (
    <div
      style={{
        background: '#fff', border: '1px solid #E4EEF8', borderRadius: 14,
        boxShadow: '0 1px 6px rgba(5,0,88,.06)',
        padding: '10px 16px', marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      }}
    >
      {/* Live search — filters strategies by name/code as you type */}
      <div style={{ ...DROPDOWN_STYLE, ...COL.search, display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 10, border: '1px solid #E4EEF8', background: '#fff' }}>
        <Search size={14} color="#9ca3af" style={{ flexShrink: 0 }} />
        <input
          type="text"
          value={searchInput}
          onChange={e => handleSearchInput(e.target.value)}
          placeholder="Search strategies…"
          style={{
            border: 'none', outline: 'none', width: '100%', fontSize: 12.5,
            color: C.navy, background: 'transparent',
          }}
        />
        {searchInput && (
          <button
            onClick={() => handleSearchInput('')}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, display: 'flex', flexShrink: 0 }}
            aria-label="Clear search"
          >
            <X size={13} color="#9ca3af" />
          </button>
        )}
      </div>

      <div style={COL.control}>
        <Dropdown
          label="Status"
          value={statusLabel}
          options={STATUS_OPTIONS.map(s => ({ value: s.value, label: s.label }))}
          onSelect={handleStatus}
        />
      </div>

      <div style={COL.control}>
        <CaseTypeDropdown value={filter.bucket} onSelect={handleCaseType} />
      </div>

      <div style={COL.control}>
        <DateDropdown
          datePreset={filter.datePreset}
          fromDate={filter.fromDate}
          toDate={filter.toDate}
          onChange={handleDate}
        />
      </div>

      {/* Always pinned to the far right of the bar, regardless of how many
          filters are active, so its position never shifts the row layout. */}
      <button
        onClick={clearAll}
        disabled={!hasActiveFilter}
        style={{
          ...COL.clear,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '8px 12px', borderRadius: 10,
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

// ── Case Type dropdown ───────────────────────────────────────
// Custom dropdown (rather than the generic <Dropdown>) because it needs
// a click-triggered submenu on the "DPD" row that reveals the 4 buckets
// (0+ / 30+ / 60+ / NPA) plus an "All" option. Styled to match the shared
// <Dropdown> button (same chevron, same size) even though it's a custom
// implementation.
function CaseTypeDropdown({ value, onSelect }: { value: string | null; onSelect: (v: string | null) => void }) {
  const [open, setOpen] = useState(false)
  const [dpdOpen, setDpdOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
        setDpdOpen(false)
      }
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  const displayLabel =
    value && DPD_BUCKETS.includes(value) ? `DPD (${value})` :
      value === DPD_ALL_VALUE ? 'DPD (All)' :
        (value ?? ALL)

  function choose(v: string) {
    onSelect(v)
    setOpen(false)
    setDpdOpen(false)
  }

  return (
    <div ref={rootRef} style={{ position: 'relative', width: '100%' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          ...DROPDOWN_STYLE, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          padding: '11px 14px', borderRadius: 10, border: '1px solid #E4EEF8',
          background: '#fff', cursor: 'pointer', fontSize: 13, color: C.navy,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
          <span style={{ color: '#9ca3af', fontWeight: 600, whiteSpace: 'nowrap' }}>Case Type:</span>
          <span style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayLabel}</span>
        </span>
        <ChevronDown size={14} color="#9ca3af" style={{ flexShrink: 0 }} />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute', top: '110%', left: 0, zIndex: 20,
            background: '#fff', border: '1px solid #E4EEF8', borderRadius: 10,
            boxShadow: '0 8px 24px rgba(5,0,88,.12)', minWidth: 180, padding: 6,
          }}
        >
          <div
            onClick={() => choose(PRE_EMI_VALUE)}
            style={{ padding: '8px 10px', borderRadius: 8, fontSize: 12.5, color: C.navy, cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFD')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            Pre-EMI
          </div>

          {/* DPD row — click opens the bucket submenu and keeps it pinned open
              (rather than closing on mouse-out) until a bucket is chosen or
              the whole dropdown is dismissed. */}
          <div style={{ position: 'relative' }}>
            <div
              onClick={() => setDpdOpen(o => !o)}
              style={{
                padding: '8px 10px', borderRadius: 8, fontSize: 12.5, color: C.navy,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: dpdOpen ? '#F8FAFD' : 'transparent',
              }}
              onMouseEnter={e => { if (!dpdOpen) e.currentTarget.style.background = '#F8FAFD' }}
              onMouseLeave={e => { if (!dpdOpen) e.currentTarget.style.background = 'transparent' }}
            >
              DPD <ChevronRight size={13} color="#9ca3af" />
            </div>

            {dpdOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '100%',
                  marginLeft: 4,
                  zIndex: 21,
                  background: '#fff',
                  border: '1px solid #E4EEF8',
                  borderRadius: 10,
                  boxShadow: '0 8px 24px rgba(5,0,88,.12)',
                  minWidth: 120,
                  padding: 6,
                }}
              >
                {/* All DPD Buckets */}
                <div
                  onClick={() => choose(DPD_ALL_VALUE)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 8,
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: C.navy,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFD')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  All
                </div>

                <div
                  style={{
                    height: 1,
                    background: '#F0F4FA',
                    margin: '4px 2px',
                  }}
                />

                {/* Individual DPD Buckets */}
                {DPD_BUCKETS.map(bucket => (
                  <div
                    key={bucket}
                    onClick={() => choose(bucket)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 8,
                      fontSize: 12.5,
                      color: C.navy,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFD')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {bucket}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            onClick={() => choose(BOUNCE_VALUE)}
            style={{ padding: '8px 10px', borderRadius: 8, fontSize: 12.5, color: C.navy, cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFD')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            Bounce
          </div>

          {value && (
            <div
              onClick={() => choose(null as any)}
              style={{ padding: '8px 10px', borderRadius: 8, fontSize: 12, color: '#9ca3af', cursor: 'pointer', borderTop: '1px solid #F0F4FA', marginTop: 4 }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFD')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              Clear (All)
            </div>
          )}
        </div>
      )}
    </div>
  )
}