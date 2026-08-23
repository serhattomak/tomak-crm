using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Customers.Data;
using CRM.Modules.Customers.Entities;
using CRM.Modules.Organization.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Customers.Features.Deals.AssignDeal;

public record AssignDealCommand(
    Guid DealId,
    Guid? AssignedUserId) : ICommand<bool>;

public class AssignDealHandler(
    CustomersDbContext dbContext,
    OrganizationDbContext orgDbContext,
    ICurrentTenant currentTenant) : ICommandHandler<AssignDealCommand, bool>
{
    public async Task<Result<bool>> Handle(AssignDealCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;
        var now = DateTime.UtcNow;

        var deal = await dbContext.Deals
            .FirstOrDefaultAsync(d => d.TenantId == tenantId && d.Id == request.DealId, cancellationToken);

        if (deal == null)
        {
            throw new NotFoundException($"Deal {request.DealId} not found.");
        }

        var oldAssignee = deal.AssignedUserName ?? "Atanmamış";
        string? newAssigneeName = null;

        if (request.AssignedUserId.HasValue && request.AssignedUserId.Value != Guid.Empty)
        {
            var emp = await orgDbContext.Employees
                .FirstOrDefaultAsync(e => e.TenantId == tenantId && e.UserId == request.AssignedUserId.Value, cancellationToken);

            newAssigneeName = emp != null ? $"{emp.FirstName} {emp.LastName}".Trim() : "Temsilci";
            deal.AssignedUserId = request.AssignedUserId.Value;
            deal.AssignedUserName = newAssigneeName;
        }
        else
        {
            deal.AssignedUserId = null;
            deal.AssignedUserName = null;
            newAssigneeName = "Havuz (Atanmamış)";
        }

        deal.LastActivityAt = now;
        deal.UpdatedAt = now;

        dbContext.DealActivities.Add(new DealActivity
        {
            TenantId = tenantId,
            DealId = deal.Id,
            ActivityType = "AssignmentChange",
            Title = "Temsilci Ataması Değiştirildi",
            Description = $"Fırsat sorumlusu '{oldAssignee}' ➔ '{newAssigneeName}' olarak değiştirildi.",
            OldValue = oldAssignee,
            NewValue = newAssigneeName,
            CreatedAt = now
        });

        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success(true);
    }
}

public class AssignDealEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/deals/{id:guid}/assign", async (
            Guid id,
            AssignDealCommand command,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            if (id != command.DealId)
            {
                return Results.BadRequest(ApiResponse<bool>.Fail("ID mismatch", "BAD_REQUEST"));
            }

            var result = await sender.Send(command, ct);
            return Results.Ok(ApiResponse<bool>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Deals.Assign")
        .WithName("AssignDeal")
        .WithTags("Deals");
    }
}
