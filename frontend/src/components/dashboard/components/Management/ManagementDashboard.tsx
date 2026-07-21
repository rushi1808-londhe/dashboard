import React, { useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, ComposedChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from 'recharts'
import { useDashboard } from '../../hooks/useDashboard'
import {
  FolderOpen, IndianRupee, Target, Clock, Building2, Activity, MessageSquareText, AlertOctagon
} from 'lucide-react'
import {
  KpiCard, Card, CardHead, ChartTooltip,
  LoadingState, ErrorState, NoDataFound, hasData,
  C, fmtCr, fmtNum, fmtAmt, BUCKET_COLORS, sortByBucket
} from '../shared/DashboardShared'
import FilterBar from '../shared/FilterBar'
import type { GeoFilter } from '../../types/dashboard'
// import CasesMapView from '../Maps/Map'

const grid = { display: 'grid', gap: 16 } as const
const shortAmt = (v: number) => {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`
  return `₹${v.toLocaleString('en-IN')}`
}
// Donut colors for Case Status (Pending / Assigned / Closed / other)
const STATUS_COLORS: Record<string, string> = {
  Pending: C.gold, Assigned: C.blue, Closed: '#16a34a',
}
const STATUS_FALLBACK = [C.navy, C.ice, '#9ca3af']

export default function ManagementDashboard() {
  const [filter, setFilter] = useState<GeoFilter>({ zoneCode: null, regionCode: null, branchName: null, datePreset: null, fromDate: null, toDate: null })
  const { data, loading, error, refetch } = useDashboard('management', filter)

  if (loading) return (
    <div style={{ padding: 24, background: C.bg, minHeight: '100vh' }}>
      <FilterBar filter={filter} onChange={setFilter} />
      <LoadingState />
    </div>
  )
  if (error || !data) return (
    <div style={{ padding: 24, background: C.bg, minHeight: '100vh' }}>
      <FilterBar filter={filter} onChange={setFilter} />
      <ErrorState message={error ?? 'No data'} onRetry={refetch} />
    </div>
  )

  const d = data
  const statusPie = (d.caseStatusDistribution ?? []).map((s, i) => ({
    name: s.status, value: s.count,
    fill: STATUS_COLORS[s.status] ?? STATUS_FALLBACK[i % STATUS_FALLBACK.length],
  }))
  const topBranches = (d.branchWiseOutstanding ?? []).slice(0, 10)

  return (
    <div style={{ padding: 24, background: C.bg, minHeight: '100vh' }}>
      <FilterBar filter={filter} onChange={setFilter} />

      {/* ── KPI Row ───────────────────────────────────────── */}
      <div style={{ ...grid, gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
        <KpiCard label="Total Cases" value={fmtNum(d.totalCases)} sub="Pre-EMI + DPD + Bounce" icon={<FolderOpen size={18} />} topColor={C.navy} />
        <KpiCard label="Total Outstanding" value={fmtAmt(d.totalOutstanding)} sub="DPD + Bounce outstanding" icon={<IndianRupee size={18} />} topColor={C.gold} iconBg="#fef3c7" />
        <KpiCard label="Active Strategies" value={fmtNum(d.activeStrategies)} sub="Currently live" icon={<Target size={18} />} topColor={C.blue} iconBg="#dbeafe" />
        <KpiCard label="Pending Approvals" value={fmtNum(d.pendingApprovals)} sub="Maker-checker queue" icon={<Clock size={18} />} topColor="#db2777" iconBg="#fce7f3" />
        <KpiCard label="Total Branches" value={fmtNum(d.totalBranches)} sub="Active branch network" icon={<Building2 size={18} />} topColor={C.navy} />
        <KpiCard label="Average DPD" value={fmtNum(Math.round(d.averageDpd ?? 0))} sub="Across DPD cases" icon={<Activity size={18} />} topColor={C.gold} iconBg="#fef3c7" />
        <KpiCard label="Bounce Cases" value={fmtNum(d.bounceCases)} sub="Payment bounce cases" icon={<AlertOctagon size={18} />} topColor="#16a34a" iconBg="#dcfce7" />
        <KpiCard label="Communication Sent Today" value={fmtNum(d.communicationSentToday)} sub="All channels" icon={<MessageSquareText size={18} />} topColor={C.blue} iconBg="#dbeafe" />
      </div>

      {/* ── Row 2: Outstanding Trend + Case Status Donut ───── */}
      <div style={{ ...grid, gridTemplateColumns: '2fr 1fr', marginBottom: 20 }}>

        {/* Outstanding Trend */}
        <Card>
          <CardHead title="Outstanding Trend" sub="Total outstanding (₹) by month" />
          {hasData(d.outstandingTrend) ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={d.outstandingTrend} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="gOS" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.navy} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={C.navy} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4EEF8" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={v => {
                    if (v >= 10000000) return `₹${(v / 10000000).toFixed(0)}Cr`
                    if (v >= 100000) return `₹${(v / 100000).toFixed(0)}L`
                    return `₹${v}`
                  }}
                />
                <Tooltip content={<ChartTooltip />} formatter={(value: number) => [fmtAmt(value), 'Outstanding']} />
                <Area type="monotone" dataKey="amount" name="Outstanding" stroke={C.navy} strokeWidth={2.5} fill="url(#gOS)" dot={{ fill: C.navy, r: 4, stroke: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <NoDataFound message="No outstanding trend data" height={220} />
          )}
        </Card>

        {/* Case Status Donut */}
        <Card style={{ display: 'flex', flexDirection: 'column' }}>
          <CardHead title="Case Status" />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 0 }}>
            {hasData(statusPie) ? (
              <>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={statusPie} cx="50%" cy="50%" innerRadius={44} outerRadius={64} paddingAngle={3} dataKey="value">
                      {statusPie.map((e, i) => <Cell key={i} fill={e.fill} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => fmtNum(v)} contentStyle={{ background: '#fff', border: '1px solid #E4EEF8', borderRadius: 12, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    width: '100%',
                    padding: '0 16px',
                    flex: '1 1 auto',
                    minHeight: 0,
                    maxHeight: 220,
                    overflowY: 'auto',
                  }}
                >
                  {statusPie.map(p => (
                    <div
                      key={p.name}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: 12,
                        flexShrink: 0,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.fill, flexShrink: 0, display: 'inline-block' }} />
                        <span style={{ color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.name}
                        </span>
                      </div>
                      <span style={{ fontWeight: 700, color: C.navy, flexShrink: 0, marginLeft: 8 }}>
                        {fmtNum(p.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <NoDataFound message="No case status data" height={180} />
            )}
          </div>
        </Card>
      </div>

      {/* ── Row 3: Bucket (Composed) + Branch Wise Outstanding ─ */}
      <div style={{ ...grid, gridTemplateColumns: '1fr 1fr', marginBottom: 20 }}>

        {/* Cases by Bucket — Composed bar+line */}
        <Card>
          <CardHead title="Cases by Bucket" sub="Amount (₹) + Case count" />
          {hasData(d.casesByBucket) ? (
            <ResponsiveContainer width="100%" height={230}>
              <ComposedChart data={sortByBucket(d.casesByBucket)} margin={{ top: 4, right: 10, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4EEF8" vertical={false} />
                <XAxis dataKey="bucket" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  yAxisId="l"
                  tick={{ fill: '#9ca3af', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => {
                    if (v >= 10000000) return `₹${(v / 10000000).toFixed(0)}Cr`
                    if (v >= 100000) return `₹${(v / 100000).toFixed(0)}L`
                    return `₹${v}`
                  }}
                />
                <YAxis yAxisId="r" orientation="right" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  content={
                    <ChartTooltip
                      formatter={(value: number, name: string) =>
                        name === 'Amount' ? [shortAmt(value), name] : [value.toLocaleString('en-IN'), name]
                      }
                    />
                  }
                />
                <Bar yAxisId="l" dataKey="outstandingAmount" name="Amount" radius={[6, 6, 0, 0]} maxBarSize={44}>
                  {sortByBucket(d.casesByBucket).map((b, i) => <Cell key={i} fill={BUCKET_COLORS[b.bucket] ?? C.navy} />)}
                </Bar>
                <Line yAxisId="r" type="monotone" dataKey="totalCases" name="Cases" stroke={C.gold} strokeWidth={2.5} dot={{ fill: C.gold, r: 4, stroke: '#fff', strokeWidth: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <NoDataFound message="No bucket-wise case data" height={230} />
          )}
        </Card>

        {/* Branch Wise Outstanding — Top 10 */}
        <Card>
          <CardHead title="Branch Wise Outstanding" sub="Top 10 branches by outstanding amount" />
          {hasData(topBranches) ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={topBranches} layout="vertical" margin={{ top: 0, right: 36, left: 28, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4EEF8" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={v => {
                    if (v >= 10000000) return `₹${(v / 10000000).toFixed(0)}Cr`
                    if (v >= 100000) return `₹${(v / 100000).toFixed(0)}L`
                    return `₹${v}`
                  }}
                />
                <YAxis
                  type="category"
                  dataKey="branchName"
                  tick={{ fill: '#374151', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={90}
                  interval={0}
                />
                <Tooltip content={<ChartTooltip />} formatter={(value: number) => [fmtAmt(value), 'Outstanding']} />
                <Bar dataKey="outstandingAmount" name="Outstanding" radius={[0, 6, 6, 0]} barSize={16} fill={C.navy} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <NoDataFound message="No branch outstanding data" height={230} />
          )}
        </Card>
      </div>

      {/* ── Row 4: Top 10 Unresolved Zones ──────────────────── */}
      {/* <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #E4EEF8' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.navy }}>Top 10 Unresolved Zones</h3>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#9ca3af' }}>Highest outstanding — drill down available</p>
          </div>
          <button style={{ fontSize: 12, fontWeight: 600, color: C.navy, border: '1px solid #E4EEF8', background: '#fff', borderRadius: 10, padding: '6px 14px', cursor: 'pointer' }}>
            View All ↗
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F8FAFD', borderBottom: '1px solid #E4EEF8' }}>
                {['Rank', 'Zone', 'Outstanding (Cr)', 'Cases', 'Recovery Rate', 'Action'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(d.topUnresolvedZones ?? []).map((z, i) => (
                <tr key={z.zone} style={{ borderBottom: '1px solid #F0F4FA' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFD')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ width: 24, height: 24, borderRadius: '50%', background: i === 0 ? '#fef3c7' : i <= 2 ? C.ice : '#f3f4f6', color: i === 0 ? C.gold : C.navy, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>{z.rank}</span>
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: C.navy }}>{z.zone}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: C.navy }}>{fmtCr(z.outstandingAmount)}</td>
                  <td style={{ padding: '12px 16px', color: '#374151' }}>{fmtNum(z.cases)}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 80, height: 6, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${z.recoveryRate}%`, height: '100%', background: z.recoveryRate >= 50 ? C.gold : C.navy, borderRadius: 4 }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: z.recoveryRate >= 50 ? '#92400e' : '#dc2626' }}>{z.recoveryRate}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button style={{ fontSize: 11, fontWeight: 600, color: C.navy, border: '1px solid #E4EEF8', background: '#fff', borderRadius: 8, padding: '4px 12px', cursor: 'pointer' }}>Drill ↗</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card> */}

      {/* <CasesMapView/> */}

    </div>
  )
}