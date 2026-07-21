import React, { useMemo, useState, useEffect } from 'react'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from 'recharts'
import { useDashboard } from '../../hooks/useDashboard'
import {
  Target, FileEdit, Clock, CalendarX, Puzzle, Radio
} from 'lucide-react'
import {
  KpiCard, Card, CardHead, Pill, ChartTooltip,
  LoadingState, ErrorState, NoDataFound, hasData,
  C, fmtNum, fmtDate, fmtDateTime, BUCKET_COLORS
} from '../shared/DashboardShared'
import FilterBar from '../shared/AdminFilterBar'
import type { AdminFilter } from '../../types/dashboard'

const PIE_COLORS = ['#050058', '#000182', '#0ea5e9', '#CE9B01', '#16a34a', '#dc2626', '#9ca3af']

const STATUS_PILL_COLORS: Record<string, string> = {
  ACTIVE: '#16a34a', APPROVED: '#16a34a', DRAFT: '#6b7280',
  PENDING_APPROVAL: '#92400e', INACTIVE: '#6b7280', REJECTED: '#dc2626',
}
const STATUS_PILL_BG: Record<string, string> = {
  ACTIVE: '#dcfce7', APPROVED: '#dcfce7', DRAFT: '#f3f4f6',
  PENDING_APPROVAL: '#fef9c3', INACTIVE: '#f3f4f6', REJECTED: '#fee2e2',
}

// Still needed for bucket/journeyType/approval-action/actorRole/communication
// fields — those aren't joined to a lookup table on the backend yet, unlike
// strategy status (now via strategy_status_master) and channelUsage (via
// channel_master), both of which come pre-formatted from the API.
const titleCase = (value?: string | null) => {
  if (!value) return '—'
  return value
    .toLowerCase()
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// Buckets like "npa" should render as the acronym "NPA"; numeric buckets
// like "0+", "30+", "60+" pass through titleCase unchanged.
const formatBucket = (value?: string | null) => {
  if (!value) return '—'
  return value.toUpperCase() === 'NPA' ? 'NPA' : titleCase(value)
}

// Case Type = Journey + Bucket combined:
// - DPD journeys show "DPD (bucket)" e.g. "DPD (30+)"
// - Everything else (Pre-EMI, Bounce, etc.) shows just the journey label
const caseTypeLabel = (journeyType?: string | null, bucket?: string | null) => {
  const journey = titleCase(journeyType)
  if ((journeyType || '').toUpperCase() === 'DPD') {
    return `DPD (${formatBucket(bucket)})`
  }
  return journey
}

export default function AdminDashboard() {
  const [filter, setFilter] = useState<AdminFilter>({ search: '', status: null, bucket: null, datePreset: null, fromDate: null, toDate: null });
  const { data, loading, error, refetch } = useDashboard("admin", filter);

  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);

  // Every filter change reflows the result set, so jump back to page 1
  // rather than risk landing on a page that no longer exists.
  useEffect(() => { setPage(1) }, [filter.search, filter.status, filter.bucket, filter.datePreset, filter.fromDate, filter.toDate])

  const strategies = data?.strategies ?? [];
  const totalPages = Math.ceil(strategies.length / PAGE_SIZE);

  const paginatedStrategies = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return strategies.slice(start, start + PAGE_SIZE);
  }, [strategies, page]);

  if (loading) return (
    <div style={{ padding: 24, background: C.bg, minHeight: '100vh' }}>
      <FilterBar filter={filter} onChange={setFilter} />
      <LoadingState />
    </div>
  );
  if (error || !data)
    return (
      <div style={{ padding: 24, background: C.bg, minHeight: '100vh' }}>
        <FilterBar filter={filter} onChange={setFilter} />
        <ErrorState message={error ?? "No data"} onRetry={refetch} />
      </div>
    );

  const d = data;
  const sc = d.strategyCards;
  const ac = d.approvalCards;
  const cc = d.communicationCards;

  // status now comes pre-formatted from the backend (joined to strategy_status_master.status_name) — no titleCase needed here anymore
  const statusPie = (d.strategyStatusPie ?? []).map((s, i) => ({ name: s.status, value: s.count, fill: PIE_COLORS[i % PIE_COLORS.length] }))

  // channel now comes pre-formatted from the backend (joined to channel_master.channel_name) — no titleCase needed here anymore
  const channelBar = (d.channelUsage ?? []).map(c => ({ channel: c.name, count: c.count }))

  return (
    <div style={{ padding: 24, background: C.bg, minHeight: '100vh' }}>
          <FilterBar filter={filter} onChange={setFilter} />
      {/* ── KPI strip ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 20 }}>
        <KpiCard label="Active Strategies" value={fmtNum(sc.active)} sub="Currently live" icon={<Target size={18} />} topColor={C.navy} />
        <KpiCard label="Draft Strategies" value={fmtNum(sc.draft)} sub="Not yet submitted" icon={<FileEdit size={18} />} topColor="#6b7280" iconBg="#f3f4f6" />
        <KpiCard label="Pending Approval" value={fmtNum(sc.pendingApproval)} sub="Maker-checker queue" icon={<Clock size={18} />} topColor={C.gold} iconBg="#fef3c7" />
        <KpiCard label="Expired Strategies" value={fmtNum(sc.expired)} sub="Past expiry date" icon={<CalendarX size={18} />} topColor="#dc2626" iconBg="#fee2e2" />
      </div>

      {/* ── Row 2: Strategies table ─────────────────────── */}
      <Card style={{ marginBottom: 20, padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #E4EEF8' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.navy }}>Strategies</h3>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#9ca3af' }}>Bucket, journey and lifecycle for every strategy</p>
          </div>
          <button style={{ background: `linear-gradient(135deg,${C.gold},#f0b800)`, color: C.navy, border: 'none', borderRadius: 10, padding: '8px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            + New Strategy
          </button>
        </div>

        <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 500 }}>
          {hasData(paginatedStrategies) ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F8FAFD', borderBottom: '1px solid #E4EEF8' }}>
                  {['Strategy Name', 'Case Type', 'Status', 'Priority', 'Effective Date', 'Expiry Date', 'Action'].map(h => (
                    <th
                      key={h}
                      style={{
                        textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 700,
                        color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.05em', whiteSpace: 'nowrap',
                        position: 'sticky', top: 0, background: '#F8FAFD', zIndex: 1,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedStrategies.map((s) => {
                  const bcol = BUCKET_COLORS[s.bucket] ?? C.navy;
                  return (
                    <tr
                      key={s.strategyId}
                      style={{ borderBottom: '1px solid #F0F4FA' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFD')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 8, background: C.ice, color: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Puzzle size={14} />
                          </div>
                          <span style={{ fontWeight: 600, color: C.navy }}>{s.strategyName}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            background: bcol + '22', color: bcol, fontSize: 10.5, fontWeight: 700,
                            borderRadius: 20, whiteSpace: 'nowrap', width: 118, height: 26,
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            overflow: 'hidden', textOverflow: 'ellipsis',
                          }}
                          title={caseTypeLabel(s.journeyType, s.bucket)}
                        >
                          {caseTypeLabel(s.journeyType, s.bucket)}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {/* s.status is the pre-formatted display name (strategy_status_master.status_name);
                            s.statusCode is the raw enum used only to pick the badge color */}
                        <span
                          style={{
                            background: STATUS_PILL_BG[s.statusCode] ?? '#f3f4f6',
                            color: STATUS_PILL_COLORS[s.statusCode] ?? '#6b7280',
                            fontSize: 10.5, fontWeight: 700,
                            borderRadius: 20, whiteSpace: 'nowrap', width: 118, height: 26,
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            overflow: 'hidden', textOverflow: 'ellipsis',
                          }}
                          title={s.status}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: C.navy }}>{s.priority}</td>
                      <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: 12 }}>{fmtDate(s.effectiveDate)}</td>
                      <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: 12 }}>{fmtDate(s.expiryDate)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <button style={{ fontSize: 11, fontWeight: 600, color: C.navy, border: '1px solid #E4EEF8', background: '#fff', borderRadius: 8, padding: '4px 12px', cursor: 'pointer' }}>
                          View ↗
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <NoDataFound message="No strategies found" height={220} />
          )}
        </div>

        {hasData(strategies) && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 20px',
              borderTop: '1px solid #E4EEF8',
              background: '#fff',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <span style={{ fontSize: 12, color: '#6b7280' }}>
              Showing {(page - 1) * PAGE_SIZE + 1} -
              {Math.min(page * PAGE_SIZE, strategies.length)} of {strategies.length}
            </span>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #E4EEF8', background: page === 1 ? '#F3F4F6' : '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer' }}
              >
                Previous
              </button>

              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid #E4EEF8', background: page === i + 1 ? C.navy : '#fff', color: page === i + 1 ? '#fff' : C.navy, fontWeight: 600, cursor: 'pointer' }}
                >
                  {i + 1}
                </button>
              ))}

              <button
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
                style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #E4EEF8', background: page === totalPages ? '#F3F4F6' : '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* ── Row 3: Approval Overview + Communication Overview ─ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>

        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #E4EEF8' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={16} color={C.gold} />
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.navy }}>Approval Overview</h3>
            </div>
            <Pill label={`${ac.pending} pending`} variant="yellow" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, padding: '16px 20px' }}>
            {[
              { l: 'Approved Today', v: fmtNum(ac.approvedToday) },
              { l: 'Rejected Today', v: fmtNum(ac.rejectedToday) },
              { l: 'Avg Approval Time', v: ac.avgApprovalTimeHours != null ? `${ac.avgApprovalTimeHours.toFixed(1)}h` : '—' },
            ].map(m => (
              <div key={m.l} style={{ background: '#F8FAFD', borderRadius: 10, padding: '10px 6px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.navy }}>{m.v}</p>
                <p style={{ margin: '3px 0 0', fontSize: 10, color: '#9ca3af' }}>{m.l}</p>
              </div>
            ))}
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {hasData(d.approvalTimeline) ? (
              (d.approvalTimeline ?? []).slice(0, 8).map((a, i) => (
                <div key={i} style={{ padding: '10px 20px', borderTop: '1px solid #F0F4FA', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.navy, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.strategyName}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9ca3af' }}>
                      {titleCase(a.action)} · {a.fromStatus} → {a.toStatus} · {titleCase(a.actorRole)}
                    </p>
                  </div>
                  <span style={{ fontSize: 10, color: '#9ca3af', whiteSpace: 'nowrap' }}>{fmtDateTime(a.performedAt)}</span>
                </div>
              ))
            ) : (
              <NoDataFound message="No approval activity yet" height={160} />
            )}
          </div>
        </Card>

        <Card>
          <CardHead title="Communication Overview" sub={`${cc.successRate}% success rate across channels`} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 16 }}>
            {[
              { l: 'Email', v: cc.email }, { l: 'SMS', v: cc.sms },
              { l: 'WhatsApp', v: cc.whatsApp }, { l: 'Voice', v: cc.voice },
            ].map(m => (
              <div key={m.l} style={{ background: '#fff', border: '1px solid #E4EEF8', borderRadius: 10, padding: '10px 4px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.navy }}>{fmtNum(m.v)}</p>
                <p style={{ margin: '3px 0 0', fontSize: 10, color: '#9ca3af' }}>{m.l}</p>
              </div>
            ))}
          </div>
          <p style={{ margin: '0 0 10px', fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 700 }}>
            Total messages: {fmtNum(cc.totalMessages)} · Status breakdown
          </p>
          <div>
            {hasData(d.communicationStatusBreakdown) ? (
              (d.communicationStatusBreakdown ?? []).map(s => {
                const pct = cc.totalMessages > 0 ? Math.round((s.count / cc.totalMessages) * 100) : 0
                return (
                  <div key={s.status} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 12, color: '#374151' }}>{titleCase(s.status)}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.navy }}>{fmtNum(s.count)}</span>
                    </div>
                    <div style={{ height: 6, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: C.navy, borderRadius: 4 }} />
                    </div>
                  </div>
                )
              })
            ) : (
              <NoDataFound message="No communication data" height={100} />
            )}
          </div>
        </Card>
      </div>

      {/* ── Row 4: Strategy Status + Channel Usage ───────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        <Card style={{ display: 'flex', flexDirection: 'column' }}>
          <CardHead title="Strategy Status" />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            {hasData(statusPie) ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={statusPie} cx="50%" cy="50%" innerRadius={54} outerRadius={80} paddingAngle={3} dataKey="value">
                      {statusPie.map((e, i) => <Cell key={i} fill={e.fill} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => fmtNum(v)} contentStyle={{ background: '#fff', border: '1px solid #E4EEF8', borderRadius: 12, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {statusPie.map(p => (
                    <span key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#6b7280' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.fill, display: 'inline-block' }} />{p.name} ({fmtNum(p.value)})
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <NoDataFound message="No status data" height={200} />
            )}
          </div>
        </Card>

        <Card>
          <CardHead title="Most Used Channels" sub={`Avg ${d.averageStepsPerStrategy?.toFixed(1) ?? 0} steps per strategy`} />
          {hasData(channelBar) ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={channelBar} layout="vertical" margin={{ top: 0, right: 30, left: 24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4EEF8" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="channel" tick={{ fill: '#374151', fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" name="Steps" fill={C.navy} radius={[0, 6, 6, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <NoDataFound message="No channel usage data" height={200} />
          )}
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Radio size={13} color="#9ca3af" />
            <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>
              Journey types: {(d.journeyTypeDistribution ?? []).map(j => `${titleCase(j.status)} (${j.count})`).join(' · ') || '—'}
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}