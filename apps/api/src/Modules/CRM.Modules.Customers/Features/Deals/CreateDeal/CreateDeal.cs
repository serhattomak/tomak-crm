using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Customers.Data;
using CRM.Modules.Customers.Entities;
using CRM.Modules.Customers.Services;
using CRM.Modules.Organization.Data;
using FluentValidation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Customers.Features.Deals.CreateDeal;

public record CreateDealCommand(
    Guid PipelineId,
    Guid? StageId,
    Guid? CustomerId,
    string Title,
    decimal Value = 0.00m,
    string Currency = "TRY",
    string Priority = "Medium",
    Guid? AssignedUserId = null,
    string Source = "Manual",
    string? SourceReferenceId = null,
    string? ContactName = null,
    string? ContactEmail = null,
    string? ContactPhone = null,
    string[]? Tags = null,
    string? InitialNote = null) : ICommand<Guid>;

public class CreateDealValidator : AbstractValidator<CreateDealCommand>
{
    public CreateDealValidator()
    {
        RuleFor(x => x.PipelineId).NotEmpty();
        RuleFor(x => x.Title).NotEmpty().MaximumLength(255);
        RuleFor(x => x.Value).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Priority).Must(p => new[] { "Low", "Medium", "High", "Urgent" }.Contains(p));
    }
}

public class CreateDealHandler(
    CustomersDbContext dbContext,
    OrganizationDbContext orgDbContext,
    IPipelineAssignmentService assignmentService,
    ICurrentTenant currentTenant) : ICommandHandler<CreateDealCommand, Guid>
{
    public async Task<Result<Guid>> Handle(CreateDealCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;
        var now = DateTime.UtcNow;

        var pipeline = await dbContext.Pipelines
            .Include(p => p.Stages)
            .FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == request.PipelineId, cancellationToken);

        if (pipeline == null)
        {
            throw new NotFoundException($"Pipeline {request.PipelineId} not found.");
        }

        var stage = request.StageId.HasValue
            ? pipeline.Stages.FirstOrDefault(s => s.Id == request.StageId.Value)
            : pipeline.Stages.OrderBy(s => s.OrderIndex).FirstOrDefault();

        if (stage == null)
        {
            throw new BadRequestException("Seçilen pipeline için geçerli bir aşama bulunamadı.");
        }

        // Determine Assignee
        Guid? assignedUserId = request.AssignedUserId;
        string? assignedUserName = null;

        if (assignedUserId.HasValue && assignedUserId.Value != Guid.Empty)
        {
            var emp = await orgDbContext.Employees.FirstOrDefaultAsync(e => e.TenantId == tenantId && e.UserId == assignedUserId.Value, cancellationToken);
            assignedUserName = emp != null ? $"{emp.FirstName} {emp.LastName}".Trim() : "Temsilci";
        }
        else
        {
            // Run Auto-Routing Assignment Engine
            var (autoUserId, autoUserName) = await assignmentService.DetermineNextAssigneeAsync(tenantId, pipeline.Id, stage.Id, cancellationToken);
            assignedUserId = autoUserId;
            assignedUserName = autoUserName;
        }

        // Customer linking / creation
        Guid? customerId = request.CustomerId;
        if ((!customerId.HasValue || customerId.Value == Guid.Empty) && !string.IsNullOrWhiteSpace(request.ContactName))
        {
            // Auto match or create Customer
            var existingCustomer = !string.IsNullOrWhiteSpace(request.ContactEmail)
                ? await dbContext.Customers.FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Email == request.ContactEmail.Trim().ToLower(), cancellationToken)
                : null;

            if (existingCustomer != null)
            {
                customerId = existingCustomer.Id;
            }
            else
            {
                var newLead = new Customer
                {
                    TenantId = tenantId,
                    Type = "Individual",
                    Name = request.ContactName.Trim(),
                    Email = request.ContactEmail?.Trim().ToLower(),
                    Phone = request.ContactPhone?.Trim(),
                    Status = "Lead",
                    Tier = "Standard",
                    AssignedUserId = assignedUserId,
                    CreatedAt = now,
                    UpdatedAt = now
                };
                dbContext.Customers.Add(newLead);
                customerId = newLead.Id;
            }
        }

        DateTime? slaDue = stage.SlaHours.HasValue ? now.AddHours(stage.SlaHours.Value) : null;

        var deal = new Deal
        {
            TenantId = tenantId,
            PipelineId = pipeline.Id,
            StageId = stage.Id,
            CustomerId = customerId,
            Title = request.Title.Trim(),
            Value = request.Value,
            Currency = request.Currency,
            Priority = request.Priority,
            Status = "Open",
            AssignedUserId = assignedUserId,
            AssignedUserName = assignedUserName,
            Source = request.Source,
            SourceReferenceId = request.SourceReferenceId,
            ContactName = request.ContactName?.Trim(),
            ContactEmail = request.ContactEmail?.Trim().ToLower(),
            ContactPhone = request.ContactPhone?.Trim(),
            StageEnteredAt = now,
            LastActivityAt = now,
            SlaDueDate = slaDue,
            Tags = request.Tags,
            CreatedAt = now,
            UpdatedAt = now
        };

        deal.Activities.Add(new DealActivity
        {
            TenantId = tenantId,
            ActivityType = "DealCreated",
            Title = "Fırsat Kartı Oluşturuldu",
            Description = $"Fırsat '{deal.Title}' oluşturuldu. Aşama: '{stage.Name}'{(assignedUserName != null ? $", Atanan Temsilci: {assignedUserName}" : ", Henüz atanmadı")}",
            NewValue = stage.Name,
            CreatedAt = now
        });

        if (!string.IsNullOrWhiteSpace(request.InitialNote))
        {
            deal.Notes.Add(new DealNote
            {
                TenantId = tenantId,
                Content = request.InitialNote.Trim(),
                UserId = assignedUserId,
                UserName = assignedUserName,
                CreatedAt = now,
                UpdatedAt = now
            });
        }

        dbContext.Deals.Add(deal);

        if (customerId.HasValue)
        {
            var customer = await dbContext.Customers.FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Id == customerId.Value, cancellationToken);
            if (customer != null)
            {
                customer.DealsCount += 1;
                customer.UpdatedAt = now;
            }
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(deal.Id);
    }
}

public class CreateDealEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/deals", async (
            CreateDealCommand command,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(command, ct);
            return Results.Ok(ApiResponse<Guid>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Deals.Create")
        .WithName("CreateDeal")
        .WithTags("Deals");
    }
}
