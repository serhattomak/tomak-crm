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

namespace CRM.Modules.Customers.Features.Deals.AddDealNote;

public record AddDealNoteCommand(
    Guid DealId,
    string Content,
    bool IsPinned = false) : ICommand<Guid>;

public class AddDealNoteValidator : AbstractValidator<AddDealNoteCommand>
{
    public AddDealNoteValidator()
    {
        RuleFor(x => x.DealId).NotEmpty();
        RuleFor(x => x.Content).NotEmpty().MaximumLength(4000);
    }
}

public class AddDealNoteHandler(
    CustomersDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<AddDealNoteCommand, Guid>
{
    public async Task<Result<Guid>> Handle(AddDealNoteCommand request, CancellationToken cancellationToken)
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

        var note = new DealNote
        {
            TenantId = tenantId,
            DealId = deal.Id,
            Content = request.Content.Trim(),
            IsPinned = request.IsPinned,
            CreatedAt = now,
            UpdatedAt = now
        };

        deal.Notes.Add(note);
        deal.LastActivityAt = now;
        deal.UpdatedAt = now;

        deal.Activities.Add(new DealActivity
        {
            TenantId = tenantId,
            ActivityType = "NoteAdded",
            Title = "Not Eklendi",
            Description = request.Content.Length > 80 ? request.Content[..80] + "..." : request.Content,
            CreatedAt = now
        });

        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success(note.Id);
    }
}

public class AddDealNoteEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/deals/{id:guid}/notes", async (
            Guid id,
            AddDealNoteCommand command,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            if (id != command.DealId)
            {
                return Results.BadRequest(ApiResponse<Guid>.Fail("ID mismatch", "BAD_REQUEST"));
            }

            var result = await sender.Send(command, ct);
            return Results.Ok(ApiResponse<Guid>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Deals.Update")
        .WithName("AddDealNote")
        .WithTags("Deals");
    }
}
