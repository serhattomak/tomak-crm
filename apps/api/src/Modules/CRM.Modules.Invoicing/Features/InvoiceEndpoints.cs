using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Customers.Data;
using CRM.Modules.Invoicing.Data;
using CRM.Modules.Invoicing.Entities;
using CRM.Modules.Invoicing.Services;
using CRM.Modules.Orders.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Invoicing.Features;

public record InvoiceItemDto(
    Guid Id,
    Guid? ProductId,
    string ProductName,
    string? SKU,
    string Unit,
    decimal Quantity,
    decimal UnitPrice,
    decimal DiscountRate,
    decimal DiscountAmount,
    decimal TaxRate,
    decimal TaxAmount,
    string? WithholdingRate,
    decimal WithholdingAmount,
    decimal TotalPrice);

public record InvoiceListDto(
    Guid Id,
    Guid CariAccountId,
    string CariTitle,
    string? CariTaxNumber,
    Guid? OrderId,
    string InvoiceNumber,
    string Series,
    string Type,
    string Profile,
    string Status,
    DateTime IssueDate,
    DateTime? DueDate,
    string Currency,
    decimal Subtotal,
    decimal DiscountTotal,
    decimal TaxTotal,
    decimal WithholdingTotal,
    decimal GrandTotal,
    decimal PaidAmount,
    decimal RemainingAmount,
    int ItemsCount,
    DateTime CreatedAt);

public record InvoiceDetailDto(
    Guid Id,
    Guid CariAccountId,
    string CariTitle,
    string? CariTaxOffice,
    string? CariTaxNumber,
    string? CariAddress,
    string? CariCity,
    string? CariDistrict,
    string CariCountry,
    Guid? OrderId,
    string InvoiceNumber,
    string Series,
    string Type,
    string Profile,
    string Status,
    DateTime IssueDate,
    DateTime? DueDate,
    string Currency,
    decimal ExchangeRate,
    decimal Subtotal,
    decimal DiscountTotal,
    decimal TaxTotal,
    decimal WithholdingTotal,
    decimal GrandTotal,
    decimal PaidAmount,
    decimal RemainingAmount,
    string? EInvoiceUuid,
    string? EInvoiceStatus,
    string? Notes,
    string? PaymentTerms,
    List<InvoiceItemDto> Items,
    DateTime CreatedAt);

public record PagedInvoicesResponse(
    List<InvoiceListDto> Items,
    int TotalCount,
    decimal TotalSales,
    decimal TotalPurchase,
    decimal TotalTax,
    decimal PendingBalance,
    int Page,
    int PageSize);

public record CreateInvoiceItemRequest(
    Guid? ProductId,
    string ProductName,
    string? SKU,
    string Unit,
    decimal Quantity,
    decimal UnitPrice,
    decimal DiscountRate,
    decimal TaxRate,
    string? WithholdingRate);

public record CreateInvoiceRequest(
    Guid CariAccountId,
    Guid? OrderId,
    string Series,
    string Type,
    string Profile,
    DateTime IssueDate,
    DateTime? DueDate,
    string Currency,
    decimal ExchangeRate,
    string? Notes,
    string? PaymentTerms,
    List<CreateInvoiceItemRequest> Items);

public class InvoiceEndpoints : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/invoicing/invoices")
            .WithTags("Invoicing - Invoices")
            .RequireAuthorization();

        // 1. GET /api/invoicing/invoices
        group.MapGet("/", async (
            InvoicingDbContext dbContext,
            ICurrentTenant currentTenant,
            string? type,
            string? status,
            Guid? cariAccountId,
            string? search,
            int page = 1,
            int pageSize = 50,
            CancellationToken ct = default) =>
        {
            if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
            {
                throw new UnauthorizedException("Geçerli bir kiracı oturumu bulunamadı.");
            }

            var query = dbContext.Invoices.AsNoTracking()
                .Include(i => i.CariAccount)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(type) && type != "All")
            {
                query = query.Where(i => i.Type == type);
            }

            if (!string.IsNullOrWhiteSpace(status) && status != "All")
            {
                query = query.Where(i => i.Status == status);
            }

            if (cariAccountId.HasValue)
            {
                query = query.Where(i => i.CariAccountId == cariAccountId.Value);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                query = query.Where(i => i.InvoiceNumber.ToLower().Contains(s) ||
                                         (i.CariAccount != null && i.CariAccount.Title.ToLower().Contains(s)));
            }

            var totalCount = await query.CountAsync(ct);
            var totalSales = await query.Where(i => i.Type == "Sales").SumAsync(i => i.GrandTotal, ct);
            var totalPurchase = await query.Where(i => i.Type == "Purchase").SumAsync(i => i.GrandTotal, ct);
            var totalTax = await query.SumAsync(i => i.TaxTotal, ct);
            var pendingBalance = await query.Where(i => i.Status != "Cancelled" && i.Status != "Paid").SumAsync(i => i.RemainingAmount, ct);

            var items = await query
                .OrderByDescending(i => i.IssueDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(i => new InvoiceListDto(
                    i.Id,
                    i.CariAccountId,
                    i.CariAccount != null ? i.CariAccount.Title : "—",
                    i.CariAccount != null ? i.CariAccount.TaxNumber : null,
                    i.OrderId,
                    i.InvoiceNumber,
                    i.Series,
                    i.Type,
                    i.Profile,
                    i.Status,
                    i.IssueDate,
                    i.DueDate,
                    i.Currency,
                    i.Subtotal,
                    i.DiscountTotal,
                    i.TaxTotal,
                    i.WithholdingTotal,
                    i.GrandTotal,
                    i.PaidAmount,
                    i.RemainingAmount,
                    i.Items.Count,
                    i.CreatedAt))
                .ToListAsync(ct);

            return Results.Ok(ApiResponse<PagedInvoicesResponse>.Ok(
                new PagedInvoicesResponse(items, totalCount, totalSales, totalPurchase, totalTax, pendingBalance, page, pageSize)));
        });

        // 2. GET /api/invoicing/invoices/{id}
        group.MapGet("/{id:guid}", async (
            Guid id,
            InvoicingDbContext dbContext,
            CancellationToken ct) =>
        {
            var i = await dbContext.Invoices.AsNoTracking()
                .Include(x => x.CariAccount)
                .Include(x => x.Items)
                .FirstOrDefaultAsync(x => x.Id == id, ct)
                ?? throw new NotFoundException($"Fatura bulunamadı (ID: {id})");

            var dto = new InvoiceDetailDto(
                i.Id,
                i.CariAccountId,
                i.CariAccount?.Title ?? "—",
                i.CariAccount?.TaxOffice,
                i.CariAccount?.TaxNumber,
                i.CariAccount?.Address,
                i.CariAccount?.City,
                i.CariAccount?.District,
                i.CariAccount?.Country ?? "Türkiye",
                i.OrderId,
                i.InvoiceNumber,
                i.Series,
                i.Type,
                i.Profile,
                i.Status,
                i.IssueDate,
                i.DueDate,
                i.Currency,
                i.ExchangeRate,
                i.Subtotal,
                i.DiscountTotal,
                i.TaxTotal,
                i.WithholdingTotal,
                i.GrandTotal,
                i.PaidAmount,
                i.RemainingAmount,
                i.EInvoiceUuid,
                i.EInvoiceStatus,
                i.Notes,
                i.PaymentTerms,
                i.Items.Select(item => new InvoiceItemDto(
                    item.Id,
                    item.ProductId,
                    item.ProductName,
                    item.SKU,
                    item.Unit,
                    item.Quantity,
                    item.UnitPrice,
                    item.DiscountRate,
                    item.DiscountAmount,
                    item.TaxRate,
                    item.TaxAmount,
                    item.WithholdingRate,
                    item.WithholdingAmount,
                    item.TotalPrice)).ToList(),
                i.CreatedAt);

            return Results.Ok(ApiResponse<InvoiceDetailDto>.Ok(dto));
        });

        // 3. POST /api/invoicing/invoices
        group.MapPost("/", async (
            CreateInvoiceRequest req,
            InvoicingDbContext dbContext,
            ICurrentTenant currentTenant,
            CancellationToken ct) =>
        {
            if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
            {
                throw new UnauthorizedException("Geçerli bir kiracı oturumu bulunamadı.");
            }

            var cari = await dbContext.CariAccounts.FirstOrDefaultAsync(c => c.Id == req.CariAccountId, ct)
                ?? throw new NotFoundException($"Cari hesap bulunamadı (ID: {req.CariAccountId})");

            var year = DateTime.UtcNow.Year;
            var count = await dbContext.Invoices.CountAsync(i => i.IssueDate.Year == year, ct) + 1;
            var invoiceNumber = $"{req.Series}{year}{count:D8}";

            decimal subtotal = 0.00m;
            decimal discountTotal = 0.00m;
            decimal taxTotal = 0.00m;
            decimal withholdingTotal = 0.00m;

            var items = new List<InvoiceItem>();
            foreach (var r in req.Items)
            {
                var lineGross = r.Quantity * r.UnitPrice;
                var discount = lineGross * (r.DiscountRate / 100.00m);
                var net = lineGross - discount;
                var tax = net * (r.TaxRate / 100.00m);

                // Tevkifat hesabı (örnek 5/10: tax * 0.5)
                decimal withholding = 0.00m;
                if (!string.IsNullOrWhiteSpace(r.WithholdingRate) && r.WithholdingRate.Contains('/'))
                {
                    var parts = r.WithholdingRate.Split('/');
                    if (parts.Length == 2 && decimal.TryParse(parts[0], out var num) && decimal.TryParse(parts[1], out var den) && den > 0)
                    {
                        withholding = tax * (num / den);
                    }
                }

                var lineTotal = net + tax - withholding;

                subtotal += lineGross;
                discountTotal += discount;
                taxTotal += tax;
                withholdingTotal += withholding;

                items.Add(new InvoiceItem
                {
                    Id = Guid.NewGuid(),
                    TenantId = currentTenant.Id.Value,
                    ProductId = r.ProductId,
                    ProductName = r.ProductName,
                    SKU = r.SKU,
                    Unit = string.IsNullOrWhiteSpace(r.Unit) ? "Adet" : r.Unit,
                    Quantity = r.Quantity,
                    UnitPrice = r.UnitPrice,
                    DiscountRate = r.DiscountRate,
                    DiscountAmount = discount,
                    TaxRate = r.TaxRate,
                    TaxAmount = tax,
                    WithholdingRate = r.WithholdingRate,
                    WithholdingAmount = withholding,
                    TotalPrice = lineTotal,
                    CreatedAt = DateTime.UtcNow
                });
            }

            var grandTotal = (subtotal - discountTotal) + taxTotal - withholdingTotal;

            var invoice = new Invoice
            {
                Id = Guid.NewGuid(),
                TenantId = currentTenant.Id.Value,
                CariAccountId = cari.Id,
                OrderId = req.OrderId,
                InvoiceNumber = invoiceNumber,
                Series = req.Series,
                Type = req.Type,
                Profile = req.Profile,
                Status = "Draft",
                IssueDate = req.IssueDate,
                DueDate = req.DueDate ?? req.IssueDate.AddDays(cari.PaymentTermDays),
                Currency = req.Currency,
                ExchangeRate = req.ExchangeRate > 0 ? req.ExchangeRate : 1.0000m,
                Subtotal = subtotal,
                DiscountTotal = discountTotal,
                TaxTotal = taxTotal,
                WithholdingTotal = withholdingTotal,
                GrandTotal = grandTotal,
                PaidAmount = 0.00m,
                RemainingAmount = grandTotal,
                Notes = req.Notes,
                PaymentTerms = req.PaymentTerms,
                Items = items,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            dbContext.Invoices.Add(invoice);
            await dbContext.SaveChangesAsync(ct);

            return Results.Ok(ApiResponse<Guid>.Ok(invoice.Id));
        });

        // 4. POST /api/invoicing/invoices/from-order/{orderId}
        group.MapPost("/from-order/{orderId:guid}", async (
            Guid orderId,
            InvoicingDbContext dbContext,
            OrdersDbContext ordersDbContext,
            CustomersDbContext customerDbContext,
            ICurrentTenant currentTenant,
            CancellationToken ct) =>
        {
            if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
            {
                throw new UnauthorizedException("Geçerli bir kiracı oturumu bulunamadı.");
            }

            var order = await ordersDbContext.Orders
                .Include(o => o.Items)
                .FirstOrDefaultAsync(o => o.Id == orderId, ct)
                ?? throw new NotFoundException($"Sipariş bulunamadı (ID: {orderId})");

            // Find or Auto-Create CariAccount
            CariAccount? cari = null;
            if (order.CustomerId.HasValue)
            {
                cari = await dbContext.CariAccounts.FirstOrDefaultAsync(c => c.CustomerId == order.CustomerId.Value, ct);
                if (cari == null)
                {
                    var customer = await customerDbContext.Customers.FirstOrDefaultAsync(c => c.Id == order.CustomerId.Value, ct);
                    if (customer != null)
                    {
                        var cariCount = await dbContext.CariAccounts.CountAsync(ct) + 1;
                        cari = new CariAccount
                        {
                            Id = Guid.NewGuid(),
                            TenantId = currentTenant.Id.Value,
                            CustomerId = customer.Id,
                            Code = $"CAR-{cariCount:D4}",
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
                            Currency = order.Currency,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };
                        dbContext.CariAccounts.Add(cari);
                        await dbContext.SaveChangesAsync(ct);
                    }
                }
            }

            if (cari == null)
            {
                // Standalone Cari for this order customer name
                var cariCount = await dbContext.CariAccounts.CountAsync(ct) + 1;
                cari = new CariAccount
                {
                    Id = Guid.NewGuid(),
                    TenantId = currentTenant.Id.Value,
                    Code = $"CAR-{cariCount:D4}",
                    Title = order.CustomerName,
                    Type = "Customer",
                    Address = order.BillingAddress,
                    Currency = order.Currency,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                dbContext.CariAccounts.Add(cari);
                await dbContext.SaveChangesAsync(ct);
            }

            var year = DateTime.UtcNow.Year;
            var count = await dbContext.Invoices.CountAsync(i => i.IssueDate.Year == year, ct) + 1;
            var invoiceNumber = $"FTR{year}{count:D8}";

            var items = new List<InvoiceItem>();
            foreach (var oi in order.Items)
            {
                items.Add(new InvoiceItem
                {
                    Id = Guid.NewGuid(),
                    TenantId = currentTenant.Id.Value,
                    ProductId = oi.ProductId,
                    ProductName = oi.ProductName,
                    SKU = oi.SKU,
                    Unit = oi.Unit,
                    Quantity = oi.Quantity,
                    UnitPrice = oi.UnitPrice,
                    DiscountRate = oi.DiscountRate,
                    DiscountAmount = oi.DiscountAmount,
                    TaxRate = oi.TaxRate,
                    TaxAmount = oi.TaxAmount,
                    TotalPrice = oi.TotalPrice,
                    CreatedAt = DateTime.UtcNow
                });
            }

            var invoice = new Invoice
            {
                Id = Guid.NewGuid(),
                TenantId = currentTenant.Id.Value,
                CariAccountId = cari.Id,
                OrderId = order.Id,
                InvoiceNumber = invoiceNumber,
                Series = "FTR",
                Type = "Sales",
                Profile = "TICARIFATURA",
                Status = "Draft",
                IssueDate = DateTime.UtcNow,
                DueDate = order.DueDate ?? DateTime.UtcNow.AddDays(cari.PaymentTermDays),
                Currency = order.Currency,
                ExchangeRate = 1.0000m,
                Subtotal = order.Subtotal,
                DiscountTotal = order.DiscountAmount,
                TaxTotal = order.TaxAmount,
                WithholdingTotal = 0.00m,
                GrandTotal = order.TotalAmount,
                PaidAmount = order.PaidAmount,
                RemainingAmount = Math.Max(0.00m, order.TotalAmount - order.PaidAmount),
                Notes = $"Sipariş #{order.OrderNumber} faturasıdır.",
                PaymentTerms = order.PaymentMethod,
                Items = items,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            dbContext.Invoices.Add(invoice);

            // Update order invoice number reference
            order.InvoiceNumber = invoiceNumber;
            await dbContext.SaveChangesAsync(ct);
            await ordersDbContext.SaveChangesAsync(ct);

            return Results.Ok(ApiResponse<Guid>.Ok(invoice.Id));
        });

        // 5. POST /api/invoicing/invoices/{id}/issue (Resmileştir / Onayla)
        group.MapPost("/{id:guid}/issue", async (
            Guid id,
            InvoicingDbContext dbContext,
            ICariLedgerService ledgerService,
            CancellationToken ct) =>
        {
            var invoice = await dbContext.Invoices
                .FirstOrDefaultAsync(i => i.Id == id, ct)
                ?? throw new NotFoundException($"Fatura bulunamadı (ID: {id})");

            if (invoice.Status == "Issued" || invoice.Status == "Approved")
            {
                return Results.BadRequest(ApiResponse<string>.Fail("ALREADY_ISSUED", "Fatura zaten resmileştirilmiş."));
            }

            invoice.Status = "Issued";
            invoice.UpdatedAt = DateTime.UtcNow;

            // Process Cari Account ledger entry
            await ledgerService.ProcessInvoiceIssuedAsync(invoice, ct);
            await dbContext.SaveChangesAsync(ct);

            return Results.Ok(ApiResponse<bool>.Ok(true));
        });

        // 6. POST /api/invoicing/invoices/{id}/cancel (Faturayı İptal Et)
        group.MapPost("/{id:guid}/cancel", async (
            Guid id,
            InvoicingDbContext dbContext,
            ICariLedgerService ledgerService,
            CancellationToken ct) =>
        {
            var invoice = await dbContext.Invoices
                .FirstOrDefaultAsync(i => i.Id == id, ct)
                ?? throw new NotFoundException($"Fatura bulunamadı (ID: {id})");

            if (invoice.Status == "Cancelled")
            {
                return Results.BadRequest(ApiResponse<string>.Fail("ALREADY_CANCELLED", "Fatura zaten iptal edilmiş."));
            }

            var previousStatus = invoice.Status;
            invoice.Status = "Cancelled";
            invoice.UpdatedAt = DateTime.UtcNow;

            // If it was issued, reverse the ledger balance
            if (previousStatus == "Issued" || previousStatus == "Approved" || previousStatus == "PartiallyPaid")
            {
                await ledgerService.ProcessInvoiceCancelledAsync(invoice, ct);
            }

            await dbContext.SaveChangesAsync(ct);
            return Results.Ok(ApiResponse<bool>.Ok(true));
        });

        // 7. POST /api/invoicing/invoices/{id}/generate-ubl (GİB e-Arşiv UBL-TR 2.1 XML Üret)
        group.MapPost("/{id:guid}/generate-ubl", async (
            Guid id,
            InvoicingDbContext dbContext,
            IUblTrXmlService ublService,
            CancellationToken ct) =>
        {
            var invoice = await dbContext.Invoices
                .Include(i => i.CariAccount)
                .Include(i => i.Items)
                .FirstOrDefaultAsync(i => i.Id == id, ct)
                ?? throw new NotFoundException($"Fatura bulunamadı (ID: {id})");

            invoice.Ettn ??= Guid.NewGuid();
            var supplierTitle = "CRM FİRMA ÜNVANI";
            var supplierTaxNumber = "1234567890";
            var supplierTaxOffice = "Büyük Mükellefler VD";
            var supplierAddress = "Merkez Mah. Teknoloji Cad. No:1 İstanbul";

            var xml = ublService.GenerateUblTr21Xml(
                invoice,
                supplierTitle,
                supplierTaxNumber,
                supplierTaxOffice,
                supplierAddress);

            invoice.UblXml = xml;
            invoice.EArchiveReportStatus = "Generated";
            invoice.UpdatedAt = DateTime.UtcNow;

            await dbContext.SaveChangesAsync(ct);

            return Results.Ok(ApiResponse<object>.Ok(new
            {
                ettn = invoice.Ettn,
                status = invoice.EArchiveReportStatus,
                xmlLength = xml.Length
            }));
        });

        // 8. GET /api/invoicing/invoices/{id}/download-ubl (UBL-TR XML İndir)
        group.MapGet("/{id:guid}/download-ubl", async (
            Guid id,
            InvoicingDbContext dbContext,
            IUblTrXmlService ublService,
            CancellationToken ct) =>
        {
            var invoice = await dbContext.Invoices
                .Include(i => i.CariAccount)
                .Include(i => i.Items)
                .FirstOrDefaultAsync(i => i.Id == id, ct)
                ?? throw new NotFoundException($"Fatura bulunamadı (ID: {id})");

            var xml = invoice.UblXml;
            if (string.IsNullOrWhiteSpace(xml))
            {
                invoice.Ettn ??= Guid.NewGuid();
                xml = ublService.GenerateUblTr21Xml(
                    invoice,
                    "CRM FİRMA ÜNVANI",
                    "1234567890",
                    "Büyük Mükellefler VD",
                    "Merkez Mah. Teknoloji Cad. No:1 İstanbul");

                invoice.UblXml = xml;
                invoice.EArchiveReportStatus = "Generated";
                await dbContext.SaveChangesAsync(ct);
            }

            var bytes = System.Text.Encoding.UTF8.GetBytes(xml);
            var filename = $"{invoice.InvoiceNumber}_{invoice.Ettn}.xml";

            return Results.File(bytes, "application/xml", filename);
        });
    }
}
