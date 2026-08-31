using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Orders.Data;
using CRM.Modules.Orders.Entities;
using FluentValidation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace CRM.Modules.Orders.Features.Orders.AddOrderPayment;

public record AddOrderPaymentRequest(
    decimal Amount,
    string? PaymentMethod, // BankTransfer, CreditCard, Cash, Check, OpenAccount
    string? ReferenceNumber,
    string? Notes,
    DateTime? PaymentDate);

public record AddOrderPaymentCommand(Guid OrderId, AddOrderPaymentRequest Request) : ICommand<Guid>;

public class AddOrderPaymentValidator : AbstractValidator<AddOrderPaymentCommand>
{
    private static readonly string[] ValidPaymentMethods =
    [
        "BankTransfer",
        "CreditCard",
        "Cash",
        "Check",
        "OpenAccount"
    ];

    public AddOrderPaymentValidator()
    {
        RuleFor(x => x.OrderId).NotEmpty().WithMessage("OrderId gereklidir.");

        RuleFor(x => x.Request.Amount)
            .GreaterThan(0)
            .WithMessage("Tutar 0'dan büyük olmalıdır.");

        // PaymentMethod — VARCHAR enum, null/empty allowed (fallback to order.PaymentMethod), but if provided must be valid
        When(x => !string.IsNullOrWhiteSpace(x.Request.PaymentMethod), () =>
        {
            RuleFor(x => x.Request.PaymentMethod!)
                .Must(m => ValidPaymentMethods.Contains(m.Trim()))
                .WithMessage($"Geçersiz ödeme yöntemi. İzin verilenler: {string.Join(", ", ValidPaymentMethods)}");
        });

        // ReferenceNumber — max 100, not 500 on missing trim
        When(x => x.Request.ReferenceNumber != null, () =>
        {
            RuleFor(x => x.Request.ReferenceNumber!)
                .MaximumLength(100)
                .WithMessage("Referans numarası en fazla 100 karakter olabilir.");
        });

        // Notes — guard for 500 on huge strings
        When(x => x.Request.Notes != null, () =>
        {
            RuleFor(x => x.Request.Notes!)
                .MaximumLength(2000)
                .WithMessage("Not en fazla 2000 karakter olabilir.");
        });

        // PaymentDate — optional, defaults to today; if provided must not be far future (now+1day tolerance) and not absurdly old
        When(x => x.Request.PaymentDate.HasValue, () =>
        {
            RuleFor(x => x.Request.PaymentDate!.Value)
                .Must(d => d <= DateTime.UtcNow.AddDays(1))
                .WithMessage("Ödeme tarihi gelecekte olamaz.")
                .Must(d => d >= new DateTime(2000, 1, 1, 0, 0, 0, DateTimeKind.Utc))
                .WithMessage("Ödeme tarihi geçersiz.");
        });
    }
}

public class AddOrderPaymentHandler(
    OrdersDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<AddOrderPaymentCommand, Guid>
{
    public async Task<Result<Guid>> Handle(AddOrderPaymentCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;
        var req = request.Request;

        // Null-guard for request to avoid 500 on malformed body
        if (req is null)
        {
            throw new BadRequestException("Ödeme bilgisi gereklidir.", "PAYMENT_REQUEST_NULL");
        }

        var order = await dbContext.Orders
            .Include(o => o.Payments)
            .Include(o => o.Activities)
            .FirstOrDefaultAsync(o => o.Id == request.OrderId && o.TenantId == tenantId, cancellationToken);

        if (order == null)
        {
            throw new NotFoundException($"Order '{request.OrderId}' not found.");
        }

        // ---- Overpayment guard (HardBlock) ----
        // Use sum of existing payments (authoritative per tenant/order) to compute remaining
        var totalPaid = order.Payments.Sum(p => p.Amount);
        // Fallback consistency: if PaidAmount stored differs, take max to avoid double-count drift is avoided by using sum
        var remaining = order.TotalAmount - totalPaid;

        // Guard: allow 0.01 tolerance for rounding
        if (req.Amount > remaining + 0.01m)
        {
            var remainingLabel = $"{Math.Max(0, remaining):N2} {order.Currency}";
            throw new BadRequestException(
                $"Tahsilat tutarı kalan tutarı aşamaz (Kalan: {remainingLabel})",
                "PAYMENT_EXCEEDS_REMAINING");
        }

        // ---- ReferenceNumber uniqueness per order (app-level fast-fail, DB index is final guard) ----
        var referenceTrimmed = string.IsNullOrWhiteSpace(req.ReferenceNumber) ? null : req.ReferenceNumber.Trim();
        if (!string.IsNullOrEmpty(referenceTrimmed))
        {
            var duplicateExists = await dbContext.OrderPayments
                .AnyAsync(
                    p => p.OrderId == order.Id
                         && p.TenantId == tenantId
                         && p.ReferenceNumber == referenceTrimmed,
                    cancellationToken);

            if (duplicateExists)
            {
                throw new ConflictException("Bu referans numarası zaten kullanılmış", "DUPLICATE_REFERENCE");
            }
        }

        var paymentId = Guid.NewGuid();
        var paymentDate = req.PaymentDate ?? DateTime.UtcNow;

        // Normalize paymentDate to UTC if Kind is unspecified
        if (paymentDate.Kind == DateTimeKind.Unspecified)
        {
            paymentDate = DateTime.SpecifyKind(paymentDate, DateTimeKind.Utc);
        }

        // PaymentMethod fallback: explicit value wins, otherwise preserve order's current method
        var method = !string.IsNullOrWhiteSpace(req.PaymentMethod)
            ? req.PaymentMethod.Trim()
            : order.PaymentMethod;

        // Safety: if method still empty, default to BankTransfer
        if (string.IsNullOrWhiteSpace(method))
        {
            method = "BankTransfer";
        }

        var payment = new OrderPayment
        {
            Id = paymentId,
            TenantId = tenantId,
            OrderId = order.Id,
            Amount = req.Amount,
            PaymentMethod = method,
            ReferenceNumber = referenceTrimmed,
            Notes = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim(),
            PaymentDate = paymentDate,
            CreatedAt = DateTime.UtcNow
        };

        dbContext.OrderPayments.Add(payment);

        var newPaidAmount = totalPaid + req.Amount;
        order.PaidAmount = newPaidAmount;
        order.UpdatedAt = DateTime.UtcNow;

        // PaymentStatus transitions
        if (newPaidAmount >= order.TotalAmount - 0.01m)
        {
            order.PaymentStatus = "Paid";
        }
        else if (newPaidAmount > 0)
        {
            order.PaymentStatus = "PartiallyPaid";
        }
        else
        {
            order.PaymentStatus = "Unpaid";
        }

        var activity = new OrderActivity
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            OrderId = order.Id,
            ActivityType = "PaymentAdded",
            Title = $"Tahsilat Kaydedildi: ₺{req.Amount:N2}",
            Description = $"{order.OrderNumber} için {req.Amount:N2} {order.Currency} tutarında tahsilat ({method}) işlendi. (Kalan Bakiye: ₺{Math.Max(0, order.TotalAmount - newPaidAmount):N2})",
            CreatedAt = DateTime.UtcNow
        };
        dbContext.OrderActivities.Add(activity);

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (IsUniqueViolation(ex))
        {
            // Race condition: concurrent insert with same ReferenceNumber hit the partial unique index
            throw new ConflictException("Bu referans numarası zaten kullanılmış", "DUPLICATE_REFERENCE");
        }

        return Result.Success(paymentId);
    }

    private static bool IsUniqueViolation(DbUpdateException ex)
    {
        if (ex.InnerException is PostgresException pg && pg.SqlState == PostgresErrorCodes.UniqueViolation)
        {
            return true;
        }

        // Fallback string check if inner is wrapped differently
        return ex.InnerException?.Message.Contains("23505") == true
               || ex.Message.Contains("23505");
    }
}

public class AddOrderPaymentEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/orders/{id:guid}/payments", async (
            Guid id,
            AddOrderPaymentRequest request,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new AddOrderPaymentCommand(id, request), ct);
            // 201 Created with Location for REST correctness; ApiResponse wrapper preserved for toast-friendly shape
            return Results.Created($"/api/orders/{id}/payments/{result.Value}", ApiResponse<Guid>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Orders.PaymentRecord")
        .WithName("AddOrderPayment")
        .WithTags("Orders");
    }
}
