using System.Security.Cryptography;
using System.Text;
using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Contracts.Data;
using CRM.Modules.Contracts.Entities;
using CRM.Modules.Customers.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Contracts.Features;

public record ContractListDto(
    Guid Id,
    string ContractNumber,
    string Title,
    Guid CustomerId,
    string? CustomerName,
    Guid? QuoteId,
    string Status,
    decimal TotalAmount,
    string Currency,
    DateOnly? ValidFrom,
    DateOnly? ValidUntil,
    DateTime? SignedAt,
    string? SignedByName,
    string? PublicToken,
    DateTime CreatedAt);

public record ContractDetailDto(
    Guid Id,
    string ContractNumber,
    string Title,
    Guid CustomerId,
    string? CustomerName,
    Guid? QuoteId,
    string Status,
    decimal TotalAmount,
    string Currency,
    string ContentHtml,
    Guid? TemplateId,
    DateOnly? ValidFrom,
    DateOnly? ValidUntil,
    bool AutoRenew,
    DateTime? SignedAt,
    string? SignedByName,
    string? SignedByEmail,
    string? SignatureImageUrl,
    string? IpAddress,
    string? AuditHash,
    string? PublicToken,
    string? Notes,
    DateTime CreatedAt);

public record CreateContractRequest(
    string Title,
    Guid CustomerId,
    Guid? QuoteId,
    decimal TotalAmount,
    string Currency,
    string ContentHtml,
    Guid? TemplateId,
    DateOnly? ValidFrom,
    DateOnly? ValidUntil,
    bool AutoRenew,
    string? Notes);

public record UpdateContractRequest(
    string Title,
    string Status,
    decimal TotalAmount,
    string Currency,
    string ContentHtml,
    DateOnly? ValidFrom,
    DateOnly? ValidUntil,
    bool AutoRenew,
    string? Notes);

public record SignContractPublicRequest(
    string SignedByName,
    string SignedByEmail,
    string SignatureImageUrl);

public class ContractEndpoints : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/contracts")
            .WithTags("Contracts")
            .RequireAuthorization();

        group.MapGet("/", async (
            ContractsDbContext db,
            string? search,
            string? status,
            Guid? customerId,
            int page = 1,
            int pageSize = 20,
            CancellationToken ct = default) =>
        {
            var query = db.Contracts.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(c => c.Title.ToLower().Contains(term) || c.ContractNumber.ToLower().Contains(term) || (c.CustomerName != null && c.CustomerName.ToLower().Contains(term)));
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                query = query.Where(c => c.Status == status);
            }

            if (customerId.HasValue)
            {
                query = query.Where(c => c.CustomerId == customerId.Value);
            }

            var totalCount = await query.CountAsync(ct);

            var items = await query
                .OrderByDescending(c => c.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(c => new ContractListDto(
                    c.Id,
                    c.ContractNumber,
                    c.Title,
                    c.CustomerId,
                    c.CustomerName,
                    c.QuoteId,
                    c.Status,
                    c.TotalAmount,
                    c.Currency,
                    c.ValidFrom,
                    c.ValidUntil,
                    c.SignedAt,
                    c.SignedByName,
                    c.PublicToken,
                    c.CreatedAt))
                .ToListAsync(ct);

            return Results.Ok(ApiResponse<object>.Ok(new
            {
                items,
                page,
                pageSize,
                totalCount
            }));
        });

        group.MapGet("/{id:guid}", async (Guid id, ContractsDbContext db, CancellationToken ct) =>
        {
            var c = await db.Contracts.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
            if (c == null) return Results.NotFound(ApiResponse<string>.Fail("NOT_FOUND", "Sözleşme bulunamadı."));

            return Results.Ok(ApiResponse<ContractDetailDto>.Ok(new ContractDetailDto(
                c.Id,
                c.ContractNumber,
                c.Title,
                c.CustomerId,
                c.CustomerName,
                c.QuoteId,
                c.Status,
                c.TotalAmount,
                c.Currency,
                c.ContentHtml,
                c.TemplateId,
                c.ValidFrom,
                c.ValidUntil,
                c.AutoRenew,
                c.SignedAt,
                c.SignedByName,
                c.SignedByEmail,
                c.SignatureImageUrl,
                c.IpAddress,
                c.AuditHash,
                c.PublicToken,
                c.Notes,
                c.CreatedAt)));
        });

        group.MapPost("/", async (
            CreateContractRequest req,
            ContractsDbContext db,
            CustomersDbContext custDb,
            ICurrentTenant currentTenant,
            CancellationToken ct) =>
        {
            var customer = await custDb.Customers.AsNoTracking().FirstOrDefaultAsync(x => x.Id == req.CustomerId, ct);

            var countThisYear = await db.Contracts.CountAsync(ct) + 1;
            var contractNumber = $"CNT-{DateTime.UtcNow:yyyy}-{countThisYear:D4}";
            var publicToken = Guid.NewGuid().ToString("N");

            var contract = new Contract
            {
                TenantId = currentTenant.Id ?? Guid.Empty,
                ContractNumber = contractNumber,
                Title = req.Title,
                CustomerId = req.CustomerId,
                CustomerName = customer?.Name,
                QuoteId = req.QuoteId,
                Status = "Draft",
                TotalAmount = req.TotalAmount,
                Currency = string.IsNullOrWhiteSpace(req.Currency) ? "TRY" : req.Currency,
                ContentHtml = req.ContentHtml,
                TemplateId = req.TemplateId,
                ValidFrom = req.ValidFrom,
                ValidUntil = req.ValidUntil,
                AutoRenew = req.AutoRenew,
                Notes = req.Notes,
                PublicToken = publicToken
            };

            db.Contracts.Add(contract);
            await db.SaveChangesAsync(ct);

            return Results.Created($"/api/v1/contracts/{contract.Id}", ApiResponse<object>.Ok(new { id = contract.Id, contractNumber, publicToken }, "Sözleşme başarıyla oluşturuldu."));
        });

        group.MapPut("/{id:guid}", async (
            Guid id,
            UpdateContractRequest req,
            ContractsDbContext db,
            CancellationToken ct) =>
        {
            var c = await db.Contracts.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (c == null) return Results.NotFound(ApiResponse<string>.Fail("NOT_FOUND", "Sözleşme bulunamadı."));

            c.Title = req.Title;
            c.Status = req.Status;
            c.TotalAmount = req.TotalAmount;
            c.Currency = req.Currency;
            c.ContentHtml = req.ContentHtml;
            c.ValidFrom = req.ValidFrom;
            c.ValidUntil = req.ValidUntil;
            c.AutoRenew = req.AutoRenew;
            c.Notes = req.Notes;
            c.UpdatedAt = DateTime.UtcNow;

            await db.SaveChangesAsync(ct);
            return Results.Ok(ApiResponse<bool>.Ok(true, "Sözleşme güncellendi."));
        });

        group.MapDelete("/{id:guid}", async (Guid id, ContractsDbContext db, CancellationToken ct) =>
        {
            var c = await db.Contracts.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (c == null) return Results.NotFound(ApiResponse<string>.Fail("NOT_FOUND", "Sözleşme bulunamadı."));

            db.Contracts.Remove(c);
            await db.SaveChangesAsync(ct);
            return Results.Ok(ApiResponse<bool>.Ok(true, "Sözleşme silindi."));
        });

        // Public E-Signature API (Agnostic of Auth)
        var publicGroup = app.MapGroup("/api/public/contracts")
            .WithTags("Public Contracts")
            .AllowAnonymous();

        publicGroup.MapGet("/{token}", async (string token, ContractsDbContext db, CancellationToken ct) =>
        {
            var c = await db.Contracts.AsNoTracking().FirstOrDefaultAsync(x => x.PublicToken == token, ct);
            if (c == null) return Results.NotFound("Sözleşme bulunamadı veya link geçersiz.");

            return Results.Ok(new
            {
                c.Id,
                c.ContractNumber,
                c.Title,
                c.CustomerName,
                c.Status,
                c.TotalAmount,
                c.Currency,
                c.ContentHtml,
                c.ValidFrom,
                c.ValidUntil,
                c.SignedAt,
                c.SignedByName
            });
        });

        publicGroup.MapPost("/{token}/sign", async (
            string token,
            SignContractPublicRequest req,
            ContractsDbContext db,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var c = await db.Contracts.FirstOrDefaultAsync(x => x.PublicToken == token, ct);
            if (c == null) return Results.NotFound("Sözleşme bulunamadı.");
            if (c.Status == "Signed" || c.Status == "Active")
                return Results.BadRequest("Bu sözleşme daha önce imzalanmıştır.");

            var ipAddress = httpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown";
            var userAgent = httpContext.Request.Headers.UserAgent.ToString();
            var now = DateTime.UtcNow;

            // Compute SHA-256 Audit Hash of Contract Content + Signature
            var rawAuditData = $"{c.Id}:{c.ContractNumber}:{c.ContentHtml}:{req.SignedByName}:{req.SignedByEmail}:{now:O}:{ipAddress}";
            using var sha = SHA256.Create();
            var hashBytes = sha.ComputeHash(Encoding.UTF8.GetBytes(rawAuditData));
            var auditHash = Convert.ToHexString(hashBytes);

            c.Status = "Signed";
            c.SignedAt = now;
            c.SignedByName = req.SignedByName;
            c.SignedByEmail = req.SignedByEmail;
            c.SignatureImageUrl = req.SignatureImageUrl;
            c.IpAddress = ipAddress;
            c.UserAgent = userAgent;
            c.AuditHash = auditHash;
            c.UpdatedAt = now;

            await db.SaveChangesAsync(ct);

            return Results.Ok(new
            {
                message = "Sözleşme başarıyla dijital olarak imzalandı.",
                signedAt = c.SignedAt,
                auditHash
            });
        });
    }
}
