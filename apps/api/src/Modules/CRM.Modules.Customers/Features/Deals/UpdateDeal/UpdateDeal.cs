using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Customers.Data;
using CRM.Modules.Customers.Entities;
using FluentValidation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Customers.Features.Deals.UpdateDeal;

public record UpdateDealCommand(
    Guid Id,
    string Title,
    decimal Value,
    string Currency,
    string Priority,
    string? ContactName,
    string? ContactEmail,
    string? ContactPhone,
    string[]? Tags) : ICommand<bool>;

public class UpdateDealValidator : AbstractValidator<UpdateDealCommand>
{
    public UpdateDealValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Title).NotEmpty().MaximumLength(255);
        RuleFor(x => x.Value).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Priority).Must(p => new[] { "Low", "Medium", "High", "Urgent" }.Contains(p));
    }
}

public class UpdateDealHandler(
    CustomersDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<UpdateDealCommand, bool>
{
    public async Task<Result<bool>> Handle(UpdateDealCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;
        var now = DateTime.UtcNow;

        var deal = await dbContext.Deals
            .FirstOrDefaultAsync(d => d.TenantId == tenantId && d.Id == request.Id, cancellationToken);

        if (deal == null)
        {
            throw new NotFoundException($"Deal {request.Id} not found.");
        }

        var valueChanged = deal.Value != request.Value;
        var oldValue = $"{deal.Value} {deal.Currency}";
        var newValue = $"{request.Value} {request.Currency}";

        deal.Title = request.Title.Trim();
        deal.Value = request.Value;
        deal.Currency = request.Currency;
        deal.Priority = request.Priority;
        deal.ContactName = request.ContactName?.Trim();
        deal.ContactEmail = request.ContactEmail?.Trim().ToLower();
        deal.ContactPhone = request.ContactPhone?.Trim();
        deal.Tags = request.Tags;
        deal.LastActivityAt = now;
        deal.UpdatedAt = now;

        if (valueChanged)
        {
            deal.Activities.Add(new DealActivity
            {
                TenantId = tenantId,
                ActivityType = "ValueUpdated",
                Title = "Fırsat Tutarı Güncellendi",
                Description = $"Tutar {oldValue} ➔ {newValue} olarak güncellendi.",
                OldValue = oldValue,
                NewValue = newValue,
                CreatedAt = now
            });
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success(true);
    }
}

public class UpdateDealEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPut("/api/deals/{id:guid}", async (
            Guid id,
            UpdateDealCommand command,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            if (id != command.Id)
            {
                return Results.BadRequest(ApiResponse<bool>.Fail("ID mismatch", "BAD_REQUEST"));
            }

            var result = await sender.Send(command, ct);
            return Results.Ok(ApiResponse<bool>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Deals.Update")
        .WithName("UpdateDeal")
        .WithTags("Deals");
    }
}
