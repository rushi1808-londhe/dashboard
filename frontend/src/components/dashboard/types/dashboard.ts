// ─────────────────────────────────────────────────────────────
//  Dashboard Types — mirrors backend DTOs exactly
//  API base: /api/dashboard/{management|collection-manager|admin}
// ─────────────────────────────────────────────────────────────

// ── Shared ──────────────────────────────────────────────────
export interface BucketStat {
  bucket: string; totalCases: number; resolvedCases: number
  outstandingAmount: number; recoveryRate: number
}
export interface StatusCount { status: string; count: number }
export interface NameCount { name: string; count: number }

// ── Management ──────────────────────────────────────────────
export interface MonthlyAmount { month: string; amount: number }
export interface ZoneStat {
  rank: number; zone: string; outstandingAmount: number
  cases: number; recoveryRate: number
}
export interface BranchAmount { branchName: string; outstandingAmount: number; cases: number }
export interface ProductPortfolio { productName: string; outstandingAmount: number; cases: number }

export interface ManagementDashboard {
  totalCases: number
  totalOutstanding: number
  activeStrategies: number
  pendingApprovals: number
  totalBranches: number
  averageDpd: number
  bounceCases: number
  communicationSentToday: number
  recoveryRate: number

  outstandingTrend: MonthlyAmount[]
  casesByBucket: BucketStat[]
  topUnresolvedZones: ZoneStat[]
  stateWiseCases: NameCount[]
  branchWiseOutstanding: BranchAmount[]
  productWisePortfolio: ProductPortfolio[]
  strategyDistribution: NameCount[]
  caseStatusDistribution: StatusCount[]
}

// ── Collection Manager ────────────────────────────────────────
export interface BucketPerformance {
  bucket: string; cases: number; outstanding: number; avgDpd: number
}
export interface BranchRank {
  branchName: string; cases: number; outstandingAmount: number; recoveryRate: number
}
export interface StateRanking { state: string; outstandingAmount: number; cases: number }

export interface CollectionManagerDashboard {
  totalCases: number
  resolvedCases: number
  outstandingAmount: number
  averageDpd: number

  bucketPerformance: BucketPerformance[]
  topBranches: BranchRank[]
  lowestBranches: BranchRank[]
  stateRanking: StateRanking[]
  productRecoveryOpportunity: ProductPortfolio[]
  dpdDistribution: NameCount[]
}

// ── Admin (Strategy) ───────────────────────────────────────────
export interface StrategyCards {
  active: number; draft: number; pendingApproval: number; expired: number
}
export interface StrategyTableRow {
  strategyId: number; strategyName: string; bucket: string
  journeyType: string
  statusCode: string   // raw enum (e.g. "PENDING_APPROVAL") — used for pill color lookup
  status: string        // pre-formatted display name (e.g. "Pending Approval")
  priority: number
  effectiveDate: string; expiryDate: string | null
}
export interface StrategyTimelineItem {
  strategyName: string; strategyCode: string; createdAt: string
}
export interface ApprovalCards {
  pending: number; approvedToday: number; rejectedToday: number
  avgApprovalTimeHours: number | null
}
export interface ApprovalTimelineItem {
  strategyName: string; action: string; fromStatus: string; toStatus: string
  actorRole: string; performedAt: string; remarks: string | null
}
export interface CommunicationCards {
  totalMessages: number; email: number; sms: number; whatsApp: number
  voice: number; successRate: number
}

export interface AdminDashboard {
  strategyCards: StrategyCards
  strategies: StrategyTableRow[]
  strategyStatusPie: StatusCount[]
  journeyTypeDistribution: StatusCount[]
  channelUsage: NameCount[]
  averageStepsPerStrategy: number
  strategyTimeline: StrategyTimelineItem[]

  approvalCards: ApprovalCards
  approvalTimeline: ApprovalTimelineItem[]

  communicationCards: CommunicationCards
  communicationStatusBreakdown: StatusCount[]
}

export type DashboardRole = 'management' | 'collection' | 'admin'

// ── Geo hierarchy (for the Zone/Region/Branch filter dropdowns) ─
export interface BranchNode { code: string; name: string }
export interface RegionNode { regionCode: string; branches: BranchNode[] }
export interface ZoneNode { zoneCode: string; regions: RegionNode[] }

export type DateRangePreset = 'last_week' | '1_month' | '3_month' | '6_month' | 'custom'

export interface GeoFilter {
  zoneCode: string | null
  regionCode: string | null
  branchName: string | null
  // ── Date range filter ──
  datePreset: DateRangePreset | null
  fromDate: string | null // ISO date (YYYY-MM-DD), only meaningful when datePreset === 'custom'
  toDate: string | null   // ISO date (YYYY-MM-DD), only meaningful when datePreset === 'custom'
}

// The 6 lifecycle states a strategy can be in — mirrors strategy_status_master.
export type StrategyStatusCode = 'ACTIVE' | 'APPROVED' | 'DRAFT' | 'PENDING_APPROVAL' | 'INACTIVE' | 'REJECTED'

// Admin dashboard has its own, unrelated filter shape: no geography,
// instead a live text search over strategies plus a status dropdown.
export interface AdminFilter {
  search: string
  status: StrategyStatusCode | null
  bucket: string | null
  datePreset: DateRangePreset | null
  fromDate: string | null
  toDate: string | null
}