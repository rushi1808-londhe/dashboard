using Microsoft.AspNetCore.Mvc;
using backend.Modules.Dashboard.Services;
using backend.Common;
using System.Net;

namespace backend.Modules.Dashboard.Controllers;

[ApiController]
[Route("api/dashboard")]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService _service;

    public DashboardController(IDashboardService service)
    {
        _service = service;
    }

    /// <summary>Management Dashboard — KPIs, zones, recovery trend, channel effectiveness</summary>
    [HttpGet("management")]
    public async Task<IActionResult> GetManagementDashboard(string? zoneCode, string? regionCode, string? branchName, DateTime? fromDate, DateTime? toDate)
    {
        var data = await _service.GetManagementDashboardAsync(zoneCode, regionCode, branchName, fromDate, toDate);
        return ApiResponseHelper.ApiResponse(
            this,
            "DC200",
            HttpStatusCode.OK,
            "Management dashboard fetched successfully",
            "SUCCESS",
            data
        );
    }

    /// <summary>Strategy Dashboard — active strategies, approval queue, A/B, funnel, channel rates</summary>
    [HttpGet("admin")]
    public async Task<IActionResult> GetAdminDashboard(string? search, string? status, string? bucket, DateTime? fromDate, DateTime? toDate)
    {
        var data = await _service.GetAdminDashboardAsync(search, status, bucket, fromDate, toDate);
        return ApiResponseHelper.ApiResponse(
            this,
            "DC200",
            HttpStatusCode.OK,
            "Admin dashboard fetched successfully",
            "SUCCESS",
            data
        );
    }

    /// <summary>Collection Manager Dashboard — bucket distribution, digital vs manual split</summary>
    [HttpGet("collection-manager")]
    public async Task<IActionResult> GetCollectionManagerDashboard(string? zoneCode, string? regionCode, string? branchName, DateTime? fromDate, DateTime? toDate)
    {
        var data = await _service.GetCollectionManagerDashboardAsync(zoneCode, regionCode, branchName, fromDate, toDate);
         return ApiResponseHelper.ApiResponse(
            this,
            "DC200",
            HttpStatusCode.OK,
            "Collection Manager dashboard fetched successfully",
            "SUCCESS",
            data
        );
    }

    /// <summary>Zone → Region → Branch hierarchy, used to populate the location filter dropdowns</summary>
    [HttpGet("geo-hierarchy")]
    public async Task<IActionResult> GetGeoHierarchy()
    {
        var data = await _service.GetGeoHierarchyAsync();
        return ApiResponseHelper.ApiResponse(
            this,
            "DC200",
            HttpStatusCode.OK,
            "Geo hierarchy fetched successfully",
            "SUCCESS",
            data
        );
    }
}