using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Products.Data;
using CRM.Modules.Products.Entities;
using FluentValidation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace CRM.Modules.Products.Features.Brands.CreateBrand;

public record CreateBrandRequest(string Name, string? LogoUrl, string? Website, bool? IsActive);

public record CreateBrandCommand(CreateBrandRequest Request) : ICommand<Guid>;

public class CreateBrandValidator : AbstractValidator<CreateBrandCommand>
{
    public CreateBrandValidator() =>
        RuleFor(x => x.Request.Name).NotEmpty().MaximumLength(255);
}

public class CreateBrandHandler(
    ProductsDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<CreateBrandCommand, Guid>
{
    public async Task<Result<Guid>> Handle(CreateBrandCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
            throw new ForbiddenException("Tenant context is required.");

        var req = request.Request;
        var brand = new Brand
        {
            Id = Guid.NewGuid(),
            TenantId = currentTenant.Id.Value,
            Name = req.Name.Trim(),
            LogoUrl = req.LogoUrl?.Trim(),
            Website = req.Website?.Trim(),
            IsActive = req.IsActive ?? true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        dbContext.Brands.Add(brand);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success(brand.Id);
    }
}

public class CreateBrandEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/brands", async (
            CreateBrandRequest request,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new CreateBrandCommand(request), ct);
            return Results.Ok(ApiResponse<Guid>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Products.Create")
        .WithName("CreateBrand")
        .WithTags("Brands");
    }
}
