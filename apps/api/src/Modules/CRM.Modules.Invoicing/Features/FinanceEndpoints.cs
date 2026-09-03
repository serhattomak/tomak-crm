using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Invoicing.Data;
using CRM.Modules.Invoicing.Entities;
using CRM.Modules.Invoicing.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Invoicing.Features;

public record FinancialAccountDto(
    Guid Id,
    string Name,
    string Type,
    string? BankName,
    string? BranchName,
    string? AccountNumber,
    string? IBAN,
    string Currency,
    decimal Balance,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record FinancialTransactionDto(
    Guid Id,
    Guid FinancialAccountId,
    string FinancialAccountName,
    Guid? CariAccountId,
    string? CariTitle,
    Guid? InvoiceId,
    string Type,
    decimal Amount,
    string Currency,
    decimal ExchangeRate,
    string? DocumentNumber,
    string Description,
    DateTime TransactionDate,
    DateTime CreatedAt);

public record PagedFinancialTransactionsResponse(
    List<FinancialTransactionDto> Items,
    int TotalCount,
    decimal TotalCollection,
    decimal TotalPayment,
    int Page,
    int PageSize);

public record CreateFinancialAccountRequest(
    string Name,
    string Type,
    string? BankName,
    string? BranchName,
    string? AccountNumber,
    string? IBAN,
    string Currency,
    decimal InitialBalance);

public record CreateFinancialTransactionRequest(
    Guid FinancialAccountId,
    Guid? CariAccountId,
    Guid? InvoiceId,
    string Type,
    decimal Amount,
    string Currency,
    decimal ExchangeRate,
    string? DocumentNumber,
    string Description,
    DateTime TransactionDate);

public record TransferBetweenAccountsRequest(
    Guid SourceAccountId,
    Guid TargetAccountId,
    decimal Amount,
    string Description,
    DateTime TransactionDate);

public class FinanceEndpoints : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/invoicing/finance")
            .WithTags("Invoicing - Finance & Cash/Bank")
            .RequireAuthorization();

        // 1. GET /api/invoicing/finance/accounts
        group.MapGet("/accounts", async (
            InvoicingDbContext dbContext,
            ICurrentTenant currentTenant,
            CancellationToken ct) =>
        {
            if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
            {
                throw new UnauthorizedException("Geçerli bir kiracı oturumu bulunamadı.");
            }

            var accounts = await dbContext.FinancialAccounts.AsNoTracking()
                .OrderBy(a => a.Type)
                .ThenBy(a => a.Name)
                .Select(a => new FinancialAccountDto(
                    a.Id,
                    a.Name,
                    a.Type,
                    a.BankName,
                    a.BranchName,
                    a.AccountNumber,
                    a.IBAN,
                    a.Currency,
                    a.Balance,
                    a.IsActive,
                    a.CreatedAt,
                    a.UpdatedAt))
                .ToListAsync(ct);

            return Results.Ok(ApiResponse<List<FinancialAccountDto>>.Ok(accounts));
        });

        // 2. POST /api/invoicing/finance/accounts
        group.MapPost("/accounts", async (
            CreateFinancialAccountRequest req,
            InvoicingDbContext dbContext,
            ICurrentTenant currentTenant,
            CancellationToken ct) =>
        {
            if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
            {
                throw new UnauthorizedException("Geçerli bir kiracı oturumu bulunamadı.");
            }

            var account = new FinancialAccount
            {
                Id = Guid.NewGuid(),
                TenantId = currentTenant.Id.Value,
                Name = req.Name.Trim(),
                Type = req.Type,
                BankName = req.BankName,
                BranchName = req.BranchName,
                AccountNumber = req.AccountNumber,
                IBAN = req.IBAN,
                Currency = string.IsNullOrWhiteSpace(req.Currency) ? "TRY" : req.Currency,
                Balance = req.InitialBalance,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            dbContext.FinancialAccounts.Add(account);
            await dbContext.SaveChangesAsync(ct);

            return Results.Ok(ApiResponse<Guid>.Ok(account.Id));
        });

        // 3. GET /api/invoicing/finance/transactions
        group.MapGet("/transactions", async (
            InvoicingDbContext dbContext,
            ICurrentTenant currentTenant,
            Guid? accountId,
            Guid? cariAccountId,
            string? type,
            int page = 1,
            int pageSize = 50,
            CancellationToken ct = default) =>
        {
            if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
            {
                throw new UnauthorizedException("Geçerli bir kiracı oturumu bulunamadı.");
            }

            var query = dbContext.FinancialTransactions.AsNoTracking()
                .Include(t => t.FinancialAccount)
                .Include(t => t.CariAccount)
                .AsQueryable();

            if (accountId.HasValue)
            {
                query = query.Where(t => t.FinancialAccountId == accountId.Value);
            }

            if (cariAccountId.HasValue)
            {
                query = query.Where(t => t.CariAccountId == cariAccountId.Value);
            }

            if (!string.IsNullOrWhiteSpace(type) && type != "All")
            {
                query = query.Where(t => t.Type == type);
            }

            var totalCount = await query.CountAsync(ct);
            var totalCollection = await query.Where(t => t.Type == "Collection").SumAsync(t => t.Amount, ct);
            var totalPayment = await query.Where(t => t.Type == "Payment").SumAsync(t => t.Amount, ct);

            var items = await query
                .OrderByDescending(t => t.TransactionDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(t => new FinancialTransactionDto(
                    t.Id,
                    t.FinancialAccountId,
                    t.FinancialAccount != null ? t.FinancialAccount.Name : "—",
                    t.CariAccountId,
                    t.CariAccount != null ? t.CariAccount.Title : null,
                    t.InvoiceId,
                    t.Type,
                    t.Amount,
                    t.Currency,
                    t.ExchangeRate,
                    t.DocumentNumber,
                    t.Description,
                    t.TransactionDate,
                    t.CreatedAt))
                .ToListAsync(ct);

            return Results.Ok(ApiResponse<PagedFinancialTransactionsResponse>.Ok(
                new PagedFinancialTransactionsResponse(items, totalCount, totalCollection, totalPayment, page, pageSize)));
        });

        // 4. POST /api/invoicing/finance/transactions (Tahsilat / Ödeme / Masraf)
        group.MapPost("/transactions", async (
            CreateFinancialTransactionRequest req,
            InvoicingDbContext dbContext,
            ICariLedgerService ledgerService,
            ICurrentTenant currentTenant,
            CancellationToken ct) =>
        {
            if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
            {
                throw new UnauthorizedException("Geçerli bir kiracı oturumu bulunamadı.");
            }

            var tx = new FinancialTransaction
            {
                Id = Guid.NewGuid(),
                TenantId = currentTenant.Id.Value,
                FinancialAccountId = req.FinancialAccountId,
                CariAccountId = req.CariAccountId,
                InvoiceId = req.InvoiceId,
                Type = req.Type,
                Amount = req.Amount,
                Currency = string.IsNullOrWhiteSpace(req.Currency) ? "TRY" : req.Currency,
                ExchangeRate = req.ExchangeRate > 0 ? req.ExchangeRate : 1.0000m,
                DocumentNumber = req.DocumentNumber,
                Description = req.Description,
                TransactionDate = req.TransactionDate,
                CreatedAt = DateTime.UtcNow
            };

            dbContext.FinancialTransactions.Add(tx);
            await dbContext.SaveChangesAsync(ct);

            // Update ledger (account balance + cari balance + invoice remaining)
            await ledgerService.ProcessFinancialTransactionAsync(tx, ct);

            return Results.Ok(ApiResponse<Guid>.Ok(tx.Id));
        });

        // 5. POST /api/invoicing/finance/transfer (Virman / Hesaplar Arası Transfer)
        group.MapPost("/transfer", async (
            TransferBetweenAccountsRequest req,
            InvoicingDbContext dbContext,
            ICurrentTenant currentTenant,
            CancellationToken ct) =>
        {
            if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
            {
                throw new UnauthorizedException("Geçerli bir kiracı oturumu bulunamadı.");
            }

            var source = await dbContext.FinancialAccounts.FirstOrDefaultAsync(a => a.Id == req.SourceAccountId, ct)
                ?? throw new NotFoundException("Kaynak hesap bulunamadı.");
            var target = await dbContext.FinancialAccounts.FirstOrDefaultAsync(a => a.Id == req.TargetAccountId, ct)
                ?? throw new NotFoundException("Hedef hesap bulunamadı.");

            source.Balance -= req.Amount;
            target.Balance += req.Amount;
            source.UpdatedAt = DateTime.UtcNow;
            target.UpdatedAt = DateTime.UtcNow;

            var outTx = new FinancialTransaction
            {
                Id = Guid.NewGuid(),
                TenantId = currentTenant.Id.Value,
                FinancialAccountId = source.Id,
                Type = "Transfer",
                Amount = req.Amount,
                Currency = source.Currency,
                Description = $"{target.Name} hesabına virman: {req.Description}",
                TransactionDate = req.TransactionDate,
                CreatedAt = DateTime.UtcNow
            };

            var inTx = new FinancialTransaction
            {
                Id = Guid.NewGuid(),
                TenantId = currentTenant.Id.Value,
                FinancialAccountId = target.Id,
                Type = "Transfer",
                Amount = req.Amount,
                Currency = target.Currency,
                Description = $"{source.Name} hesabından virman: {req.Description}",
                TransactionDate = req.TransactionDate,
                CreatedAt = DateTime.UtcNow
            };

            dbContext.FinancialTransactions.AddRange(outTx, inTx);
            await dbContext.SaveChangesAsync(ct);

            return Results.Ok(ApiResponse<bool>.Ok(true));
        });
    }
}
