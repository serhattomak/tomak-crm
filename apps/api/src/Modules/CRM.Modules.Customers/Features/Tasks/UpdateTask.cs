using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Customers.Data;
using FluentValidation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Customers.Features.Tasks;

public record UpdateTaskRequest(
    string Title,
    string? Description = null,
    DateTime? DueDate = null,
    string? Priority = "medium",
    string? Status = "Pending",
    bool? IsCompleted = null,
    string? Category = "Genel",
    Guid? AssignedUserId = null,
    string? AssignedUserName = null,
    Guid? CustomerId = null,
    string? CustomerName = null,
    Guid? DealId = null);

public record UpdateTaskCommand(
    Guid Id,
    string Title,
    string? Description,
    DateTime? DueDate,
    string Priority,
    string Status,
    bool? IsCompleted,
    string Category,
    Guid? AssignedUserId,
    string? AssignedUserName,
    Guid? CustomerId,
    string? CustomerName,
    Guid? DealId) : ICommand<bool>;

public class UpdateTaskValidator : AbstractValidator<UpdateTaskCommand>
{
    public UpdateTaskValidator()
    {
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Görev başlığı zorunludur.")
            .MaximumLength(255).WithMessage("Başlık en fazla 255 karakter olabilir.");
    }
}

public class UpdateTaskHandler(
    CustomersDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<UpdateTaskCommand, bool>
{
    public async Task<Result<bool>> Handle(UpdateTaskCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var task = await dbContext.Tasks
            .FirstOrDefaultAsync(t => t.Id == request.Id, cancellationToken);

        if (task == null)
        {
            throw new NotFoundException($"Task {request.Id} not found.");
        }

        if (task.TenantId != currentTenant.Id.Value)
        {
            throw new ForbiddenException("Unauthorized access to task.");
        }

        task.Title = request.Title.Trim();
        task.Description = request.Description?.Trim();
        task.DueDate = request.DueDate;
        task.Priority = string.IsNullOrWhiteSpace(request.Priority) ? "medium" : request.Priority.ToLower();
        task.Status = string.IsNullOrWhiteSpace(request.Status) ? task.Status : request.Status;
        task.Category = string.IsNullOrWhiteSpace(request.Category) ? "Genel" : request.Category;
        task.AssignedUserId = request.AssignedUserId;
        task.AssignedUserName = request.AssignedUserName;
        task.CustomerId = request.CustomerId;
        task.CustomerName = request.CustomerName;
        task.DealId = request.DealId;

        if (request.IsCompleted.HasValue)
        {
            task.IsCompleted = request.IsCompleted.Value;
            task.CompletedAt = request.IsCompleted.Value ? (task.CompletedAt ?? DateTime.UtcNow) : null;
            if (task.IsCompleted && task.Status == "Pending")
            {
                task.Status = "Completed";
            }
        }

        task.UpdatedAt = DateTime.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(true);
    }
}

public class UpdateTaskEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPut("/api/tasks/{id:guid}", async (
            Guid id,
            UpdateTaskRequest request,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var command = new UpdateTaskCommand(
                id,
                request.Title,
                request.Description,
                request.DueDate,
                request.Priority ?? "medium",
                request.Status ?? "Pending",
                request.IsCompleted,
                request.Category ?? "Genel",
                request.AssignedUserId,
                request.AssignedUserName,
                request.CustomerId,
                request.CustomerName,
                request.DealId);

            var result = await sender.Send(command, ct);
            return Results.Ok(ApiResponse<bool>.Ok(result.Value));
        })
        .RequireAuthorization()
        .WithName("UpdateTask")
        .WithTags("Tasks");
    }
}
