import React, { useState, useRef, useEffect } from 'react'
import { ChevronUp, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { C } from './DashboardShared'
import type { DateRangePreset } from '../../types/dashboard'

// Shared building blocks used by both FilterBar (Management/Collection —
// geography + date) and AdminFilterBar (search + status + date), so the
// two filter bars stay visually and behaviorally identical.

export const ALL = 'All'

export const DATE_PRESET_OPTIONS: { value: DateRangePreset; label: string }[] = [
  { value: 'last_week', label: 'Last Week' },
  { value: '1_month', label: 'Last 1 Month' },
  { value: '3_month', label: 'Last 3 Months' },
  { value: '6_month', label: 'Last 6 Months' },
  { value: 'custom', label: 'Custom Range' },
]

// Every dropdown/control in a filter bar shares this footprint so the row
// reads as a uniform grid rather than a mix of differently-sized controls.
export const DROPDOWN_STYLE: React.CSSProperties = {
  position: 'relative', flex: '1 1 0', minWidth: 170, maxWidth: 260,
}

export function Dropdown({
  label, value, options, onSelect, disabled,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onSelect: (v: string | null) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} style={DROPDOWN_STYLE}>
      <button
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          width: '100%', padding: '9px 12px', borderRadius: 10,
          border: '1px solid #E4EEF8', background: disabled ? '#F8FAFD' : '#fff',
          cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 12.5,
          opacity: disabled ? 0.55 : 1,
        }}
      >
        <span style={{ color: '#9ca3af', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label}: <span style={{ color: C.navy, fontWeight: 700 }}>{value}</span>
        </span>
        <ChevronUp
          size={14} color="#9ca3af"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s', flexShrink: 0 }}
        />
      </button>

      {open && !disabled && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, minWidth: '100%',
            maxHeight: 260, overflowY: 'auto', background: '#fff', border: '1px solid #E4EEF8',
            borderRadius: 10, boxShadow: '0 10px 28px rgba(5,0,88,0.14)', zIndex: 60,
          }}
        >
          <div
            onClick={() => { onSelect(null); setOpen(false) }}
            onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFD')}
            onMouseLeave={e => (e.currentTarget.style.background = '')}
            style={{
              padding: '9px 12px', fontSize: 12.5, cursor: 'pointer',
              fontWeight: value === ALL ? 700 : 500, color: value === ALL ? C.navy : '#374151',
              borderBottom: options.length ? '1px solid #F0F4FA' : 'none',
            }}
          >
            All
          </div>
          {options.map(o => (
            <div
              key={o.value}
              onClick={() => { onSelect(o.value); setOpen(false) }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFD')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
              style={{
                padding: '9px 12px', fontSize: 12.5, cursor: 'pointer',
                fontWeight: value === o.label ? 700 : 500, color: value === o.label ? C.navy : '#374151',
              }}
            >
              {o.label}
            </div>
          ))}
          {options.length === 0 && (
            <div style={{ padding: '9px 12px', fontSize: 12, color: '#9ca3af' }}>No options</div>
          )}
        </div>
      )}
    </div>
  )
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function isoOf(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}
function parseIso(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return { y, m: m - 1, d }
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const YEARS_PER_PAGE = 12

// A proper click-driven calendar with 3 zoom levels, so jumping decades
// back never means clicking a "previous month" arrow hundreds of times:
//   days   — the everyday grid; click the "Month YYYY" header to zoom out
//   months — pick any month of the year shown, or click the year to zoom out further
//   years  — a page of 12 years at a time; « / » jump a whole page (12 years) at once
// No native scroll-wheel year spinner anywhere, and no typing required.
function RangeCalendar({
  from, to, onPick, minIso, maxIso,
}: {
  from: string
  to: string
  onPick: (iso: string) => void
  minIso?: string
  maxIso?: string
}) {
  const today = new Date()
  const anchor = from ? parseIso(from) : { y: today.getFullYear(), m: today.getMonth() }
  const [viewYear, setViewYear] = useState(anchor.y)
  const [viewMonth, setViewMonth] = useState(anchor.m)
  const [view, setView] = useState<'days' | 'months' | 'years'>('days')
  // Which 12-year page the "years" view is showing — independent of
  // viewYear so browsing pages doesn't commit anything until a year is clicked.
  const [yearPage, setYearPage] = useState(() => Math.floor(anchor.y / YEARS_PER_PAGE) * YEARS_PER_PAGE)

  function changeMonth(delta: number) {
    let m = viewMonth + delta
    let y = viewYear
    if (m < 0) { m = 11; y -= 1 }
    if (m > 11) { m = 0; y += 1 }
    setViewMonth(m)
    setViewYear(y)
  }
  function changeYear(delta: number) {
    setViewYear(y => y + delta)
  }

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  function isDisabled(day: number) {
    const iso = isoOf(viewYear, viewMonth, day)
    if (minIso && iso < minIso) return true
    if (maxIso && iso > maxIso) return true
    return false
  }
  function isSelected(day: number) {
    const iso = isoOf(viewYear, viewMonth, day)
    return iso === from || iso === to
  }
  function isInRange(day: number) {
    if (!from || !to) return false
    const iso = isoOf(viewYear, viewMonth, day)
    return iso > from && iso < to
  }

  const navBtnStyle: React.CSSProperties = { border: 'none', background: 'transparent', cursor: 'pointer', padding: 4, display: 'flex' }
  const headerLabelStyle: React.CSSProperties = {
    fontSize: 12.5, fontWeight: 700, color: C.navy, flex: 1, textAlign: 'center',
    cursor: 'pointer', borderRadius: 6, padding: '2px 6px',
  }

  // ── Years view: a page of 12 years, « / » move a whole page at a time
  // so getting from this year to 20 years back takes ~2 clicks, not 20. ──
  if (view === 'years') {
    const years = Array.from({ length: YEARS_PER_PAGE }, (_, i) => yearPage + i)
    return (
      <div style={{ padding: 10, userSelect: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <button type="button" onClick={() => setYearPage(p => p - YEARS_PER_PAGE)} title="Previous 12 years" style={navBtnStyle}>
            <ChevronLeft size={14} color={C.navy} />
          </button>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: C.navy }}>{years[0]} – {years[YEARS_PER_PAGE - 1]}</span>
          <button type="button" onClick={() => setYearPage(p => p + YEARS_PER_PAGE)} title="Next 12 years" style={navBtnStyle}>
            <ChevronRight size={14} color={C.navy} />
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4 }}>
          {years.map(y => (
            <button
              type="button"
              key={y}
              onClick={() => { setViewYear(y); setView('months') }}
              style={{
                border: 'none', borderRadius: 8, padding: '9px 0', fontSize: 12, cursor: 'pointer',
                background: y === viewYear ? C.navy : 'transparent',
                color: y === viewYear ? '#fff' : C.navy,
                fontWeight: y === viewYear ? 700 : 500,
              }}
            >
              {y}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── Months view: pick any month of viewYear; click the year to zoom out to years. ──
  if (view === 'months') {
    return (
      <div style={{ padding: 10, userSelect: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <button type="button" onClick={() => changeYear(-1)} title="Previous year" style={navBtnStyle}>
            <ChevronLeft size={14} color={C.navy} />
          </button>
          <span
            onClick={() => { setYearPage(Math.floor(viewYear / YEARS_PER_PAGE) * YEARS_PER_PAGE); setView('years') }}
            title="Jump to a different year"
            style={headerLabelStyle}
          >
            {viewYear}
          </span>
          <button type="button" onClick={() => changeYear(1)} title="Next year" style={navBtnStyle}>
            <ChevronRight size={14} color={C.navy} />
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4 }}>
          {MONTH_SHORT.map((m, i) => (
            <button
              type="button"
              key={m}
              onClick={() => { setViewMonth(i); setView('days') }}
              style={{
                border: 'none', borderRadius: 8, padding: '9px 0', fontSize: 12, cursor: 'pointer',
                background: i === viewMonth ? C.navy : 'transparent',
                color: i === viewMonth ? '#fff' : C.navy,
                fontWeight: i === viewMonth ? 700 : 500,
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── Days view (default): the everyday calendar grid. ──
  return (
    <div style={{ padding: 10, userSelect: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 4 }}>
        <button type="button" onClick={() => changeMonth(-1)} title="Previous month" style={navBtnStyle}>
          <ChevronLeft size={14} color={C.navy} />
        </button>
        <span
          onClick={() => setView('months')}
          onMouseEnter={e => (e.currentTarget.style.background = '#F0F4FA')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          title="Jump to a different month or year"
          style={headerLabelStyle}
        >
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button type="button" onClick={() => changeMonth(1)} title="Next month" style={navBtnStyle}>
          <ChevronRight size={14} color={C.navy} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 2 }}>
        {WEEKDAY_LABELS.map((w, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#9ca3af', padding: '2px 0' }}>{w}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />
          const disabled = isDisabled(day)
          const selected = isSelected(day)
          const inRange = isInRange(day)
          return (
            <button
              type="button"
              key={i}
              disabled={disabled}
              onClick={() => onPick(isoOf(viewYear, viewMonth, day))}
              style={{
                border: 'none', borderRadius: 6, padding: '5px 0', fontSize: 11.5, cursor: disabled ? 'not-allowed' : 'pointer',
                background: selected ? C.navy : inRange ? '#E4EEF8' : 'transparent',
                color: selected ? '#fff' : disabled ? '#d1d5db' : C.navy,
                fontWeight: selected ? 700 : 500,
              }}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}



// "Custom Range" option that reveals two date pickers. Custom range is
// capped at 6 months — once "from" is picked, "to" can't go further than
// 6 months past it (and vice versa), so no one can spec a window wider
// than what the preset options already cover.
export function DateDropdown({
  datePreset, fromDate, toDate, onChange,
}: {
  datePreset: DateRangePreset | null
  fromDate: string | null
  toDate: string | null
  onChange: (v: { datePreset: DateRangePreset | null; fromDate: string | null; toDate: string | null }) => void
}) {
  const [open, setOpen] = useState(false)
  // Local, uncommitted UI state for the custom-range picker. Nothing here
  // touches the parent filter (and therefore doesn't trigger a data
  // refetch / re-render) until "Apply" is clicked — that's what used to
  // make the whole dropdown vanish mid-pick, since every keystroke was
  // committed straight to the dashboard's filter state.
  const [showCustomPicker, setShowCustomPicker] = useState(datePreset === 'custom')
  const [localFrom, setLocalFrom] = useState(fromDate ?? '')
  const [localTo, setLocalTo] = useState(toDate ?? '')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Re-sync local picker state whenever the dropdown is (re)opened, so it
  // always reflects what's actually committed rather than stale edits.
  function handleOpen() {
    setShowCustomPicker(datePreset === 'custom')
    setLocalFrom(fromDate ?? '')
    setLocalTo(toDate ?? '')
    setOpen(o => !o)
  }

  const label = datePreset
    ? (DATE_PRESET_OPTIONS.find(o => o.value === datePreset)?.label ?? ALL)
    : ALL

  const displayValue = datePreset === 'custom' && fromDate && toDate
    ? `${fromDate} → ${toDate}`
    : label

  const MAX_RANGE_DAYS = 183 // ~6 months

  function addDays(iso: string, days: number) {
    const d = new Date(iso)
    d.setDate(d.getDate() + days)
    return d.toISOString().slice(0, 10)
  }

  // Click-to-pick, same pattern as most booking calendars: first click
  // sets the range start and clears any previous end; the next click (as
  // long as it's on/after the start and within 6 months of it) sets the
  // end. Clicking again after a full range is picked starts a new range.
  function handlePick(iso: string) {
    if (!localFrom || (localFrom && localTo)) {
      setLocalFrom(iso)
      setLocalTo('')
      return
    }
    if (iso < localFrom) {
      setLocalFrom(iso)
      setLocalTo('')
      return
    }
    const diffDays = (new Date(iso).getTime() - new Date(localFrom).getTime()) / 86400000
    if (diffDays > MAX_RANGE_DAYS) {
      // Clicked past the 6-month cap — treat it as a fresh start instead
      // of silently clamping, so the person isn't confused by a range
      // that doesn't match what they clicked.
      setLocalFrom(iso)
      setLocalTo('')
      return
    }
    setLocalTo(iso)
  }

  function applyCustomRange() {
    if (!localFrom || !localTo) return
    onChange({ datePreset: 'custom', fromDate: localFrom, toDate: localTo })
    setOpen(false)
  }

  const today = new Date().toISOString().slice(0, 10)
  // While only "from" is picked, cap the calendar's selectable window to
  // 6 months on either side of it so a click can't land outside the
  // allowed range in the first place — no clamping-after-the-fact needed.
  const calendarMin = localFrom && !localTo ? addDays(localFrom, -MAX_RANGE_DAYS) : undefined
  const calendarMaxRaw = localFrom && !localTo ? addDays(localFrom, MAX_RANGE_DAYS) : today
  const calendarMax = calendarMaxRaw > today ? today : calendarMaxRaw

  return (
    <div ref={ref} style={DROPDOWN_STYLE}>
      <button
        onClick={handleOpen}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          width: '100%', padding: '9px 12px', borderRadius: 10,
          border: '1px solid #E4EEF8', background: '#fff',
          cursor: 'pointer', fontSize: 12.5,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#9ca3af', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <Calendar size={13} color={C.navy} style={{ flexShrink: 0 }} />
          Date: <span style={{ color: C.navy, fontWeight: 700 }}>{displayValue}</span>
        </span>
        <ChevronUp
          size={14} color="#9ca3af"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s', flexShrink: 0 }}
        />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, minWidth: 272,
            background: '#fff', border: '1px solid #E4EEF8',
            borderRadius: 10, boxShadow: '0 10px 28px rgba(5,0,88,0.14)', zIndex: 60,
            overflow: 'hidden',
          }}
        >
          <div
            onClick={() => { onChange({ datePreset: null, fromDate: null, toDate: null }); setShowCustomPicker(false); setOpen(false) }}
            onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFD')}
            onMouseLeave={e => (e.currentTarget.style.background = '')}
            style={{
              padding: '9px 12px', fontSize: 12.5, cursor: 'pointer',
              fontWeight: datePreset === null ? 700 : 500, color: datePreset === null ? C.navy : '#374151',
              borderBottom: '1px solid #F0F4FA',
            }}
          >
            All time
          </div>
          {DATE_PRESET_OPTIONS.map(o => (
            <div
              key={o.value}
              onClick={() => {
                if (o.value === 'custom') {
                  // Just reveal the picker locally — nothing is committed
                  // to the parent (and no refetch happens) until Apply.
                  setShowCustomPicker(true)
                } else {
                  setShowCustomPicker(false)
                  onChange({ datePreset: o.value, fromDate: null, toDate: null })
                  setOpen(false)
                }
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFD')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
              style={{
                padding: '9px 12px', fontSize: 12.5, cursor: 'pointer',
                fontWeight: (o.value === 'custom' ? showCustomPicker : datePreset === o.value) ? 700 : 500,
                color: (o.value === 'custom' ? showCustomPicker : datePreset === o.value) ? C.navy : '#374151',
                borderBottom: o.value === 'custom' ? 'none' : '1px solid #F0F4FA',
              }}
            >
              {o.label}
            </div>
          ))}

          {showCustomPicker && (
            <div
              // Stop mousedown from bubbling to the document-level outside-click
              // listener — without this, interacting with the calendar was
              // being treated as an "outside click" and closing the whole
              // dropdown before a date could be picked.
              onMouseDown={e => e.stopPropagation()}
              style={{ padding: 10, borderTop: '1px solid #F0F4FA', background: '#F8FAFD' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 4px 8px', fontSize: 11, fontWeight: 700, color: '#6b7280' }}>
                <span>{localFrom ? localFrom : 'Pick start date'}</span>
                <span style={{ color: '#c7ccd4' }}>→</span>
                <span>{localTo ? localTo : 'Pick end date'}</span>
              </div>
              <div style={{ background: '#fff', border: '1px solid #E4EEF8', borderRadius: 10 }}>
                <RangeCalendar
                  from={localFrom}
                  to={localTo}
                  onPick={handlePick}
                  minIso={calendarMin}
                  maxIso={calendarMax}
                />
              </div>
              <span style={{ display: 'block', marginTop: 8, fontSize: 10.5, color: '#9ca3af' }}>
                Click a start date, then an end date. Range can't exceed 6 months.
              </span>
              <button
                onClick={applyCustomRange}
                disabled={!localFrom || !localTo}
                style={{
                  marginTop: 8, width: '100%', padding: '7px 10px', borderRadius: 8, border: 'none',
                  background: (!localFrom || !localTo) ? '#c7ccd4' : C.navy, color: '#fff', fontSize: 12, fontWeight: 700,
                  cursor: (!localFrom || !localTo) ? 'not-allowed' : 'pointer',
                }}
              >
                Apply
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}