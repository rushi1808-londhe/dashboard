using Dapper;
using Npgsql;
using backend.Modules.Dashboard.DTOs;

namespace backend.Modules.Dashboard.Repositories;

public interface IDashboardRepository
{
    Task<ManagementDashboardDto> GetManagementDashboardAsync(string? zoneCode, string? regionCode, string? branchName, DateTime? fromDate, DateTime? toDate);
    Task<CollectionManagerDashboardDto> GetCollectionManagerDashboardAsync(string? zoneCode, string? regionCode, string? branchName, DateTime? fromDate, DateTime? toDate);
    Task<AdminDashboardDto> GetAdminDashboardAsync(string? search, string? status, string? bucket, DateTime? fromDate, DateTime? toDate);
    Task<List<ZoneNodeDto>> GetGeoHierarchyAsync();
    Task<List<UnresolvedCaseDto>> GetTopUnresolvedCasesAsync(string? zoneCode, string? regionCode, string? branchName, DateTime? fromDate, DateTime? toDate);
}

public class DashboardRepository : IDashboardRepository
{
    private readonly string _connectionString;

    public DashboardRepository(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection")!;
    }

    private NpgsqlConnection GetConnection() => new NpgsqlConnection(_connectionString);

    // Unifies pre_emi_cases / dpd_cases / bounce_cases into one shape.
    // pre_emi_cases has no branch_name/state/dpd/last_payment_* columns
    // in the real schema, so those come through NULL for Pre-EMI rows.
    // NOTE: because Pre-EMI rows have branch_name = NULL, any zone/region/
    // branch filter (LEFT JOIN col_db.branches ... WHERE zoneCode = ...)
    // will naturally exclude Pre-EMI cases whenever a filter is active,
    // since NULL branch_name can never match a real zone/region/branch.
    private const string AllCasesCte = @"
        WITH all_cases AS (
            SELECT case_ref, customer_name, 'Pre-EMI'::varchar AS journey_type, 'Pre-EMI'::varchar AS bucket,
                   NULL::varchar AS branch_name, NULL::varchar AS state, NULL::integer AS dpd,
                   pre_emi_amount AS total_outstanding, NULL::date AS last_payment_date,
                   strategy_id, status, product_name, is_active, created_at, updated_at
            FROM col_db.pre_emi_cases
            UNION ALL
            SELECT case_ref, customer_name, 'DPD'::varchar, bucket, branch_name, state, dpd, total_outstanding,
                   last_payment_date, strategy_id, status, product_name, is_active, created_at, updated_at
            FROM col_db.dpd_cases
            UNION ALL
            SELECT case_ref, customer_name, 'Bounce'::varchar, bucket, branch_name, state, dpd, total_outstanding,
                   last_payment_date, strategy_id, status, product_name, is_active, created_at, updated_at
            FROM col_db.bounce_cases
        )
    ";

    // Standard WHERE-clause fragment applied wherever a query already has
    // a `b` alias joined to col_db.branches. Kept as a comment-only guide —
    // inlined literally in each query below since Dapper needs the params
    // named consistently as @zoneCode/@regionCode/@branchName.

    // ═══════════════════════════════════════════════════════
    //  1. MANAGEMENT DASHBOARD
    // ═══════════════════════════════════════════════════════
    public async Task<ManagementDashboardDto> GetManagementDashboardAsync(string? zoneCode, string? regionCode, string? branchName, DateTime? fromDate, DateTime? toDate)
    {
        using var conn = GetConnection();
        await conn.OpenAsync();
        var dto = new ManagementDashboardDto();
        var p = new { zoneCode, regionCode, branchName, fromDate, toDate };

        // Case-derived KPIs (total cases/outstanding/avg DPD/bounce) are
        // filterable by branch geography. Strategy/branch/communication
        // counts below are not branch-scoped in the schema (strategies
        // aren't linked to a branch, communication_logs has no branch_name),
        // so they're left unfiltered except total_branches, which reflects
        // the filtered branch count itself.
        var caseTotals = await conn.QueryFirstOrDefaultAsync(AllCasesCte + @"
            SELECT
                COUNT(*) FILTER (WHERE ac.is_active) AS total_cases,
                COALESCE(SUM(ac.total_outstanding) FILTER (WHERE ac.is_active AND ac.journey_type <> 'Pre-EMI'), 0) AS total_outstanding,
                ROUND(AVG(ac.dpd) FILTER (WHERE ac.is_active AND ac.dpd IS NOT NULL), 1) AS average_dpd,
                COUNT(*) FILTER (WHERE ac.is_active AND ac.journey_type = 'Bounce') AS bounce_cases
            FROM all_cases ac
            LEFT JOIN col_db.branches b ON b.name = ac.branch_name
            WHERE (@zoneCode IS NULL OR b.zone_code = @zoneCode)
              AND (@regionCode IS NULL OR b.region_code = @regionCode)
              AND (@branchName IS NULL OR ac.branch_name = @branchName)
              AND (@fromDate::timestamp IS NULL OR ac.created_at >= @fromDate::timestamp)
              AND (@toDate::timestamp IS NULL OR ac.created_at <= @toDate::timestamp)", p);

        var otherKpi = await conn.QueryFirstOrDefaultAsync(@"
            SELECT
                (SELECT COUNT(*) FROM col_db.strategies WHERE status = 'ACTIVE' AND is_active) AS active_strategies,
                (SELECT COUNT(*) FROM col_db.strategies WHERE status = 'PENDING_APPROVAL') AS pending_approvals,
                (SELECT COUNT(*) FROM col_db.branches b
                    WHERE (@zoneCode IS NULL OR b.zone_code = @zoneCode)
                      AND (@regionCode IS NULL OR b.region_code = @regionCode)
                      AND (@branchName IS NULL OR b.name = @branchName)) AS total_branches,
                (SELECT COUNT(*) FROM col_db.communication_logs WHERE created_on::date = CURRENT_DATE) AS comm_sent_today", p);

        dto.TotalCases = (int)(long)(caseTotals?.total_cases ?? 0L);
        dto.TotalOutstanding = Convert.ToDecimal(caseTotals?.total_outstanding ?? 0);
        dto.AverageDpd = caseTotals?.average_dpd == null ? 0m : Convert.ToDecimal(caseTotals.average_dpd);
        dto.BounceCases = (int)(long)(caseTotals?.bounce_cases ?? 0L);
        dto.ActiveStrategies = (int)(long)(otherKpi?.active_strategies ?? 0L);
        dto.PendingApprovals = (int)(long)(otherKpi?.pending_approvals ?? 0L);
        dto.TotalBranches = (int)(long)(otherKpi?.total_branches ?? 0L);
        dto.CommunicationSentToday = (int)(long)(otherKpi?.comm_sent_today ?? 0L);

        var rate = await conn.QueryFirstOrDefaultAsync<decimal?>(AllCasesCte + @"
            SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE ac.journey_type <> 'Pre-EMI' AND ac.last_payment_date IS NOT NULL)
                / NULLIF(COUNT(*) FILTER (WHERE ac.journey_type <> 'Pre-EMI'), 0), 1)
            FROM all_cases ac
            LEFT JOIN col_db.branches b ON b.name = ac.branch_name
            WHERE ac.is_active
              AND (@zoneCode IS NULL OR b.zone_code = @zoneCode)
              AND (@regionCode IS NULL OR b.region_code = @regionCode)
              AND (@branchName IS NULL OR ac.branch_name = @branchName)
              AND (@fromDate::timestamp IS NULL OR ac.created_at >= @fromDate::timestamp)
              AND (@toDate::timestamp IS NULL OR ac.created_at <= @toDate::timestamp)", p);
        dto.RecoveryRate = rate ?? 0m;

        var trend = await conn.QueryAsync(@"
            SELECT to_char(x.created_at, 'YYYY-MM') AS month, SUM(x.total_outstanding) AS amount
            FROM (
                SELECT created_at, total_outstanding, branch_name FROM col_db.dpd_cases
                UNION ALL
                SELECT created_at, total_outstanding, branch_name FROM col_db.bounce_cases
            ) x
            LEFT JOIN col_db.branches b ON b.name = x.branch_name
            WHERE (@zoneCode IS NULL OR b.zone_code = @zoneCode)
              AND (@regionCode IS NULL OR b.region_code = @regionCode)
              AND (@branchName IS NULL OR x.branch_name = @branchName)
              AND (@fromDate::timestamp IS NULL OR x.created_at >= @fromDate::timestamp)
              AND (@toDate::timestamp IS NULL OR x.created_at <= @toDate::timestamp)
            GROUP BY 1 ORDER BY 1", p);
        dto.OutstandingTrend = trend.Select(r => new MonthlyAmountDto { Month = r.month, Amount = Convert.ToDecimal(r.amount ?? 0) }).ToList();

        var buckets = await conn.QueryAsync<BucketStatDto>(AllCasesCte + @"
            SELECT ac.bucket AS Bucket,
                COUNT(*) FILTER (WHERE ac.is_active) AS TotalCases,
                COUNT(*) FILTER (WHERE ac.is_active AND ac.last_payment_date IS NOT NULL) AS ResolvedCases,
                COALESCE(SUM(ac.total_outstanding) FILTER (WHERE ac.is_active), 0) AS OutstandingAmount,
                ROUND(100.0 * COUNT(*) FILTER (WHERE ac.is_active AND ac.last_payment_date IS NOT NULL) / NULLIF(COUNT(*) FILTER (WHERE ac.is_active), 0), 1) AS RecoveryRate
            FROM all_cases ac
            LEFT JOIN col_db.branches b ON b.name = ac.branch_name
            WHERE (@zoneCode IS NULL OR b.zone_code = @zoneCode)
              AND (@regionCode IS NULL OR b.region_code = @regionCode)
              AND (@branchName IS NULL OR ac.branch_name = @branchName)
              AND (@fromDate::timestamp IS NULL OR ac.created_at >= @fromDate::timestamp)
              AND (@toDate::timestamp IS NULL OR ac.created_at <= @toDate::timestamp)
            GROUP BY ac.bucket
            ORDER BY CASE ac.bucket WHEN 'Pre-EMI' THEN 1 WHEN '0+ DPD' THEN 2 WHEN '30+ DPD' THEN 3 WHEN '60+ DPD' THEN 4 WHEN 'NPA' THEN 5 ELSE 6 END", p);
        dto.CasesByBucket = buckets.ToList();

        // NOTE: if a zone/region/branch filter narrows the result to a
        // single zone, this "top unresolved zones" ranking will trivially
        // show just that one zone (or none, if it has no unresolved cases).
        // Consider hiding this card client-side when a filter is active.
        var zones = await conn.QueryAsync(AllCasesCte + @"
            SELECT
                ROW_NUMBER() OVER (ORDER BY SUM(ac.total_outstanding) FILTER (WHERE ac.last_payment_date IS NULL) DESC NULLS LAST) AS rank,
                b.zone_code AS zone,
                ROUND(COALESCE(SUM(ac.total_outstanding) FILTER (WHERE ac.last_payment_date IS NULL), 0) / 10000000.0, 2) AS outstanding_amount,
                COUNT(*) FILTER (WHERE ac.last_payment_date IS NULL) AS cases,
                ROUND(100.0 * COUNT(*) FILTER (WHERE ac.last_payment_date IS NOT NULL) / NULLIF(COUNT(*), 0), 0) AS recovery_rate
            FROM all_cases ac
            JOIN col_db.branches b ON b.name = ac.branch_name
            WHERE ac.is_active AND b.zone_code IS NOT NULL
              AND (@zoneCode IS NULL OR b.zone_code = @zoneCode)
              AND (@regionCode IS NULL OR b.region_code = @regionCode)
              AND (@branchName IS NULL OR ac.branch_name = @branchName)
              AND (@fromDate::timestamp IS NULL OR ac.created_at >= @fromDate::timestamp)
              AND (@toDate::timestamp IS NULL OR ac.created_at <= @toDate::timestamp)
            GROUP BY b.zone_code
            HAVING COUNT(*) FILTER (WHERE ac.last_payment_date IS NULL) > 0
            ORDER BY SUM(ac.total_outstanding) FILTER (WHERE ac.last_payment_date IS NULL) DESC NULLS LAST
            LIMIT 10", p);
        dto.TopUnresolvedZones = zones.Select(r => new ZoneStatDto
        {
            Rank = (int)(long)r.rank,
            Zone = r.zone ?? "",
            OutstandingAmount = Convert.ToDecimal(r.outstanding_amount ?? 0),
            Cases = Convert.ToInt32(r.cases ?? 0),
            RecoveryRate = Convert.ToDecimal(r.recovery_rate ?? 0)
        }).ToList();

        var states = await conn.QueryAsync(@"
            SELECT x.state AS name, COUNT(*) AS count FROM (
                SELECT state, branch_name, created_at FROM col_db.dpd_cases WHERE is_active
                UNION ALL
                SELECT state, branch_name, created_at FROM col_db.bounce_cases WHERE is_active
            ) x
            LEFT JOIN col_db.branches b ON b.name = x.branch_name
            WHERE (@zoneCode IS NULL OR b.zone_code = @zoneCode)
              AND (@regionCode IS NULL OR b.region_code = @regionCode)
              AND (@branchName IS NULL OR x.branch_name = @branchName)
              AND (@fromDate::timestamp IS NULL OR x.created_at >= @fromDate::timestamp)
              AND (@toDate::timestamp IS NULL OR x.created_at <= @toDate::timestamp)
            GROUP BY x.state ORDER BY count DESC", p);
        dto.StateWiseCases = states.Select(r => new NameCountDto { Name = r.name ?? "Unknown", Count = (int)(long)r.count }).ToList();

        var branchOut = await conn.QueryAsync(@"
            SELECT x.branch_name, SUM(x.total_outstanding) AS outstanding_amount, COUNT(*) AS cases FROM (
                SELECT branch_name, total_outstanding, created_at FROM col_db.dpd_cases WHERE is_active
                UNION ALL
                SELECT branch_name, total_outstanding, created_at FROM col_db.bounce_cases WHERE is_active
            ) x
            LEFT JOIN col_db.branches b ON b.name = x.branch_name
            WHERE (@zoneCode IS NULL OR b.zone_code = @zoneCode)
              AND (@regionCode IS NULL OR b.region_code = @regionCode)
              AND (@branchName IS NULL OR x.branch_name = @branchName)
              AND (@fromDate::timestamp IS NULL OR x.created_at >= @fromDate::timestamp)
              AND (@toDate::timestamp IS NULL OR x.created_at <= @toDate::timestamp)
            GROUP BY x.branch_name ORDER BY outstanding_amount DESC LIMIT 10", p);
        dto.BranchWiseOutstanding = branchOut.Select(r => new BranchAmountDto
        { BranchName = r.branch_name ?? "", OutstandingAmount = Convert.ToDecimal(r.outstanding_amount ?? 0), Cases = (int)(long)(r.cases ?? 0L) }).ToList();

        var products = await conn.QueryAsync(@"
            SELECT x.product_name, SUM(x.amount) AS outstanding_amount, COUNT(*) AS cases FROM (
                SELECT product_name, pre_emi_amount AS amount, NULL::varchar AS branch_name, created_at FROM col_db.pre_emi_cases WHERE is_active
                UNION ALL
                SELECT product_name, total_outstanding AS amount, branch_name, created_at FROM col_db.dpd_cases WHERE is_active
                UNION ALL
                SELECT product_name, total_outstanding AS amount, branch_name, created_at FROM col_db.bounce_cases WHERE is_active
            ) x
            LEFT JOIN col_db.branches b ON b.name = x.branch_name
            WHERE (@zoneCode IS NULL OR b.zone_code = @zoneCode)
              AND (@regionCode IS NULL OR b.region_code = @regionCode)
              AND (@branchName IS NULL OR x.branch_name = @branchName)
              AND (@fromDate::timestamp IS NULL OR x.created_at >= @fromDate::timestamp)
              AND (@toDate::timestamp IS NULL OR x.created_at <= @toDate::timestamp)
            GROUP BY x.product_name ORDER BY outstanding_amount DESC", p);
        dto.ProductWisePortfolio = products.Select(r => new ProductPortfolioDto
        { ProductName = r.product_name ?? "", OutstandingAmount = Convert.ToDecimal(r.outstanding_amount ?? 0), Cases = (int)(long)(r.cases ?? 0L) }).ToList();

        var stratDist = await conn.QueryAsync(@"
            SELECT s.strategy_name AS name, COUNT(*) AS count FROM (
                SELECT strategy_id, NULL::varchar AS branch_name, created_at FROM col_db.pre_emi_cases WHERE strategy_id IS NOT NULL AND is_active
                UNION ALL
                SELECT strategy_id, branch_name, created_at FROM col_db.dpd_cases WHERE strategy_id IS NOT NULL AND is_active
                UNION ALL
                SELECT strategy_id, branch_name, created_at FROM col_db.bounce_cases WHERE strategy_id IS NOT NULL AND is_active
            ) x
            JOIN col_db.strategies s ON s.strategy_id = x.strategy_id
            LEFT JOIN col_db.branches b ON b.name = x.branch_name
            WHERE (@zoneCode IS NULL OR b.zone_code = @zoneCode)
              AND (@regionCode IS NULL OR b.region_code = @regionCode)
              AND (@branchName IS NULL OR x.branch_name = @branchName)
              AND (@fromDate::timestamp IS NULL OR x.created_at >= @fromDate::timestamp)
              AND (@toDate::timestamp IS NULL OR x.created_at <= @toDate::timestamp)
            GROUP BY s.strategy_name ORDER BY count DESC LIMIT 10", p);
        dto.StrategyDistribution = stratDist.Select(r => new NameCountDto { Name = r.name ?? "", Count = (int)(long)r.count }).ToList();

        var caseStatus = await conn.QueryAsync(@"
            SELECT COALESCE(csm.status_name, x.status) AS name, COUNT(*) AS count FROM (
                SELECT status, NULL::varchar AS branch_name, created_at FROM col_db.pre_emi_cases WHERE is_active
                UNION ALL
                SELECT status, branch_name, created_at FROM col_db.dpd_cases WHERE is_active
                UNION ALL
                SELECT status, branch_name, created_at FROM col_db.bounce_cases WHERE is_active
            ) x
            LEFT JOIN col_db.case_status_master csm ON csm.status_code = x.status
            LEFT JOIN col_db.branches b ON b.name = x.branch_name
            WHERE (@zoneCode IS NULL OR b.zone_code = @zoneCode)
              AND (@regionCode IS NULL OR b.region_code = @regionCode)
              AND (@branchName IS NULL OR x.branch_name = @branchName)
              AND (@fromDate::timestamp IS NULL OR x.created_at >= @fromDate::timestamp)
              AND (@toDate::timestamp IS NULL OR x.created_at <= @toDate::timestamp)
            GROUP BY COALESCE(csm.status_name, x.status)
            ORDER BY count DESC", p);
        dto.CaseStatusDistribution = caseStatus.Select(r => new StatusCountDto { Status = r.name ?? "", Count = (int)(long)r.count }).ToList();

        return dto;
    }

    // ═══════════════════════════════════════════════════════
    //  2. COLLECTION MANAGER DASHBOARD
    // ═══════════════════════════════════════════════════════
    public async Task<CollectionManagerDashboardDto> GetCollectionManagerDashboardAsync(string? zoneCode, string? regionCode, string? branchName, DateTime? fromDate, DateTime? toDate)
    {
        using var conn = GetConnection();
        await conn.OpenAsync();
        var dto = new CollectionManagerDashboardDto();
        var p = new { zoneCode, regionCode, branchName, fromDate, toDate };

        var kpi = await conn.QueryFirstOrDefaultAsync(AllCasesCte + @"
            SELECT
                COUNT(*) FILTER (WHERE ac.is_active) AS total_cases,
                COUNT(*) FILTER (WHERE ac.is_active AND ac.last_payment_date IS NOT NULL) AS resolved_cases,
                COALESCE(SUM(ac.total_outstanding) FILTER (WHERE ac.is_active), 0) AS outstanding_amount,
                ROUND(AVG(ac.dpd) FILTER (WHERE ac.is_active AND ac.dpd IS NOT NULL), 1) AS average_dpd
            FROM all_cases ac
            LEFT JOIN col_db.branches b ON b.name = ac.branch_name
            WHERE (@zoneCode IS NULL OR b.zone_code = @zoneCode)
              AND (@regionCode IS NULL OR b.region_code = @regionCode)
              AND (@branchName IS NULL OR ac.branch_name = @branchName)
              AND (@fromDate::timestamp IS NULL OR ac.created_at >= @fromDate::timestamp)
              AND (@toDate::timestamp IS NULL OR ac.created_at <= @toDate::timestamp)", p);
        dto.TotalCases = (int)(long)(kpi?.total_cases ?? 0L);
        dto.ResolvedCases = (int)(long)(kpi?.resolved_cases ?? 0L);
        dto.OutstandingAmount = Convert.ToDecimal(kpi?.outstanding_amount ?? 0);
        dto.AverageDpd = kpi?.average_dpd == null ? 0m : Convert.ToDecimal(kpi.average_dpd);

        var bp = await conn.QueryAsync(AllCasesCte + @"
            SELECT ac.bucket,
                COUNT(*) FILTER (WHERE ac.is_active) AS cases,
                COALESCE(SUM(ac.total_outstanding) FILTER (WHERE ac.is_active), 0) AS outstanding,
                ROUND(AVG(ac.dpd) FILTER (WHERE ac.is_active AND ac.dpd IS NOT NULL), 1) AS avg_dpd
            FROM all_cases ac
            LEFT JOIN col_db.branches b ON b.name = ac.branch_name
            WHERE (@zoneCode IS NULL OR b.zone_code = @zoneCode)
              AND (@regionCode IS NULL OR b.region_code = @regionCode)
              AND (@branchName IS NULL OR ac.branch_name = @branchName)
              AND (@fromDate::timestamp IS NULL OR ac.created_at >= @fromDate::timestamp)
              AND (@toDate::timestamp IS NULL OR ac.created_at <= @toDate::timestamp)
            GROUP BY ac.bucket
            ORDER BY CASE ac.bucket WHEN 'Pre-EMI' THEN 1 WHEN '0+ DPD' THEN 2 WHEN '30+ DPD' THEN 3 WHEN '60+ DPD' THEN 4 WHEN 'NPA' THEN 5 ELSE 6 END", p);
        dto.BucketPerformance = bp.Select(r => new BucketPerformanceDto
        {
            Bucket = r.bucket ?? "",
            Cases = (int)(long)(r.cases ?? 0L),
            Outstanding = Convert.ToDecimal(r.outstanding ?? 0),
            AvgDpd = r.avg_dpd == null ? 0m : Convert.ToDecimal(r.avg_dpd)
        }).ToList();

        // NOTE: if a branch filter is active, this ranking degenerates to a
        // single row (or is empty, since HAVING COUNT(*) >= 3 may exclude a
        // lone branch with few cases). Consider hiding this card client-side
        // when branchName is set.
        var branchRanks = (await conn.QueryAsync(@"
            SELECT x.branch_name, COUNT(*) AS cases, SUM(x.total_outstanding) AS outstanding_amount,
                ROUND(100.0 * COUNT(*) FILTER (WHERE x.last_payment_date IS NOT NULL) / NULLIF(COUNT(*), 0), 1) AS recovery_rate
            FROM (
                SELECT branch_name, total_outstanding, last_payment_date, created_at FROM col_db.dpd_cases WHERE is_active
                UNION ALL
                SELECT branch_name, total_outstanding, last_payment_date, created_at FROM col_db.bounce_cases WHERE is_active
            ) x
            LEFT JOIN col_db.branches b ON b.name = x.branch_name
            WHERE (@zoneCode IS NULL OR b.zone_code = @zoneCode)
              AND (@regionCode IS NULL OR b.region_code = @regionCode)
              AND (@branchName IS NULL OR x.branch_name = @branchName)
              AND (@fromDate::timestamp IS NULL OR x.created_at >= @fromDate::timestamp)
              AND (@toDate::timestamp IS NULL OR x.created_at <= @toDate::timestamp)
            GROUP BY x.branch_name
            HAVING COUNT(*) >= 3", p)).Select(r => new BranchRankDto
        {
            BranchName = r.branch_name ?? "",
            Cases = (int)(long)(r.cases ?? 0L),
            OutstandingAmount = Convert.ToDecimal(r.outstanding_amount ?? 0),
            RecoveryRate = r.recovery_rate == null ? 0m : Convert.ToDecimal(r.recovery_rate)
        }).ToList();
        dto.TopBranches = branchRanks.OrderByDescending(b => b.RecoveryRate).Take(5).ToList();
        dto.LowestBranches = branchRanks.OrderBy(b => b.RecoveryRate).Take(5).ToList();

        var stateRank = await conn.QueryAsync(@"
            SELECT x.state, SUM(x.total_outstanding) AS outstanding_amount, COUNT(*) AS cases FROM (
                SELECT state, total_outstanding, branch_name, created_at FROM col_db.dpd_cases WHERE is_active
                UNION ALL
                SELECT state, total_outstanding, branch_name, created_at FROM col_db.bounce_cases WHERE is_active
            ) x
            LEFT JOIN col_db.branches b ON b.name = x.branch_name
            WHERE (@zoneCode IS NULL OR b.zone_code = @zoneCode)
              AND (@regionCode IS NULL OR b.region_code = @regionCode)
              AND (@branchName IS NULL OR x.branch_name = @branchName)
              AND (@fromDate::timestamp IS NULL OR x.created_at >= @fromDate::timestamp)
              AND (@toDate::timestamp IS NULL OR x.created_at <= @toDate::timestamp)
            GROUP BY x.state ORDER BY outstanding_amount DESC", p);
        dto.StateRanking = stateRank.Select(r => new StateRankingDto
        { State = r.state ?? "Unknown", OutstandingAmount = Convert.ToDecimal(r.outstanding_amount ?? 0), Cases = (int)(long)(r.cases ?? 0L) }).ToList();

        var productOpp = await conn.QueryAsync(@"
            SELECT x.product_name, COUNT(*) AS cases, SUM(x.total_outstanding) AS outstanding_amount FROM (
                SELECT product_name, total_outstanding, branch_name, created_at FROM col_db.dpd_cases WHERE is_active AND last_payment_date IS NULL
                UNION ALL
                SELECT product_name, total_outstanding, branch_name, created_at FROM col_db.bounce_cases WHERE is_active AND last_payment_date IS NULL
            ) x
            LEFT JOIN col_db.branches b ON b.name = x.branch_name
            WHERE (@zoneCode IS NULL OR b.zone_code = @zoneCode)
              AND (@regionCode IS NULL OR b.region_code = @regionCode)
              AND (@branchName IS NULL OR x.branch_name = @branchName)
              AND (@fromDate::timestamp IS NULL OR x.created_at >= @fromDate::timestamp)
              AND (@toDate::timestamp IS NULL OR x.created_at <= @toDate::timestamp)
            GROUP BY x.product_name ORDER BY outstanding_amount DESC", p);
        dto.ProductRecoveryOpportunity = productOpp.Select(r => new ProductPortfolioDto
        { ProductName = r.product_name ?? "", OutstandingAmount = Convert.ToDecimal(r.outstanding_amount ?? 0), Cases = (int)(long)(r.cases ?? 0L) }).ToList();

        var dpdDist = await conn.QueryAsync(@"
            SELECT CASE
                WHEN x.dpd BETWEEN 0 AND 30 THEN '0-30'
                WHEN x.dpd BETWEEN 31 AND 60 THEN '31-60'
                WHEN x.dpd BETWEEN 61 AND 90 THEN '61-90'
                ELSE '91+' END AS name,
                COUNT(*) AS count
            FROM (
                SELECT dpd, branch_name, created_at FROM col_db.dpd_cases WHERE is_active
                UNION ALL
                SELECT dpd, branch_name, created_at FROM col_db.bounce_cases WHERE is_active
            ) x
            LEFT JOIN col_db.branches b ON b.name = x.branch_name
            WHERE (@zoneCode IS NULL OR b.zone_code = @zoneCode)
              AND (@regionCode IS NULL OR b.region_code = @regionCode)
              AND (@branchName IS NULL OR x.branch_name = @branchName)
              AND (@fromDate::timestamp IS NULL OR x.created_at >= @fromDate::timestamp)
              AND (@toDate::timestamp IS NULL OR x.created_at <= @toDate::timestamp)
            GROUP BY 1", p);
        var order = new Dictionary<string, int> { ["0-30"] = 1, ["31-60"] = 2, ["61-90"] = 3, ["91+"] = 4 };
        dto.DpdDistribution = dpdDist.Select(r => new NameCountDto { Name = r.name, Count = (int)(long)r.count })
            .OrderBy(r => order.GetValueOrDefault(r.Name, 99)).ToList();

        return dto;
    }

    // ═══════════════════════════════════════════════════════
    //  3. ADMIN DASHBOARD — strategies, approvals, comms
    //
    //  Filters here are `search` (matches strategy name/code) and
    //  `status` (one of the 6 strategy_status_master codes), plus the
    //  shared date range. They apply to every strategy-scoped query
    //  below (cards, table, status pie, journey mix, channel usage,
    //  avg steps, timeline, and approval overview — since approvals
    //  are joined back to a specific strategy). Communication overview
    //  is intentionally left unfiltered: communication_logs has no
    //  strategy linkage in this schema, so it reflects org-wide
    //  messaging activity regardless of which strategies are in view.
    //
    //  `bucket` doubles as the "Case Type" filter from the frontend:
    //  it can be a literal bucket value ('Pre-EMI', '0+', '30+', '60+',
    //  'NPA', 'Bounce'), OR the special value 'DPD' meaning "any DPD
    //  bucket" (0+/30+/60+/NPA combined). That special value is expanded
    //  below into `bucketList` before it ever reaches SQL, so every query
    //  matches against `s.bucket = ANY(@bucketList)` instead of a single
    //  exact string.
    // ═══════════════════════════════════════════════════════
    public async Task<AdminDashboardDto> GetAdminDashboardAsync(string? search, string? status, string? bucket, DateTime? fromDate, DateTime? toDate)
    {
        using var conn = GetConnection();
        await conn.OpenAsync();
        var dto = new AdminDashboardDto();
        var searchPattern = string.IsNullOrWhiteSpace(search) ? null : $"%{search.Trim()}%";

        // Expand the "DPD" case-type shorthand into all 4 DPD buckets.
        // Any other non-null bucket value is treated as a single exact match.
        string[]? bucketList = bucket switch
        {
            null => null,
            "DPD" => new[] { "0+", "30+", "60+", "NPA" },
            _ => new[] { bucket }
        };
        bool hasBucket = bucketList != null;
        var dp = new { fromDate, toDate, search = searchPattern, status, hasBucket, bucketList = bucketList ?? Array.Empty<string>() };

        var cards = await conn.QueryFirstOrDefaultAsync(@"
            SELECT
                COUNT(*) FILTER (WHERE status = 'ACTIVE' AND is_active) AS active,
                COUNT(*) FILTER (WHERE status = 'DRAFT') AS draft,
                COUNT(*) FILTER (WHERE status = 'PENDING_APPROVAL') AS pending_approval,
                COUNT(*) FILTER (WHERE expiry_date IS NOT NULL AND expiry_date < CURRENT_DATE) AS expired
            FROM col_db.strategies
            WHERE (@fromDate::timestamp IS NULL OR created_at >= @fromDate::timestamp)
              AND (@toDate::timestamp IS NULL OR created_at <= @toDate::timestamp)
              AND (@search::text IS NULL OR strategy_name ILIKE @search::text OR strategy_code ILIKE @search::text)
              AND (@status::text IS NULL OR status = @status::text)
              AND (NOT @hasBucket OR bucket = ANY(@bucketList::text[]))", dp);
        dto.StrategyCards = new StrategyCardsDto
        {
            Active = (int)(long)(cards?.active ?? 0L),
            Draft = (int)(long)(cards?.draft ?? 0L),
            PendingApproval = (int)(long)(cards?.pending_approval ?? 0L),
            Expired = (int)(long)(cards?.expired ?? 0L)
        };

        var strategies = await conn.QueryAsync(@"
            SELECT s.strategy_id, s.strategy_name, s.bucket, s.journey_type,
                   s.status AS status_code,
                   COALESCE(ssm.status_name, s.status) AS status_name,
                   s.priority, s.effective_date, s.expiry_date
            FROM col_db.strategies s
            LEFT JOIN col_db.strategy_status_master ssm ON ssm.status_code = s.status
            WHERE (@fromDate::timestamp IS NULL OR s.created_at >= @fromDate::timestamp)
              AND (@toDate::timestamp IS NULL OR s.created_at <= @toDate::timestamp)
              AND (@search::text IS NULL OR s.strategy_name ILIKE @search::text OR s.strategy_code ILIKE @search::text)
              AND (@status::text IS NULL OR s.status = @status::text)
              AND (NOT @hasBucket OR s.bucket = ANY(@bucketList::text[]))
            ORDER BY s.effective_date DESC LIMIT 50", dp);
        dto.Strategies = strategies.Select(r => new StrategyTableRowDto
        {
            StrategyId = (long)r.strategy_id,
            StrategyName = r.strategy_name ?? "",
            Bucket = r.bucket ?? "",
            JourneyType = r.journey_type ?? "",
            StatusCode = r.status_code ?? "",      // raw enum, used by the frontend pill color
            Status = r.status_name ?? "",          // pre-formatted display name
            Priority = (int)r.priority,
            EffectiveDate = r.effective_date is DateOnly edDate ? edDate.ToDateTime(TimeOnly.MinValue) : (DateTime)r.effective_date,
            ExpiryDate = r.expiry_date is DateOnly exDate ? exDate.ToDateTime(TimeOnly.MinValue) : (DateTime?)r.expiry_date
        }).ToList();

        var statusPie = await conn.QueryAsync(@"
            SELECT COALESCE(ssm.status_name, s.status) AS status, COUNT(*) AS count
            FROM col_db.strategies s
            LEFT JOIN col_db.strategy_status_master ssm ON ssm.status_code = s.status
            WHERE (@fromDate::timestamp IS NULL OR s.created_at >= @fromDate::timestamp)
              AND (@toDate::timestamp IS NULL OR s.created_at <= @toDate::timestamp)
              AND (@search::text IS NULL OR s.strategy_name ILIKE @search::text OR s.strategy_code ILIKE @search::text)
              AND (@status::text IS NULL OR s.status = @status::text)
              AND (NOT @hasBucket OR s.bucket = ANY(@bucketList::text[]))
            GROUP BY COALESCE(ssm.status_name, s.status)", dp);
        dto.StrategyStatusPie = statusPie.Select(r => new StatusCountDto { Status = r.status ?? "", Count = (int)(long)r.count }).ToList();

        var journeyDist = await conn.QueryAsync(@"
            SELECT journey_type, COUNT(*) AS count
            FROM col_db.strategies s
            WHERE (@fromDate::timestamp IS NULL OR s.created_at >= @fromDate::timestamp)
              AND (@toDate::timestamp IS NULL OR s.created_at <= @toDate::timestamp)
              AND (@search::text IS NULL OR s.strategy_name ILIKE @search::text OR s.strategy_code ILIKE @search::text)
              AND (@status::text IS NULL OR s.status = @status::text)
              AND (NOT @hasBucket OR s.bucket = ANY(@bucketList::text[]))
            GROUP BY journey_type", dp);
        dto.JourneyTypeDistribution = journeyDist.Select(r => new StatusCountDto { Status = r.journey_type ?? "", Count = (int)(long)r.count }).ToList();

        var channelUsage = await conn.QueryAsync(@"
            SELECT COALESCE(cm.channel_name, ss.channel) AS channel, COUNT(*) AS count
            FROM col_db.strategy_steps ss
            JOIN col_db.strategies s ON s.strategy_id = ss.strategy_id
            LEFT JOIN col_db.channel_master cm ON cm.channel_code = ss.channel
            WHERE (@fromDate::timestamp IS NULL OR s.created_at >= @fromDate::timestamp)
              AND (@toDate::timestamp IS NULL OR s.created_at <= @toDate::timestamp)
              AND (@search::text IS NULL OR s.strategy_name ILIKE @search::text OR s.strategy_code ILIKE @search::text)
              AND (@status::text IS NULL OR s.status = @status::text)
              AND (NOT @hasBucket OR s.bucket = ANY(@bucketList::text[]))
            GROUP BY COALESCE(cm.channel_name, ss.channel)
            ORDER BY count DESC", dp);
        dto.ChannelUsage = channelUsage.Select(r => new NameCountDto { Name = r.channel ?? "", Count = (int)(long)r.count }).ToList();

        var avgSteps = await conn.QueryFirstOrDefaultAsync<double?>(@"
            SELECT AVG(step_count) FROM (
                SELECT ss.strategy_id, COUNT(*) AS step_count
                FROM col_db.strategy_steps ss
                JOIN col_db.strategies s ON s.strategy_id = ss.strategy_id
                WHERE (@fromDate::timestamp IS NULL OR s.created_at >= @fromDate::timestamp)
                  AND (@toDate::timestamp IS NULL OR s.created_at <= @toDate::timestamp)
                  AND (@search::text IS NULL OR s.strategy_name ILIKE @search::text OR s.strategy_code ILIKE @search::text)
                  AND (@status::text IS NULL OR s.status = @status::text)
                  AND (NOT @hasBucket OR s.bucket = ANY(@bucketList::text[]))
                GROUP BY ss.strategy_id
            ) x", dp);
        dto.AverageStepsPerStrategy = avgSteps.HasValue ? Math.Round(avgSteps.Value, 1) : 0;

        var timeline = await conn.QueryAsync(@"
            SELECT strategy_name, strategy_code, created_at FROM col_db.strategies
            WHERE (@fromDate::timestamp IS NULL OR created_at >= @fromDate::timestamp)
              AND (@toDate::timestamp IS NULL OR created_at <= @toDate::timestamp)
              AND (@search::text IS NULL OR strategy_name ILIKE @search::text OR strategy_code ILIKE @search::text)
              AND (@status::text IS NULL OR status = @status::text)
              AND (NOT @hasBucket OR bucket = ANY(@bucketList::text[]))
            ORDER BY created_at DESC LIMIT 10", dp);
        dto.StrategyTimeline = timeline.Select(r => new StrategyTimelineDto
        { StrategyName = r.strategy_name ?? "", StrategyCode = r.strategy_code ?? "", CreatedAt = r.created_at }).ToList();

        var appCards = await conn.QueryFirstOrDefaultAsync(@"
            SELECT
                (SELECT COUNT(*) FROM col_db.strategies s WHERE s.status = 'PENDING_APPROVAL'
                    AND (@search::text IS NULL OR s.strategy_name ILIKE @search::text OR s.strategy_code ILIKE @search::text)
                    AND (@status::text IS NULL OR s.status = @status::text)
                    AND (NOT @hasBucket OR s.bucket = ANY(@bucketList::text[]))) AS pending,
                (SELECT COUNT(*) FROM col_db.strategy_approval_log l JOIN col_db.strategies s ON s.strategy_id = l.strategy_id
                    WHERE l.to_status = 'APPROVED' AND l.performed_at::date = CURRENT_DATE
                    AND (@search::text IS NULL OR s.strategy_name ILIKE @search::text OR s.strategy_code ILIKE @search::text)
                    AND (@status::text IS NULL OR s.status = @status::text)
                    AND (NOT @hasBucket OR s.bucket = ANY(@bucketList::text[]))) AS approved_today,
                (SELECT COUNT(*) FROM col_db.strategy_approval_log l JOIN col_db.strategies s ON s.strategy_id = l.strategy_id
                    WHERE l.to_status = 'REJECTED' AND l.performed_at::date = CURRENT_DATE
                    AND (@search::text IS NULL OR s.strategy_name ILIKE @search::text OR s.strategy_code ILIKE @search::text)
                    AND (@status::text IS NULL OR s.status = @status::text)
                    AND (NOT @hasBucket OR s.bucket = ANY(@bucketList::text[]))) AS rejected_today", dp);
        var avgApproval = await conn.QueryFirstOrDefaultAsync<double?>(@"
            WITH submitted AS (
                SELECT l.strategy_id, MIN(l.performed_at) AS submitted_at
                FROM col_db.strategy_approval_log l
                JOIN col_db.strategies s ON s.strategy_id = l.strategy_id
                WHERE l.to_status = 'PENDING_APPROVAL'
                  AND (@search::text IS NULL OR s.strategy_name ILIKE @search::text OR s.strategy_code ILIKE @search::text)
                  AND (@status::text IS NULL OR s.status = @status::text)
                  AND (NOT @hasBucket OR s.bucket = ANY(@bucketList::text[]))
                GROUP BY l.strategy_id
            ), approved AS (
                SELECT l.strategy_id, MIN(l.performed_at) AS approved_at
                FROM col_db.strategy_approval_log l
                JOIN col_db.strategies s ON s.strategy_id = l.strategy_id
                WHERE l.to_status = 'APPROVED'
                  AND (@search::text IS NULL OR s.strategy_name ILIKE @search::text OR s.strategy_code ILIKE @search::text)
                  AND (@status::text IS NULL OR s.status = @status::text)
                  AND (NOT @hasBucket OR s.bucket = ANY(@bucketList::text[]))
                GROUP BY l.strategy_id
            )
            SELECT AVG(EXTRACT(EPOCH FROM (a.approved_at - s.submitted_at)) / 3600.0)
            FROM submitted s JOIN approved a ON a.strategy_id = s.strategy_id AND a.approved_at >= s.submitted_at", dp);
        dto.ApprovalCards = new ApprovalCardsDto
        {
            Pending = (int)(long)(appCards?.pending ?? 0L),
            ApprovedToday = (int)(long)(appCards?.approved_today ?? 0L),
            RejectedToday = (int)(long)(appCards?.rejected_today ?? 0L),
            AvgApprovalTimeHours = avgApproval.HasValue ? Math.Round(avgApproval.Value, 1) : (double?)null
        };

        var appTimeline = await conn.QueryAsync(@"
            SELECT s.strategy_name, l.action,
                   COALESCE(fsm.status_name, l.from_status) AS from_status,
                   COALESCE(tsm.status_name, l.to_status)   AS to_status,
                   l.actor_role, l.performed_at, l.remarks
            FROM col_db.strategy_approval_log l
            JOIN col_db.strategies s ON s.strategy_id = l.strategy_id
            LEFT JOIN col_db.strategy_status_master fsm ON fsm.status_code = l.from_status
            LEFT JOIN col_db.strategy_status_master tsm ON tsm.status_code = l.to_status
            WHERE (@search::text IS NULL OR s.strategy_name ILIKE @search::text OR s.strategy_code ILIKE @search::text)
              AND (@status::text IS NULL OR s.status = @status::text)
              AND (NOT @hasBucket OR s.bucket = ANY(@bucketList::text[]))
            ORDER BY l.performed_at DESC LIMIT 15", dp);
        dto.ApprovalTimeline = appTimeline.Select(r => new ApprovalTimelineDto
        {
            StrategyName = r.strategy_name ?? "",
            Action = r.action ?? "",
            FromStatus = r.from_status ?? "",
            ToStatus = r.to_status ?? "",
            ActorRole = r.actor_role ?? "",
            PerformedAt = r.performed_at,
            Remarks = r.remarks
        }).ToList();

        var commCards = await conn.QueryFirstOrDefaultAsync(@"
            SELECT
                COUNT(*) AS total_messages,
                COUNT(*) FILTER (WHERE channel ILIKE 'Email') AS email,
                COUNT(*) FILTER (WHERE channel ILIKE 'SMS') AS sms,
                COUNT(*) FILTER (WHERE channel ILIKE 'WhatsApp') AS whatsapp,
                COUNT(*) FILTER (WHERE channel ILIKE '%Voice%') AS voice,
                ROUND(100.0 * COUNT(*) FILTER (WHERE status IN ('Delivered','Read','Responded','Connected','Opened')) / NULLIF(COUNT(*), 0), 1) AS success_rate
            FROM col_db.communication_logs");
        dto.CommunicationCards = new CommunicationCardsDto
        {
            TotalMessages = (int)(long)(commCards?.total_messages ?? 0L),
            Email = (int)(long)(commCards?.email ?? 0L),
            Sms = (int)(long)(commCards?.sms ?? 0L),
            WhatsApp = (int)(long)(commCards?.whatsapp ?? 0L),
            Voice = (int)(long)(commCards?.voice ?? 0L),
            SuccessRate = commCards?.success_rate == null ? 0m : Convert.ToDecimal(commCards.success_rate)
        };

        var commStatus = await conn.QueryAsync(@"
            SELECT CASE
                WHEN status IN ('Delivered','Read','Responded','Connected','Opened') THEN 'Delivered'
                WHEN status = 'Failed' THEN 'Failed'
                ELSE 'Pending' END AS name,
                COUNT(*) AS count
            FROM col_db.communication_logs GROUP BY 1");
        dto.CommunicationStatusBreakdown = commStatus.Select(r => new StatusCountDto { Status = r.name, Count = (int)(long)r.count }).ToList();

        return dto;
    }

    // ═══════════════════════════════════════════════════════
    //  GEO HIERARCHY + TOP UNRESOLVED CASES (unchanged — used by Management)
    // ═══════════════════════════════════════════════════════
    public async Task<List<ZoneNodeDto>> GetGeoHierarchyAsync()
    {
        using var conn = GetConnection();
        await conn.OpenAsync();
        var rows = await conn.QueryAsync(@"
            SELECT DISTINCT zone_code, region_code, code, name FROM col_db.branches
            WHERE zone_code IS NOT NULL AND region_code IS NOT NULL
            ORDER BY zone_code, region_code, name");

        var zones = new List<ZoneNodeDto>();
        foreach (var r in rows)
        {
            string zoneCode = r.zone_code;
            string regionCode = r.region_code;
            var zone = zones.FirstOrDefault(z => z.ZoneCode == zoneCode);
            if (zone == null) { zone = new ZoneNodeDto { ZoneCode = zoneCode }; zones.Add(zone); }
            var region = zone.Regions.FirstOrDefault(rg => rg.RegionCode == regionCode);
            if (region == null) { region = new RegionNodeDto { RegionCode = regionCode }; zone.Regions.Add(region); }
            region.Branches.Add(new BranchNodeDto { Code = r.code, Name = r.name });
        }
        return zones;
    }

    public async Task<List<UnresolvedCaseDto>> GetTopUnresolvedCasesAsync(string? zoneCode, string? regionCode, string? branchName, DateTime? fromDate, DateTime? toDate)
    {
        using var conn = GetConnection();
        await conn.OpenAsync();
        var rows = await conn.QueryAsync(@"
            SELECT x.case_ref, x.customer_name, x.journey_type, x.bucket, x.branch_name,
                   b.zone_code, b.region_code, x.dpd, x.total_outstanding, x.status
            FROM (
                SELECT case_ref, customer_name, 'DPD'::varchar AS journey_type, bucket, branch_name, dpd, total_outstanding, status, created_at
                FROM col_db.dpd_cases WHERE is_active AND last_payment_date IS NULL
                UNION ALL
                SELECT case_ref, customer_name, 'Bounce'::varchar AS journey_type, bucket, branch_name, dpd, total_outstanding, status, created_at
                FROM col_db.bounce_cases WHERE is_active AND last_payment_date IS NULL
            ) x
            LEFT JOIN col_db.branches b ON b.name = x.branch_name
            WHERE (@zoneCode IS NULL OR b.zone_code = @zoneCode)
              AND (@regionCode IS NULL OR b.region_code = @regionCode)
              AND (@branchName IS NULL OR x.branch_name = @branchName)
              AND (@fromDate::timestamp IS NULL OR x.created_at >= @fromDate::timestamp)
              AND (@toDate::timestamp IS NULL OR x.created_at <= @toDate::timestamp)
            ORDER BY x.total_outstanding DESC NULLS LAST
            LIMIT 10", new { zoneCode, regionCode, branchName, fromDate, toDate });

        return rows.Select(r => new UnresolvedCaseDto
        {
            CaseRef = r.case_ref ?? "",
            CustomerName = r.customer_name ?? "",
            Journey = r.journey_type ?? "",
            Bucket = r.bucket ?? "",
            BranchName = r.branch_name ?? "",
            ZoneCode = r.zone_code,
            RegionCode = r.region_code,
            Dpd = r.dpd == null ? (int?)null : Convert.ToInt32(r.dpd),
            TotalOutstanding = Convert.ToDecimal(r.total_outstanding ?? 0),
            Status = r.status ?? ""
        }).ToList();
    }
}