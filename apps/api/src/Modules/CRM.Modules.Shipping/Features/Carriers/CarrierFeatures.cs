using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Shipping.Data;
using CRM.Modules.Shipping.Entities;
using FluentValidation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Shipping.Features.Carriers;

// DTOs
public record CarrierDto(
    Guid Id,
    string Code,
    string Name,
    string? TrackingUrlTemplate,
    string? CustomerAccountNumber,
    string? BranchCode,
    bool IsActive,
    bool IsDefault,
    int ActiveShipmentsCount
);

// 1. GetCarriersQuery
public record GetCarriersQuery(bool? ActiveOnly = null) : IQuery<List<CarrierDto>>;

public class GetCarriersHandler(
    ShippingDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetCarriersQuery, List<CarrierDto>>
{
    public async Task<Result<List<CarrierDto>>> Handle(GetCarriersQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
            throw new ForbiddenException("Tenant context is required.");

        var query = dbContext.Carriers.Include(c => c.Shipments).AsNoTracking();

        if (request.ActiveOnly == true)
            query = query.Where(c => c.IsActive);

        var carriers = await query
            .OrderByDescending(c => c.IsDefault)
            .ThenBy(c => c.Name)
            .ToListAsync(cancellationToken);

        var dtos = carriers.Select(c => new CarrierDto(
            c.Id,
            c.Code,
            c.Name,
            c.TrackingUrlTemplate,
            c.CustomerAccountNumber,
            c.BranchCode,
            c.IsActive,
            c.IsDefault,
            c.Shipments.Count(s => s.Status == "Dispatched" || s.Status == "InTransit")
        )).ToList();

        return Result<List<CarrierDto>>.Success(dtos);
    }
}

// 2. CreateCarrierCommand
public record CreateCarrierCommand(
    string Code,
    string Name,
    string? TrackingUrlTemplate,
    string? CustomerAccountNumber,
    string? BranchCode,
    bool IsDefault = false
) : ICommand<CarrierDto>;

public class CreateCarrierValidator : AbstractValidator<CreateCarrierCommand>
{
    public CreateCarrierValidator()
    {
        RuleFor(x => x.Code).NotEmpty().MaximumLength(50);
        RuleFor(x => x.Name).NotEmpty().MaximumLength(150);
    }
}

public class CreateCarrierHandler(
    ShippingDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<CreateCarrierCommand, CarrierDto>
{
    public async Task<Result<CarrierDto>> Handle(CreateCarrierCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
            throw new ForbiddenException("Tenant context is required.");

        var code = request.Code.ToUpper().Trim();
        var existing = await dbContext.Carriers.FirstOrDefaultAsync(c => c.Code == code, cancellationToken);
        if (existing != null)
        {
            existing.Name = request.Name.Trim();
            existing.TrackingUrlTemplate = request.TrackingUrlTemplate?.Trim() ?? existing.TrackingUrlTemplate;
            existing.CustomerAccountNumber = request.CustomerAccountNumber?.Trim() ?? existing.CustomerAccountNumber;
            existing.BranchCode = request.BranchCode?.Trim() ?? existing.BranchCode;
            existing.IsActive = true;
            existing.UpdatedAt = DateTime.UtcNow;

            if (request.IsDefault)
            {
                var existingDefaults = await dbContext.Carriers.Where(c => c.IsDefault && c.Id != existing.Id).ToListAsync(cancellationToken);
                foreach (var d in existingDefaults) d.IsDefault = false;
                existing.IsDefault = true;
            }

            await dbContext.SaveChangesAsync(cancellationToken);

            return Result<CarrierDto>.Success(new CarrierDto(
                existing.Id,
                existing.Code,
                existing.Name,
                existing.TrackingUrlTemplate,
                existing.CustomerAccountNumber,
                existing.BranchCode,
                existing.IsActive,
                existing.IsDefault,
                0
            ));
        }

        var carrier = new ShippingCarrier
        {
            TenantId = currentTenant.Id.Value,
            Code = code,
            Name = request.Name.Trim(),
            TrackingUrlTemplate = request.TrackingUrlTemplate?.Trim(),
            CustomerAccountNumber = request.CustomerAccountNumber?.Trim(),
            BranchCode = request.BranchCode?.Trim(),
            IsActive = true,
            IsDefault = request.IsDefault,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        if (carrier.IsDefault)
        {
            var existingDefaults = await dbContext.Carriers.Where(c => c.IsDefault).ToListAsync(cancellationToken);
            foreach (var d in existingDefaults) d.IsDefault = false;
        }

        dbContext.Carriers.Add(carrier);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result<CarrierDto>.Success(new CarrierDto(
            carrier.Id,
            carrier.Code,
            carrier.Name,
            carrier.TrackingUrlTemplate,
            carrier.CustomerAccountNumber,
            carrier.BranchCode,
            carrier.IsActive,
            carrier.IsDefault,
            0
        ));
    }
}

// 3. FastEndpoints Mapping
public class CarrierEndpoints : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/shipping/carriers").WithTags("Shipping - Carriers");

        group.MapGet("/", async (bool? activeOnly, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new GetCarriersQuery(activeOnly), ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<List<CarrierDto>>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<List<CarrierDto>>.Fail(result.Error.Code, result.Error.Description));
        }).RequirePermission("Shipment.View");

        group.MapPost("/", async (CreateCarrierCommand command, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(command, ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<CarrierDto>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<CarrierDto>.Fail(result.Error.Code, result.Error.Description));
        }).RequirePermission("Shipment.Manage");

        group.MapDelete("/{id:guid}", async (Guid id, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new DeleteCarrierCommand(id), ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<bool>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<bool>.Fail(result.Error.Code, result.Error.Description));
        }).RequirePermission("Shipment.Manage");
    }
}

// 4. DeleteCarrierCommand
public record DeleteCarrierCommand(Guid Id) : ICommand<bool>;

public class DeleteCarrierHandler(
    ShippingDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<DeleteCarrierCommand, bool>
{
    public async Task<Result<bool>> Handle(DeleteCarrierCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
            throw new ForbiddenException("Tenant context is required.");

        var carrier = await dbContext.Carriers
            .FirstOrDefaultAsync(s => s.Id == request.Id, cancellationToken);

        if (carrier == null)
            return Result.Failure<bool>(new Error("Shipping.NotFound", "Silinecek kargo taşıyıcısı bulunamadı."));

        dbContext.Carriers.Remove(carrier);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result<bool>.Success(true);
    }
}

