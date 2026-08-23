using CRM.BuildingBlocks.Caching;
using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.Modules.Tenants.Data;
using CRM.Modules.Tenants.Entities;
using CRM.Modules.Tenants.Features.GetIndustryTemplates;
using FluentValidation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Tenants.Features.Admin.SaveIndustryTemplate;

public record SaveIndustryTemplateCommand(
    Guid? Id,
    string Key,
    string Name,
    string? Description,
    string LabelsJson,
    string[] DefaultModules) : ICommand<IndustryTemplateDto>;

public class SaveIndustryTemplateValidator : AbstractValidator<SaveIndustryTemplateCommand>
{
    public SaveIndustryTemplateValidator()
    {
        RuleFor(x => x.Key).NotEmpty().MaximumLength(50);
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.LabelsJson).NotEmpty();
    }
}

public class SaveIndustryTemplateHandler(
    TenantsDbContext dbContext,
    ICacheService cacheService) : ICommandHandler<SaveIndustryTemplateCommand, IndustryTemplateDto>
{
    public async Task<Result<IndustryTemplateDto>> Handle(SaveIndustryTemplateCommand request, CancellationToken cancellationToken)
    {
        IndustryTemplate? template;

        if (request.Id.HasValue && request.Id.Value != Guid.Empty)
        {
            template = await dbContext.IndustryTemplates.FindAsync([request.Id.Value], cancellationToken);
            if (template is null)
            {
                throw new NotFoundException($"Industry template with ID '{request.Id.Value}' was not found.");
            }

            template.Key = request.Key.Trim().ToLowerInvariant();
            template.Name = request.Name.Trim();
            template.Description = request.Description;
            template.LabelsJson = request.LabelsJson;
            template.DefaultModules = request.DefaultModules;
        }
        else
        {
            var keyExists = await dbContext.IndustryTemplates.AnyAsync(t => t.Key == request.Key.ToLowerInvariant(), cancellationToken);
            if (keyExists)
            {
                throw new ConflictException($"An industry template with key '{request.Key}' already exists.");
            }

            template = new IndustryTemplate
            {
                Key = request.Key.Trim().ToLowerInvariant(),
                Name = request.Name.Trim(),
                Description = request.Description,
                LabelsJson = request.LabelsJson,
                DefaultModules = request.DefaultModules
            };

            dbContext.IndustryTemplates.Add(template);
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        // Invalidate templates cache
        await cacheService.RemoveAsync("industry-templates:all", cancellationToken);
        await cacheService.RemoveByTagAsync("industry-templates", cancellationToken);

        return new IndustryTemplateDto(
            template.Id,
            template.Key,
            template.Name,
            template.Description,
            template.LabelsJson,
            template.DefaultModules,
            template.CreatedAt
        );
    }
}

public class SaveIndustryTemplateEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/admin/templates", async (SaveIndustryTemplateCommand command, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(command, ct);
            return Results.Ok(ApiResponse<IndustryTemplateDto>.Ok(result.Value, "Template saved successfully."));
        })
        .RequireAuthorization()
        .RequireSuperAdmin()
        .WithName("SaveIndustryTemplate")
        .WithTags("Admin");
    }
}
