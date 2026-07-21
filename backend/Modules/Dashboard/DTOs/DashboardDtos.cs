namespace backend.Modules.Dashboard.DTOs;

// ─────────────────────────────────────────────────────────────
//  Every field below is computed from col_db.* columns that
//  actually exist — no new tables/columns. Dashboards are split
//  so the same chart never appears twice:
//    Management        → portfolio-wide overview (cases, ₹, geography, product, strategy mix)
//    Collection Manager → operational bucket/branch/state/product recovery detail
//    Admin              → strategy lifecycle + approvals + communications only
// ─────────────────────────────────────────────────────────────

// ── Shared ───────────────────────────────────────────────────
public class BucketStatDto
{
    public string Bucket { get; set; } = "";
    public int TotalCases { get; set; }
    public int ResolvedCases { get; set; }
    public decimal OutstandingAmount { get; set; }
    public decimal RecoveryRate { get; set; }
}
public class StatusCountDto
{
    public string Status { get; set; } = "";
    public int Count { get; set; }
}
public class NameCountDto
{
    public string Name { get; set; } = "";
    public int Count { get; set; }
}

// ════════════════════════════════════════════════════════════
//  1. MANAGEMENT DASHBOARD — portfolio-wide overview
// ════════════════════════════════════════════════════════════
public class ManagementDashboardDto
{
    // KPI strip
    public int TotalCases { get; set; }              // pre_emi + dpd + bounce
    public decimal TotalOutstanding { get; set; }     // dpd + bounce total_outstanding
    public int ActiveStrategies { get; set; }
    public int PendingApprovals { get; set; }
    public int TotalBranches { get; set; }
    public decimal AverageDpd { get; set; }           // AVG(dpd_cases.dpd)
    public int BounceCases { get; set; }
    public int CommunicationSentToday { get; set; }
    public decimal RecoveryRate { get; set; }         // DPD+Bounce with a recorded payment

    // Charts / tables
    public List<MonthlyAmountDto> OutstandingTrend { get; set; } = new();   // by month of created_at
    public List<BucketStatDto> CasesByBucket { get; set; } = new();
    public List<ZoneStatDto> TopUnresolvedZones { get; set; } = new();
    public List<NameCountDto> StateWiseCases { get; set; } = new();
    public List<BranchAmountDto> BranchWiseOutstanding { get; set; } = new(); // top 10
    public List<ProductPortfolioDto> ProductWisePortfolio { get; set; } = new();
    public List<NameCountDto> StrategyDistribution { get; set; } = new();    // cases per strategy
    public List<StatusCountDto> CaseStatusDistribution { get; set; } = new();
}
public class MonthlyAmountDto
{
    public string Month { get; set; } = ""; // e.g. "2026-05"
    public decimal Amount { get; set; }
}
public class ZoneStatDto
{
    public int Rank { get; set; }
    public string Zone { get; set; } = "";
    public decimal OutstandingAmount { get; set; } // ₹ Cr
    public int Cases { get; set; }
    public decimal RecoveryRate { get; set; }
}
public class BranchAmountDto
{
    public string BranchName { get; set; } = "";
    public decimal OutstandingAmount { get; set; }
    public int Cases { get; set; }
}
public class ProductPortfolioDto
{
    public string ProductName { get; set; } = "";
    public decimal OutstandingAmount { get; set; }
    public int Cases { get; set; }
}

// ════════════════════════════════════════════════════════════
//  2. COLLECTION MANAGER DASHBOARD — operational recovery detail
// ════════════════════════════════════════════════════════════
public class CollectionManagerDashboardDto
{
    // KPI strip
    public int TotalCases { get; set; }
    public int ResolvedCases { get; set; }
    public decimal OutstandingAmount { get; set; }
    public decimal AverageDpd { get; set; }

    public List<BucketPerformanceDto> BucketPerformance { get; set; } = new();
    public List<BranchRankDto> TopBranches { get; set; } = new();     // highest recovery rate
    public List<BranchRankDto> LowestBranches { get; set; } = new();  // lowest recovery rate
    public List<StateRankingDto> StateRanking { get; set; } = new();
    public List<ProductPortfolioDto> ProductRecoveryOpportunity { get; set; } = new(); // still-unresolved ₹ by product
    public List<NameCountDto> DpdDistribution { get; set; } = new();  // 0-30 / 31-60 / 61-90 / 91+
}
public class BucketPerformanceDto
{
    public string Bucket { get; set; } = "";
    public int Cases { get; set; }
    public decimal Outstanding { get; set; }
    public decimal AvgDpd { get; set; }
}
public class BranchRankDto
{
    public string BranchName { get; set; } = "";
    public int Cases { get; set; }
    public decimal OutstandingAmount { get; set; }
    public decimal RecoveryRate { get; set; }
}
public class StateRankingDto
{
    public string State { get; set; } = "";
    public decimal OutstandingAmount { get; set; }
    public int Cases { get; set; }
}

// ════════════════════════════════════════════════════════════
//  3. ADMIN DASHBOARD (formerly "Strategy") — strategies,
//     approvals, communications ONLY (no case/₹ overview here —
//     that lives on Management, to avoid repeating charts)
// ════════════════════════════════════════════════════════════
public class AdminDashboardDto
{
    public StrategyCardsDto StrategyCards { get; set; } = new();
    public List<StrategyTableRowDto> Strategies { get; set; } = new();
    public List<StatusCountDto> StrategyStatusPie { get; set; } = new();
    public List<StatusCountDto> JourneyTypeDistribution { get; set; } = new();
    public List<NameCountDto> ChannelUsage { get; set; } = new();       // strategy_steps.channel
    public double AverageStepsPerStrategy { get; set; }
    public List<StrategyTimelineDto> StrategyTimeline { get; set; } = new();

    public ApprovalCardsDto ApprovalCards { get; set; } = new();
    public List<ApprovalTimelineDto> ApprovalTimeline { get; set; } = new();

    public CommunicationCardsDto CommunicationCards { get; set; } = new();
    public List<StatusCountDto> CommunicationStatusBreakdown { get; set; } = new();
}
public class StrategyCardsDto
{
    public int Active { get; set; }
    public int Draft { get; set; }
    public int PendingApproval { get; set; }
    // expiry_date has passed, regardless of status — ARCHIVED was retired
    // in favor of strategy_status_master (no archival status anymore),
    // so "expired" is purely date-driven.
    public int Expired { get; set; }
}
public class StrategyTableRowDto
{
    public long StrategyId { get; set; }
    public string StrategyName { get; set; } = "";
    public string Bucket { get; set; } = "";
    public string JourneyType { get; set; } = "";
    public string StatusCode { get; set; } = "";  // raw enum (e.g. "PENDING_APPROVAL") — used by the frontend to pick the pill color
    public string Status { get; set; } = "";      // pre-formatted display name (e.g. "Pending Approval"), joined from strategy_status_master
    public int Priority { get; set; }
    public DateTime EffectiveDate { get; set; }
    public DateTime? ExpiryDate { get; set; }
}
public class StrategyTimelineDto
{
    public string StrategyName { get; set; } = "";
    public string StrategyCode { get; set; } = "";
    public DateTime CreatedAt { get; set; }
}
public class ApprovalCardsDto
{
    public int Pending { get; set; }
    public int ApprovedToday { get; set; }
    public int RejectedToday { get; set; }
    public double? AvgApprovalTimeHours { get; set; }
}
public class ApprovalTimelineDto
{
    public string StrategyName { get; set; } = "";
    public string Action { get; set; } = "";
    public string FromStatus { get; set; } = "";
    public string ToStatus { get; set; } = "";
    public string ActorRole { get; set; } = "";
    public DateTime PerformedAt { get; set; }
    public string? Remarks { get; set; }
}
public class CommunicationCardsDto
{
    public int TotalMessages { get; set; }
    public int Email { get; set; }
    public int Sms { get; set; }
    public int WhatsApp { get; set; }
    public int Voice { get; set; }
    public decimal SuccessRate { get; set; }
}

// ── Geo hierarchy (cascading Zone → Region → Branch filters) ─
public class BranchNodeDto
{
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
}
public class RegionNodeDto
{
    public string RegionCode { get; set; } = "";
    public List<BranchNodeDto> Branches { get; set; } = new();
}
public class ZoneNodeDto
{
    public string ZoneCode { get; set; } = "";
    public List<RegionNodeDto> Regions { get; set; } = new();
}

// ── Top Unresolved Cases (filterable by zone / region / branch) ──
public class UnresolvedCaseDto
{
    public string CaseRef { get; set; } = "";
    public string CustomerName { get; set; } = "";
    public string Journey { get; set; } = "";
    public string Bucket { get; set; } = "";
    public string BranchName { get; set; } = "";
    public string? ZoneCode { get; set; }
    public string? RegionCode { get; set; }
    public int? Dpd { get; set; }
    public decimal TotalOutstanding { get; set; }
    public string Status { get; set; } = "";
}