using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Customers.Data;
using CRM.Modules.Invoicing.Data;
using CRM.Modules.Invoicing.Entities;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Invoicing.Features;

public record CariAccountDto(
    Guid Id,
    Guid? CustomerId,
    string Code,
    string Title,
    string Type,
    string? TaxOffice,
    string? TaxNumber,
    string? Address,
    string? City,
    string? District,
    string Country,
    string? PostalCode,
    string? Email,
    string? Phone,
    string Currency,
    decimal TotalDebit,
    decimal TotalCredit,
    decimal Balance,
    decimal CreditLimit,
    int PaymentTermDays,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record CariTransactionDto(
    Guid Id,
    Guid CariAccountId,
    string Type,
    string? DocumentNumber,
    string Description,
    DateTime TransactionDate,
    DateTime? DueDate,
    decimal Debit,
    decimal Credit,
    decimal BalanceAfter,
    string Currency,
    string? SourceType,
    Guid? SourceId,
    DateTime CreatedAt);

public record PagedCariResponse(
    List<CariAccountDto> Items,
    int TotalCount,
    decimal OverallDebit,
    decimal OverallCredit,
    decimal OverallBalance,
    int Page,
    int PageSize);

public record CreateCariRequest(
    Guid? CustomerId,
    string Code,
    string Title,
    string Type,
    string? TaxOffice,
    string? TaxNumber,
    string? Address,
    string? City,
    string? District,
    string Country,
    string? PostalCode,
    string? Email,
    string? Phone,
    string Currency,
    decimal CreditLimit,
    int PaymentTermDays);

public class CariEndpoints : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/invoicing/cari")
            .WithTags("Invoicing - Cari Accounts")
            .RequireAuthorization();

        // 1. GET /api/invoicing/cari
        group.MapGet("/", async (
            InvoicingDbContext dbContext,
            ICurrentTenant currentTenant,
            string? search,
            string? type,
            int page = 1,
            int pageSize = 50,
            CancellationToken ct = default) =>
        {
            if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
            {
                throw new UnauthorizedException("Geçerli bir kiracı oturumu bulunamadı.");
            }

            var query = dbContext.CariAccounts.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                query = query.Where(c => c.Title.ToLower().Contains(s) ||
                                         c.Code.ToLower().Contains(s) ||
                                         (c.TaxNumber != null && c.TaxNumber.Contains(s)));
            }

            if (!string.IsNullOrWhiteSpace(type) && type != "All")
            {
                query = query.Where(c => c.Type == type);
            }

            var totalCount = await query.CountAsync(ct);
            var overallDebit = await query.SumAsync(c => c.TotalDebit, ct);
            var overallCredit = await query.SumAsync(c => c.TotalCredit, ct);
            var overallBalance = overallDebit - overallCredit;

            var items = await query
                .OrderByDescending(c => c.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(c => new CariAccountDto(
                    c.Id,
                    c.CustomerId,
                    c.Code,
                    c.Title,
                    c.Type,
                    c.TaxOffice,
                    c.TaxNumber,
                    c.Address,
                    c.City,
                    c.District,
                    c.Country,
                    c.PostalCode,
                    c.Email,
                    c.Phone,
                    c.Currency,
                    c.TotalDebit,
                    c.TotalCredit,
                    c.Balance,
                    c.CreditLimit,
                    c.PaymentTermDays,
                    c.IsActive,
                    c.CreatedAt,
                    c.UpdatedAt))
                .ToListAsync(ct);

            return Results.Ok(ApiResponse<PagedCariResponse>.Ok(
                new PagedCariResponse(items, totalCount, overallDebit, overallCredit, overallBalance, page, pageSize)));
        });

        // 2. GET /api/invoicing/cari/{id}
        group.MapGet("/{id:guid}", async (
            Guid id,
            InvoicingDbContext dbContext,
            CancellationToken ct) =>
        {
            var c = await dbContext.CariAccounts.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id, ct)
                ?? throw new NotFoundException($"Cari hesap bulunamadı (ID: {id})");

            var dto = new CariAccountDto(
                c.Id,
                c.CustomerId,
                c.Code,
                c.Title,
                c.Type,
                c.TaxOffice,
                c.TaxNumber,
                c.Address,
                c.City,
                c.District,
                c.Country,
                c.PostalCode,
                c.Email,
                c.Phone,
                c.Currency,
                c.TotalDebit,
                c.TotalCredit,
                c.Balance,
                c.CreditLimit,
                c.PaymentTermDays,
                c.IsActive,
                c.CreatedAt,
                c.UpdatedAt);

            return Results.Ok(ApiResponse<CariAccountDto>.Ok(dto));
        });

        // 3. GET /api/invoicing/cari/{id}/statement
        group.MapGet("/{id:guid}/statement", async (
            Guid id,
            InvoicingDbContext dbContext,
            DateTime? startDate,
            DateTime? endDate,
            CancellationToken ct) =>
        {
            var cari = await dbContext.CariAccounts.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id, ct)
                ?? throw new NotFoundException($"Cari hesap bulunamadı (ID: {id})");

            var query = dbContext.CariTransactions.AsNoTracking()
                .Where(t => t.CariAccountId == id);

            if (startDate.HasValue)
            {
                query = query.Where(t => t.TransactionDate >= startDate.Value);
            }
            if (endDate.HasValue)
            {
                query = query.Where(t => t.TransactionDate <= endDate.Value);
            }

            var transactions = await query
                .OrderBy(t => t.TransactionDate)
                .Select(t => new CariTransactionDto(
                    t.Id,
                    t.CariAccountId,
                    t.Type,
                    t.DocumentNumber,
                    t.Description,
                    t.TransactionDate,
                    t.DueDate,
                    t.Debit,
                    t.Credit,
                    t.BalanceAfter,
                    t.Currency,
                    t.SourceType,
                    t.SourceId,
                    t.CreatedAt))
                .ToListAsync(ct);

            return Results.Ok(ApiResponse<List<CariTransactionDto>>.Ok(transactions));
        });

        // 4. POST /api/invoicing/cari
        group.MapPost("/", async (
            CreateCariRequest req,
            InvoicingDbContext dbContext,
            ICurrentTenant currentTenant,
            CancellationToken ct) =>
        {
            if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
            {
                throw new UnauthorizedException("Geçerli bir kiracı oturumu bulunamadı.");
            }

            var cari = new CariAccount
            {
                Id = Guid.NewGuid(),
                TenantId = currentTenant.Id.Value,
                CustomerId = req.CustomerId,
                Code = req.Code.Trim().ToUpper(),
                Title = req.Title.Trim(),
                Type = req.Type,
                TaxOffice = req.TaxOffice,
                TaxNumber = req.TaxNumber,
                Address = req.Address,
                City = req.City,
                District = req.District,
                Country = string.IsNullOrWhiteSpace(req.Country) ? "Türkiye" : req.Country,
                PostalCode = req.PostalCode,
                Email = req.Email,
                Phone = req.Phone,
                Currency = string.IsNullOrWhiteSpace(req.Currency) ? "TRY" : req.Currency,
                CreditLimit = req.CreditLimit,
                PaymentTermDays = req.PaymentTermDays > 0 ? req.PaymentTermDays : 30,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            dbContext.CariAccounts.Add(cari);
            await dbContext.SaveChangesAsync(ct);

            return Results.Ok(ApiResponse<Guid>.Ok(cari.Id));
        });

        // 5. POST /api/invoicing/cari/from-customer/{customerId}
        group.MapPost("/from-customer/{customerId:guid}", async (
            Guid customerId,
            InvoicingDbContext dbContext,
            CustomersDbContext customerDbContext,
            ICurrentTenant currentTenant,
            CancellationToken ct) =>
        {
            if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
            {
                throw new UnauthorizedException("Geçerli bir kiracı oturumu bulunamadı.");
            }

            var existing = await dbContext.CariAccounts
                .FirstOrDefaultAsync(c => c.CustomerId == customerId, ct);
            if (existing != null)
            {
                return Results.Ok(ApiResponse<Guid>.Ok(existing.Id));
            }

            var customer = await customerDbContext.Customers
                .FirstOrDefaultAsync(c => c.Id == customerId, ct)
                ?? throw new NotFoundException($"Müşteri bulunamadı (ID: {customerId})");

            var count = await dbContext.CariAccounts.CountAsync(ct) + 1;
            var code = $"CAR-{count:D4}";

            var cari = new CariAccount
            {
                Id = Guid.NewGuid(),
                TenantId = currentTenant.Id.Value,
                CustomerId = customer.Id,
                Code = code,
                Title = customer.Name,
                Type = "Customer",
                TaxOffice = customer.TaxOffice,
                TaxNumber = customer.TaxNumber,
                Address = customer.AddressLine,
                City = customer.City,
                District = customer.State,
                Country = customer.Country ?? "Türkiye",
                PostalCode = customer.PostalCode,
                Email = customer.Email,
                Phone = customer.Phone,
                Currency = customer.Currency ?? "TRY",
                CreditLimit = 0.00m,
                PaymentTermDays = 30,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            dbContext.CariAccounts.Add(cari);
            await dbContext.SaveChangesAsync(ct);

            return Results.Ok(ApiResponse<Guid>.Ok(cari.Id));
        });
    }
}
