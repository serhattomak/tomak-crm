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

namespace CRM.Modules.Shipping.Features.Returns;

// DTOs
public record ReturnShipmentDto(
    Guid Id,
    string ReturnCode,
    Guid? OriginalShipmentId,
    Guid? OrderId,
    Guid? CustomerId,
    string CustomerName,
    Guid? CarrierId,
    string? CarrierName,
    string? TrackingNumber,
    string Reason,
    string Status,
    string? InspectionNotes,
    Guid? InspectedByUserId,
    string? InspectedByName,
    DateTime? InspectedAt,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

// 1. GetReturnShipmentsQuery
public record GetReturnShipmentsQuery(
    string? Status = null,
    Guid? CustomerId = null,
    string? Search = null
) : IQuery<List<ReturnShipmentDto>>;

public class GetReturnShipmentsHandler(
    ShippingDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetReturnShipmentsQuery, List<ReturnShipmentDto>>
{
    public async Task<Result<List<ReturnShipmentDto>>> Handle(GetReturnShipmentsQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
            throw new ForbiddenException("Tenant context is required.");

        var query = dbContext.ReturnShipments.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(request.Status))
            query = query.Where(r => r.Status == request.Status);

        if (request.CustomerId.HasValue)
            query = query.Where(r => r.CustomerId == request.CustomerId);

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var s = request.Search.ToLower();
            query = query.Where(r =>
                r.ReturnCode.ToLower().Contains(s) ||
                (r.TrackingNumber != null && r.TrackingNumber.ToLower().Contains(s)) ||
                r.CustomerName.ToLower().Contains(s) ||
                r.Reason.ToLower().Contains(s));
        }

        var list = await query
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync(cancellationToken);

        var dtos = list.Select(r => new ReturnShipmentDto(
            r.Id,
            r.ReturnCode,
            r.OriginalShipmentId,
            r.OrderId,
            r.CustomerId,
            r.CustomerName,
            r.CarrierId,
            r.CarrierName,
            r.TrackingNumber,
            r.Reason,
            r.Status,
            r.InspectionNotes,
            r.InspectedByUserId,
            r.InspectedByName,
            r.InspectedAt,
            r.CreatedAt,
            r.UpdatedAt
        )).ToList();

        return Result<List<ReturnShipmentDto>>.Success(dtos);
    }
}

// 2. CreateReturnShipmentCommand
public record CreateReturnShipmentCommand(
    Guid? OriginalShipmentId,
    Guid? OrderId,
    Guid? CustomerId,
    string CustomerName,
    Guid? CarrierId,
    string? TrackingNumber,
    string Reason
) : ICommand<ReturnShipmentDto>;

public class CreateReturnShipmentValidator : AbstractValidator<CreateReturnShipmentCommand>
{
    public CreateReturnShipmentValidator()
    {
        RuleFor(x => x.CustomerName).NotEmpty();
        RuleFor(x => x.Reason).NotEmpty().MaximumLength(255);
    }
}

public class CreateReturnShipmentHandler(
    ShippingDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<CreateReturnShipmentCommand, ReturnShipmentDto>
{
    public async Task<Result<ReturnShipmentDto>> Handle(CreateReturnShipmentCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
            throw new ForbiddenException("Tenant context is required.");

        var count = await dbContext.ReturnShipments.CountAsync(cancellationToken);
        var datePrefix = DateTime.UtcNow.ToString("yyyyMM");
        var returnCode = $"RET-{datePrefix}-{(count + 1):D4}";

        string? carrierName = null;
        if (request.CarrierId.HasValue)
        {
            var carrier = await dbContext.Carriers.FirstOrDefaultAsync(c => c.Id == request.CarrierId.Value, cancellationToken);
            if (carrier != null) carrierName = carrier.Name;
        }

        var returnShipment = new ReturnShipment
        {
            TenantId = currentTenant.Id.Value,
            ReturnCode = returnCode,
            OriginalShipmentId = request.OriginalShipmentId,
            OrderId = request.OrderId,
            CustomerId = request.CustomerId,
            CustomerName = request.CustomerName.Trim(),
            CarrierId = request.CarrierId,
            CarrierName = carrierName,
            TrackingNumber = request.TrackingNumber?.Trim(),
            Reason = request.Reason.Trim(),
            Status = "Requested",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        dbContext.ReturnShipments.Add(returnShipment);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result<ReturnShipmentDto>.Success(new ReturnShipmentDto(
            returnShipment.Id,
            returnShipment.ReturnCode,
            returnShipment.OriginalShipmentId,
            returnShipment.OrderId,
            returnShipment.CustomerId,
            returnShipment.CustomerName,
            returnShipment.CarrierId,
            returnShipment.CarrierName,
            returnShipment.TrackingNumber,
            returnShipment.Reason,
            returnShipment.Status,
            returnShipment.InspectionNotes,
            returnShipment.InspectedByUserId,
            returnShipment.InspectedByName,
            returnShipment.InspectedAt,
            returnShipment.CreatedAt,
            returnShipment.UpdatedAt
        ));
    }
}

// 3. UpdateReturnStatusCommand
public record UpdateReturnStatusRequest(
    string Status, // Requested, InTransit, Received, Inspected, Rejected, Restocked
    string? InspectionNotes,
    Guid? InspectedByUserId,
    string? InspectedByName
);

public record UpdateReturnStatusCommand(
    Guid Id,
    string Status,
    string? InspectionNotes,
    Guid? InspectedByUserId,
    string? InspectedByName
) : ICommand<ReturnShipmentDto>;

public class UpdateReturnStatusHandler(
    ShippingDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<UpdateReturnStatusCommand, ReturnShipmentDto>
{
    public async Task<Result<ReturnShipmentDto>> Handle(UpdateReturnStatusCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
            throw new ForbiddenException("Tenant context is required.");

        var ret = await dbContext.ReturnShipments
            .FirstOrDefaultAsync(r => r.Id == request.Id, cancellationToken);

        if (ret == null)
            return Result.Failure<ReturnShipmentDto>(new Error("Shipping.ReturnNotFound", "İade kargo kaydı bulunamadı."));

        ret.Status = request.Status;
        ret.InspectionNotes = request.InspectionNotes ?? ret.InspectionNotes;
        ret.InspectedByUserId = request.InspectedByUserId ?? ret.InspectedByUserId;
        ret.InspectedByName = request.InspectedByName ?? ret.InspectedByName;
        ret.InspectedAt = DateTime.UtcNow;
        ret.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        return Result<ReturnShipmentDto>.Success(new ReturnShipmentDto(
            ret.Id,
            ret.ReturnCode,
            ret.OriginalShipmentId,
            ret.OrderId,
            ret.CustomerId,
            ret.CustomerName,
            ret.CarrierId,
            ret.CarrierName,
            ret.TrackingNumber,
            ret.Reason,
            ret.Status,
            ret.InspectionNotes,
            ret.InspectedByUserId,
            ret.InspectedByName,
            ret.InspectedAt,
            ret.CreatedAt,
            ret.UpdatedAt
        ));
    }
}

// 4. FastEndpoints Mapping
public class ReturnEndpoints : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/shipping/returns").WithTags("Shipping - Returns");

        group.MapGet("/", async (string? status, Guid? customerId, string? search, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new GetReturnShipmentsQuery(status, customerId, search), ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<List<ReturnShipmentDto>>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<List<ReturnShipmentDto>>.Fail(result.Error.Code, result.Error.Description));
        }).RequirePermission("Shipment.View");

        group.MapPost("/", async (CreateReturnShipmentCommand command, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(command, ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<ReturnShipmentDto>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<ReturnShipmentDto>.Fail(result.Error.Code, result.Error.Description));
        }).RequirePermission("Shipment.Manage");

        group.MapPost("/{id:guid}/status", async (Guid id, UpdateReturnStatusRequest req, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new UpdateReturnStatusCommand(id, req.Status, req.InspectionNotes, req.InspectedByUserId, req.InspectedByName), ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<ReturnShipmentDto>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<ReturnShipmentDto>.Fail(result.Error.Code, result.Error.Description));
        }).RequirePermission("Shipment.Dispatch");

        group.MapDelete("/{id:guid}", async (Guid id, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new DeleteReturnShipmentCommand(id), ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<bool>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<bool>.Fail(result.Error.Code, result.Error.Description));
        }).RequirePermission("Shipment.Manage");
    }
}

// 5. DeleteReturnShipmentCommand
public record DeleteReturnShipmentCommand(Guid Id) : ICommand<bool>;

public class DeleteReturnShipmentHandler(
    ShippingDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<DeleteReturnShipmentCommand, bool>
{
    public async Task<Result<bool>> Handle(DeleteReturnShipmentCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
            throw new ForbiddenException("Tenant context is required.");

        var ret = await dbContext.ReturnShipments
            .FirstOrDefaultAsync(s => s.Id == request.Id, cancellationToken);

        if (ret == null)
            return Result.Failure<bool>(new Error("Shipping.NotFound", "Silinecek iade kargo kaydı bulunamadı."));

        dbContext.ReturnShipments.Remove(ret);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result<bool>.Success(true);
    }
}

