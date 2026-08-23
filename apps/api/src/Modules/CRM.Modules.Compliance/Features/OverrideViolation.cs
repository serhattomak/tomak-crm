using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Security;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Compliance.Data;
using FluentValidation;
using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Compliance.Features;

public record OverrideViolationCommand(
    Guid Id,
    string OverrideReason
) : ICommand<bool>;

public class OverrideViolationValidator : AbstractValidator<OverrideViolationCommand>
{
    public OverrideViolationValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.OverrideReason).NotEmpty().WithMessage("İstisna ve yönetici onayı için geçerli bir gerekçe belirtilmelidir.").MinimumLength(5);
    }
}

public class OverrideViolationHandler(
    ComplianceDbContext dbContext,
    ICurrentTenant currentTenant,
    ICurrentUser currentUser) : ICommandHandler<OverrideViolationCommand, bool>
{
    public async Task<Result<bool>> Handle(OverrideViolationCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue)
        {
            return Result.Failure<bool>(Error.Unauthorized);
        }

        var violation = await dbContext.Violations.FirstOrDefaultAsync(v => v.Id == request.Id, cancellationToken);
        if (violation == null)
        {
            return Result.Failure<bool>(Error.NotFound);
        }

        violation.IsOverridden = true;
        violation.Status = "Overridden";
        violation.OverrideReason = request.OverrideReason.Trim();
        violation.OverriddenByUserId = currentUser.Id;
        violation.OverriddenAt = DateTimeOffset.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success(true);
    }
}

public class OverrideViolationEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/compliance/violations/{id:guid}/override", async (Guid id, OverrideViolationCommand command, ISender sender, CancellationToken ct) =>
        {
            if (id != command.Id)
            {
                command = command with { Id = id };
            }

            var result = await sender.Send(command, ct);
            return result.IsSuccess ? Results.Ok(ApiResponse<bool>.Ok(result.Value))
                                    : Results.BadRequest(ApiResponse<bool>.Fail(result.Error.Code, result.Error.Description));
        })
        .WithName("OverrideComplianceViolation")
        .WithTags("Compliance")
        .RequirePermission("Compliance.Override");
    }
}
