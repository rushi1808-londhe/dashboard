import React, { useState } from 'react'
import {
  BarChart, Bar, ComposedChart, Line, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'
import { useDashboard } from '../../hooks/useDashboard'
import { FolderOpen, CheckCircle2, IndianRupee, Activity } from 'lucide-react'
import {
  KpiCard, Card, CardHead, ChartTooltip,
  LoadingState, ErrorState, NoDataFound, hasData,
  ShortValue, C, fmtNum, fmtAmt, BUCKET_COLORS, sortByBucket
} from '../shared/DashboardShared'
import FilterBar from '../shared/FilterBar'
import type { GeoFilter } from '../../types/dashboard'

export default function CollectionDashboard() {
  const [filter, setFilter] = useState<GeoFilter>({ zoneCode: null, regionCode: null, branchName: null, datePreset: null, fromDate: null, toDate: null })
  const { data, loading, error, refetch } = useDashboard('collection', filter)

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
  const bucketRows = sortByBucket(d.bucketPerformance as any) as typeof d.bucketPerformance

  // Merge top + lowest branches into a single ranked list, best → worst
  const branchRanking = [...(d.topBranches ?? []), ...(d.lowestBranches ?? [])]
    .filter((b, i, arr) => arr.findIndex(x => x.branchName === b.branchName) === i)
    .sort((a, b) => b.recoveryRate - a.recoveryRate)
    .slice(0, 10)

  return (
    <div style={{ padding: 24, background: C.bg, minHeight: '100vh' }}>
          <FilterBar filter={filter} onChange={setFilter} />
      {/* ── KPI strip ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 20 }}>
        <KpiCard label="Total Cases" value={<ShortValue n={d.totalCases} />} sub="Across all DPD buckets" icon={<FolderOpen size={18} />} topColor={C.navy} />
        <KpiCard label="Resolved Cases" value={<ShortValue n={d.resolvedCases} />} sub="Successfully closed" icon={<CheckCircle2 size={18} />} topColor="#16a34a" iconBg="#dcfce7" />
        <KpiCard label="Outstanding Amount" value={fmtAmt(d.outstandingAmount)} sub="Currently unresolved" icon={<IndianRupee size={18} />} topColor={C.blue} iconBg="#dbeafe" />
        <KpiCard label="Average DPD" value={fmtNum(Math.round(d.averageDpd ?? 0))} sub="Days past due, avg" icon={<Activity size={18} />} topColor={C.gold} iconBg="#fef3c7" />
      </div>

      {/* ── Row 2: Bucket Performance + Branch Ranking ────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 20 }}>

        {/* Cases by bucket — cases + avg DPD */}
        <Card>
          <CardHead title="Bucket Performance" sub="Case count & average DPD per bucket" />
          {hasData(bucketRows) ? (
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={bucketRows} margin={{ top: 4, right: 10, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4EEF8" vertical={false} />
                <XAxis dataKey="bucket" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="l" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="r" orientation="right" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar yAxisId="l" dataKey="cases" name="Cases" radius={[4, 4, 0, 0]} barSize={30}>
                  {bucketRows.map((b, i) => <Cell key={i} fill={BUCKET_COLORS[b.bucket] ?? C.navy} />)}
                </Bar>
                <Line yAxisId="r" type="monotone" dataKey="avgDpd" name="Avg DPD" stroke={C.gold} strokeWidth={2.5} dot={{ fill: C.gold, r: 4, stroke: '#fff', strokeWidth: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <NoDataFound message="No bucket performance data" height={240} />
          )}
        </Card>

        {/* Branch Ranking */}
        <Card>
          <CardHead title="Branch Ranking" sub="By recovery rate — best to worst" />
          {hasData(branchRanking) ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={branchRanking} layout="vertical" margin={{ top: 0, right: 30, left: 24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4EEF8" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <YAxis type="category" dataKey="branchName" tick={{ fill: '#374151', fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip content={<ChartTooltip />} formatter={(v: number) => [`${v}%`, 'Recovery Rate']} />
                <Bar dataKey="recoveryRate" name="Recovery Rate" radius={[0, 6, 6, 0]} barSize={14}>
                  {branchRanking.map((b, i) => (
                    <Cell key={i} fill={b.recoveryRate >= 50 ? '#16a34a' : b.recoveryRate >= 30 ? C.gold : '#dc2626'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <NoDataFound message="No branch data" height={240} />
          )}
        </Card>
      </div>

      {/* ── Row 3: Bucket Detail Table + DPD Distribution side by side ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16, marginBottom: 20 }}>

        {/* Bucket Performance Detail */}
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E4EEF8' }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.navy }}>Bucket Performance Detail</h3>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#9ca3af' }}>Case count, outstanding and average DPD per bucket</p>
          </div>
          {hasData(bucketRows) ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '25%' }} />
                <col style={{ width: '25%' }} />
                <col style={{ width: '25%' }} />
                <col style={{ width: '25%' }} />
              </colgroup>
              <thead>
                <tr style={{ background: '#F8FAFD', borderBottom: '1px solid #E4EEF8' }}>
                  {['Bucket', 'Cases', 'Outstanding', 'Avg DPD'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bucketRows.map(b => {
                  const col = BUCKET_COLORS[b.bucket] ?? C.navy
                  const dpdPct = Math.min(100, Math.round(((b.avgDpd ?? 0) / 180) * 100))
                  return (
                    <tr key={b.bucket} style={{ borderBottom: '1px solid #F0F4FA' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFD')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: col + '22', color: col, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>{b.bucket}</span>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: C.navy }}>
                        <ShortValue n={b.cases} />
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: C.navy }}>
                        {fmtAmt(b.outstanding)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: '100%', maxWidth: 140, height: 6, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ width: `${dpdPct}%`, height: '100%', background: col, borderRadius: 4 }} />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: col, flexShrink: 0 }}>{fmtNum(Math.round(b.avgDpd ?? 0))}d</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <NoDataFound message="No bucket detail data" height={220} />
          )}
        </Card>

        {/* DPD Distribution */}
        <Card>
          <CardHead title="DPD Distribution" sub="Case count by days-past-due band" />
          {hasData(d.dpdDistribution) ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={d.dpdDistribution} margin={{ top: 4, right: 4, left: -18, bottom: 0 }} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke="#E4EEF8" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" name="Cases" radius={[6, 6, 0, 0]} maxBarSize={70}>
                  {(d.dpdDistribution ?? []).map((_, i) => (
                    <Cell key={i} fill={[C.navy, C.blue, C.gold, '#dc2626'][i % 4]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <NoDataFound message="No DPD distribution data" height={240} />
          )}
        </Card>
      </div>
    </div>
  )
}