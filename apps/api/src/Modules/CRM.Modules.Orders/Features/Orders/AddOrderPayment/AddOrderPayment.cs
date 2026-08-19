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
    public AddOrderPaymentValidator()
    {
        RuleFor(x => x.OrderId).NotEmpty();
        RuleFor(x => x.Request.Amount).GreaterThan(0);
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

        var order = await dbContext.Orders
            .Include(o => o.Payments)
            .Include(o => o.Activities)
            .FirstOrDefaultAsync(o => o.Id == request.OrderId && o.TenantId == tenantId, cancellationToken);

        if (order == null)
        {
            throw new NotFoundException($"Order '{request.OrderId}' not found.");
        }

        var req = request.Request;
        var paymentId = Guid.NewGuid();
        var paymentDate = req.PaymentDate ?? DateTime.UtcNow;
        var method = !string.IsNullOrWhiteSpace(req.PaymentMethod) ? req.PaymentMethod : order.PaymentMethod;

        var payment = new OrderPayment
        {
            Id = paymentId,
            TenantId = tenantId,
            OrderId = order.Id,
            Amount = req.Amount,
            PaymentMethod = method,
            ReferenceNumber = req.ReferenceNumber?.Trim(),
            Notes = req.Notes?.Trim(),
            PaymentDate = paymentDate,
            CreatedAt = DateTime.UtcNow
        };

        dbContext.OrderPayments.Add(payment);

        var newPaidAmount = order.Payments.Sum(p => p.Amount) + req.Amount;
        order.PaidAmount = newPaidAmount;
        order.UpdatedAt = DateTime.UtcNow;

        if (newPaidAmount >= order.TotalAmount)
        {
            order.PaymentStatus = "Paid";
        }
        else if (newPaidAmount > 0)
        {
            order.PaymentStatus = "PartiallyPaid";
        }

        order.Activities.Add(new OrderActivity
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            OrderId = order.Id,
            ActivityType = "PaymentAdded",
            Title = $"Tahsilat Kaydedildi: ₺{req.Amount:N2}",
            Description = $"{order.OrderNumber} için {req.Amount:N2} {order.Currency} tutarında tahsilat ({method}) işlendi. (Kalan Bakiye: ₺{Math.Max(0, order.TotalAmount - newPaidAmount):N2})",
            CreatedAt = DateTime.UtcNow
        });

        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(paymentId);
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
            return Results.Ok(ApiResponse<Guid>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Orders.PaymentRecord")
        .WithName("AddOrderPayment")
        .WithTags("Orders");
    }
}
