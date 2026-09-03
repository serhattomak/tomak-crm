using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Products.Data;
using FluentValidation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Products.Features.Brands.UpdateBrand;

public record UpdateBrandRequest(string Name, string? LogoUrl, string? Website, bool? IsActive);

public record UpdateBrandCommand(Guid Id, UpdateBrandRequest Request) : ICommand<bool>;

public class UpdateBrandValidator : AbstractValidator<UpdateBrandCommand>
{
    public UpdateBrandValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Request.Name).NotEmpty().MaximumLength(255);
    }
}

public class UpdateBrandHandler(
    ProductsDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<UpdateBrandCommand, bool>
{
    public async Task<Result<bool>> Handle(UpdateBrandCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
            throw new ForbiddenException("Tenant context is required.");

        var brand = await dbContext.Brands
            .FirstOrDefaultAsync(b => b.Id == request.Id && b.TenantId == currentTenant.Id.Value, cancellationToken)
            ?? throw new NotFoundException($"Brand ''{request.Id}'' not found.");

        var req = request.Request;
        brand.Name = req.Name.Trim();
        brand.LogoUrl = req.LogoUrl?.Trim();
        brand.Website = req.Website?.Trim();
        if (req.IsActive.HasValue) brand.IsActive = req.IsActive.Value;
        brand.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success(true);
    }
}

public class UpdateBrandEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPut("/api/brands/{id:guid}", async (
            Guid id,
            UpdateBrandRequest request,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new UpdateBrandCommand(id, request), ct);
            return Results.Ok(ApiResponse<bool>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Products.Update")
        .WithName("UpdateBrand")
        .WithTags("Brands");
    }
}
