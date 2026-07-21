using backend.Modules.Dashboard.Repositories;
using backend.Modules.Dashboard.Services;
using Company.Monitoring;
using Npgsql;
using System.Data;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Shared Serilog setup (from Company.Monitoring)
builder.ConfigureCompanyLogging();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddScoped<IDbConnection>(sp =>
    new NpgsqlConnection(
        builder.Configuration.GetConnectionString("DefaultConnection")
    ));

builder.Services.AddScoped<IDashboardRepository, DashboardRepository>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.ConfigureCompanyLogging();  
// Shared health check setup (from Company.Monitoring)
builder.Services.AddCompanyMonitoring(builder.Configuration);

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseSerilogRequestLogging();

// Shared Prometheus metrics + health endpoint setup (from Company.Monitoring)
app.UseCompanyMonitoring();

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run();