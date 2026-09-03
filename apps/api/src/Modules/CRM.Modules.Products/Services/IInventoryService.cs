using CRM.BuildingBlocks.CQRS;

namespace CRM.Modules.Products.Services;

public interface IInventoryService
{
    Task<Result> DispatchTransferAsync(Guid transferId, Guid? userId, CancellationToken ct = default);
    Task<Result> ReceiveTransferAsync(Guid transferId, Guid? userId, CancellationToken ct = default);
    Task<Result> CancelTransferAsync(Guid transferId, Guid? userId, CancellationToken ct = default);
    Task<Result> ReconcileStockCountAsync(Guid countId, Guid? userId, CancellationToken ct = default);
}
