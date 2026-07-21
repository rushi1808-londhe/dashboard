import React from 'react'
import { AlertTriangle, ArrowUp, ArrowDown } from 'lucide-react'
import { Inbox } from 'lucide-react'

// ── Palette ──────────────────────────────────────────────────
export const C = {
  navy: '#050058', blue: '#000182', ice: '#D9EAF5',
  gold: '#CE9B01', white: '#FFFFFF', bg: '#F0F4FA',
}
export function NoDataFound({ message = 'No data found', height = 200 }: { message?: string; height?: number }) {
  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height, gap: 8, color: '#9ca3af',
      }}
    >
      <Inbox size={26} strokeWidth={1.5} />
      <p style={{ margin: 0, fontSize: 12.5, fontWeight: 500 }}>{message}</p>
    </div>
  )
}

export const hasData = (arr: any) => Array.isArray(arr) && arr.length > 0

// ── Recharts Tooltip ─────────────────────────────────────────
export const ChartTooltip = ({ active, payload, label, formatter }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'#fff', border:'1px solid #D9EAF5', borderRadius:12, padding:'10px 14px', boxShadow:'0 4px 20px rgba(5,0,88,.10)', fontSize:12 }}>
      <p style={{ fontWeight:700, color:'#050058', marginBottom:6, margin:'0 0 6px' }}>{label ?? payload[0]?.payload?.name ?? ''}</p>
      {payload.map((p: any, i: number) => {
        const [displayValue, displayName] = formatter
          ? formatter(p.value, p.name, p)
          : [typeof p.value === 'number' && p.value > 999 ? p.value.toLocaleString('en-IN') : p.value, p.name]
        return (
          <div key={i} style={{ display:'flex', justifyContent:'space-between', gap:16, color:'#374151', marginTop:3 }}>
            <span style={{ display:'flex', alignItems:'center', gap:5 }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background:p.color||p.fill, display:'inline-block' }}/>
              {displayName}
            </span>
            <strong style={{ color:'#050058' }}>{displayValue}</strong>
          </div>
        )
      })}
    </div>
  )
}

// ── KPI Card ─────────────────────────────────────────────────
interface KpiCardProps {
  label: string; value: React.ReactNode; sub?: string; change?: number
  icon: React.ReactNode; topColor?: string; iconBg?: string; iconColor?: string
}
export function KpiCard({ label, value, sub, change, icon, topColor = C.navy, iconBg = C.ice, iconColor = C.navy }: KpiCardProps) {
  const pos = (change ?? 0) >= 0
  return (
    <div style={{ background:'#fff', border:'1px solid #E4EEF8', borderRadius:16, padding:20, borderTop:`3px solid ${topColor}`, boxShadow:'0 1px 6px rgba(5,0,88,.06)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
        <p style={{ fontSize:11, fontWeight:600, color:'#6b7280', textTransform:'uppercase', letterSpacing:'.07em', margin:0 }}>{label}</p>
        <div style={{ width:36, height:36, borderRadius:10, background:iconBg, color:iconColor, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{icon}</div>
      </div>
      <p style={{ fontSize:24, fontWeight:800, color:C.navy, margin:0, lineHeight:1 }}>{value}</p>
      {sub && <p style={{ fontSize:11, color:'#9ca3af', marginTop:6, margin:'6px 0 0' }}>{sub}</p>}
      {change !== undefined && (
        <p style={{ display:'flex', alignItems:'center', gap:3, fontSize:11, marginTop:6, fontWeight:700, color:pos ? '#16a34a' : '#dc2626', margin:'6px 0 0' }}>
          {pos ? <ArrowUp size={11} strokeWidth={3}/> : <ArrowDown size={11} strokeWidth={3}/>} {Math.abs(change)}% vs last month
        </p>
      )}
    </div>
  )
}

// ── Card wrapper ─────────────────────────────────────────────
export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background:'#fff', border:'1px solid #E4EEF8', borderRadius:16, padding:20, boxShadow:'0 1px 6px rgba(5,0,88,.06)', ...style }}>
      {children}
    </div>
  )
}

// ── Section heading inside a card ────────────────────────────
export function CardHead({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
      <div>
        <h3 style={{ margin:0, fontSize:14, fontWeight:700, color:C.navy }}>{title}</h3>
        {sub && <p style={{ margin:'4px 0 0', fontSize:11, color:'#9ca3af' }}>{sub}</p>}
      </div>
      {action}
    </div>
  )
}

// ── Status pill ──────────────────────────────────────────────
type PillVariant = 'green'|'red'|'yellow'|'blue'|'gray'
const PS: Record<PillVariant, React.CSSProperties> = {
  green:  { background:'#dcfce7', color:'#16a34a' },
  red:    { background:'#fee2e2', color:'#dc2626' },
  yellow: { background:'#fef9c3', color:'#92400e' },
  blue:   { background:'#dbeafe', color:'#1d4ed8' },
  gray:   { background:'#f3f4f6', color:'#6b7280' },
}
export function Pill({ label, variant = 'gray' }: { label: string; variant?: PillVariant }) {
  return <span style={{ ...PS[variant], fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, whiteSpace:'nowrap' }}>{label}</span>
}

// ── Status dot ───────────────────────────────────────────────
export function StatusDot({ status }: { status: string }) {
  const c = status==='Success'?'#16a34a': status==='Warning'?'#CE9B01': status==='Running'?'#000182':'#dc2626'
  return <span style={{ width:10, height:10, borderRadius:'50%', background:c, display:'inline-block', flexShrink:0 }}/>
}

// ── Loading ──────────────────────────────────────────────────
export function LoadingState() {
  return (
    <div style={{ padding:24 }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:20 }}>
        {[...Array(4)].map((_,i)=>(
          <div key={i} style={{ height:100, borderRadius:16, background:'#E4EEF8', animation:'pulse 1.5s infinite' }}/>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16 }}>
        {[...Array(2)].map((_,i)=>(
          <div key={i} style={{ height:260, borderRadius:16, background:'#E4EEF8', animation:'pulse 1.5s infinite' }}/>
        ))}
      </div>
    </div>
  )
}

// ── Error ────────────────────────────────────────────────────
export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:80, gap:16 }}>
      <AlertTriangle size={48} color="#dc2626" strokeWidth={1.5}/>
      <p style={{ color:'#dc2626', fontWeight:600, fontSize:15, margin:0 }}>{message}</p>
      <button onClick={onRetry} style={{ padding:'8px 24px', background:C.navy, color:'#fff', border:'none', borderRadius:10, cursor:'pointer', fontSize:13, fontWeight:600 }}>
        Retry
      </button>
    </div>
  )
}

// ── Format helpers ───────────────────────────────────────────
export const fmtNum = (n?: number | null) =>
  (n ?? 0).toLocaleString("en-IN");

export const fmtAmt = (n?: number | null) => {
  n = n ?? 0;

  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
};

export const fmtCr = (n?: number | null) =>
  `₹${(n ?? 0).toFixed(2)} Cr`;

// Returns short label + real value in brackets e.g. "1.3K (1,364)"  or  "₹2.0L (₹2,03,500)"
export const fmtShortWithReal = (n?: number | null): string => {
  const v = n ?? 0
  const real = v.toLocaleString('en-IN')
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr\n(₹${real})`
  if (v >= 100000)   return `₹${(v / 100000).toFixed(1)}L\n(₹${real})`
  if (v >= 1000)     return `${(v / 1000).toFixed(1)}K\n(${real})`
  return String(v)
}

// Severity gradient: lightest for Pre-EMI (least risky) ramping up to
// solid red for NPA (most risky/written-off). Keeps the visual reading
// "the redder the bar, the worse the bucket" consistent with the fixed
// left-to-right ascending order (Pre-EMI → 0+ → 30+ → 60+ → NPA).
export const BUCKET_COLORS: Record<string,string> = {
  'Pre-EMI':  '#22c55e',  // green   — safest
  '0+':   '#a3d925',  // yellow-green
  '30+':  '#f2c317',  // yellow  — caution
  '60+':  '#f07d1a',  // orange  — high risk
  'NPA':      '#dc2626',  // red     — worst / written-off
}

// Canonical bucket ordering, used to force chart/table order regardless
// of whatever order the API happens to return rows in.
export const BUCKET_ORDER = ['Pre-EMI', '0+', '30+', '60+', 'NPA']

export function sortByBucket<T extends { bucket: string }>(rows: T[] = []): T[] {
  return [...rows].sort(
    (a, b) => BUCKET_ORDER.indexOf(a.bucket) - BUCKET_ORDER.indexOf(b.bucket)
  )
}

export const fmtDate = (d?: string | null) => {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return '—'
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const fmtDateTime = (d?: string | null) => {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return '—'
  return dt.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// ── ShortValue — rounds off only if ≥ 1 Lakh, no bracket below ──
export function ShortValue({ n, prefix = '' }: { n?: number | null; prefix?: string }) {
  const v = n ?? 0

  // Only round off if value is 1 Lakh or above
  if (v >= 10000000) {
    return <>{prefix}{(v / 10000000).toFixed(1)} Cr</>
  }
  if (v >= 100000) {
    return <>{prefix}{(v / 100000).toFixed(1)} L</>
  }

  // Below 1 Lakh — show exact value with commas, no rounding
  return <>{prefix}{v.toLocaleString('en-IN')}</>
}