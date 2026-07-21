using backend.Modules.Dashboard.DTOs;
using backend.Modules.Dashboard.Repositories;

namespace backend.Modules.Dashboard.Services;

public interface IDashboardService
{
    Task<ManagementDashboardDto> GetManagementDashboardAsync(string? zoneCode, string? regionCode, string? branchName, DateTime? fromDate, DateTime? toDate);
    Task<AdminDashboardDto> GetAdminDashboardAsync(string? search, string? status, string? bucket, DateTime? fromDate, DateTime? toDate);
    Task<CollectionManagerDashboardDto> GetCollectionManagerDashboardAsync(string? zoneCode, string? regionCode, string? branchName, DateTime? fromDate, DateTime? toDate);
    Task<List<ZoneNodeDto>> GetGeoHierarchyAsync();
}

public class DashboardService : IDashboardService
{
    private readonly IDashboardRepository _repo;

    public DashboardService(IDashboardRepository repo)
    {
        _repo = repo;
    }

    public Task<ManagementDashboardDto> GetManagementDashboardAsync(string? zoneCode, string? regionCode, string? branchName, DateTime? fromDate, DateTime? toDate)
        => _repo.GetManagementDashboardAsync(zoneCode, regionCode, branchName, fromDate, toDate);

    public Task<AdminDashboardDto> GetAdminDashboardAsync(string? search, string? status, string? bucket, DateTime? fromDate, DateTime? toDate)
        => _repo.GetAdminDashboardAsync(search, status, bucket, fromDate, toDate);

    public Task<CollectionManagerDashboardDto> GetCollectionManagerDashboardAsync(string? zoneCode, string? regionCode, string? branchName, DateTime? fromDate, DateTime? toDate)
        => _repo.GetCollectionManagerDashboardAsync(zoneCode, regionCode, branchName, fromDate, toDate);

    public Task<List<ZoneNodeDto>> GetGeoHierarchyAsync()
        => _repo.GetGeoHierarchyAsync();
}