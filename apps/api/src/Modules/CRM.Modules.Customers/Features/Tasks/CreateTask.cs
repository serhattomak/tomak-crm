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

namespace CRM.Modules.Customers.Features.Tasks;

public record CreateTaskRequest(
    string Title,
    string? Description = null,
    DateTime? DueDate = null,
    string? Priority = "medium",
    string? Category = "Genel",
    Guid? AssignedUserId = null,
    string? AssignedUserName = null,
    Guid? CustomerId = null,
    string? CustomerName = null,
    Guid? DealId = null);

public record CreateTaskCommand(
    string Title,
    string? Description,
    DateTime? DueDate,
    string Priority,
    string Category,
    Guid? AssignedUserId,
    string? AssignedUserName,
    Guid? CustomerId,
    string? CustomerName,
    Guid? DealId) : ICommand<Guid>;

public class CreateTaskValidator : AbstractValidator<CreateTaskCommand>
{
    public CreateTaskValidator()
    {
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Görev başlığı zorunludur.")
            .MaximumLength(255).WithMessage("Başlık en fazla 255 karakter olabilir.");

        RuleFor(x => x.Priority)
            .NotEmpty().WithMessage("Öncelik zorunludur.");

        RuleFor(x => x.Category)
            .NotEmpty().WithMessage("Kategori zorunludur.");
    }
}

public class CreateTaskHandler(
    CustomersDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<CreateTaskCommand, Guid>
{
    public async Task<Result<Guid>> Handle(CreateTaskCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        string? resolvedCustomerName = request.CustomerName;
        if (request.CustomerId.HasValue && string.IsNullOrWhiteSpace(resolvedCustomerName))
        {
            var customer = await dbContext.Customers
                .Where(c => c.Id == request.CustomerId.Value)
                .Select(c => c.Name)
                .FirstOrDefaultAsync(cancellationToken);
            resolvedCustomerName = customer;
        }

        var task = new CrmTask
        {
            Id = Guid.NewGuid(),
            TenantId = currentTenant.Id.Value,
            Title = request.Title.Trim(),
            Description = request.Description?.Trim(),
            DueDate = request.DueDate,
            Priority = string.IsNullOrWhiteSpace(request.Priority) ? "medium" : request.Priority.ToLower(),
            Status = "Pending",
            IsCompleted = false,
            Category = string.IsNullOrWhiteSpace(request.Category) ? "Genel" : request.Category.Trim(),
            AssignedUserId = request.AssignedUserId,
            AssignedUserName = request.AssignedUserName,
            CustomerId = request.CustomerId,
            CustomerName = resolvedCustomerName,
            DealId = request.DealId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        dbContext.Tasks.Add(task);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(task.Id);
    }
}

public class CreateTaskEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/tasks", async (
            CreateTaskRequest request,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var command = new CreateTaskCommand(
                request.Title,
                request.Description,
                request.DueDate,
                request.Priority ?? "medium",
                request.Category ?? "Genel",
                request.AssignedUserId,
                request.AssignedUserName,
                request.CustomerId,
                request.CustomerName,
                request.DealId);

            var result = await sender.Send(command, ct);
            return Results.Created($"/api/tasks/{result.Value}", ApiResponse<Guid>.Ok(result.Value));
        })
        .RequireAuthorization()
        .WithName("CreateTask")
        .WithTags("Tasks");
    }
}
