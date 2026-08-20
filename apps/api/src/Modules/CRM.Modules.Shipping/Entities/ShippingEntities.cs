using CRM.BuildingBlocks.Tenancy;

namespace CRM.Modules.Shipping.Entities;

public class ShippingCarrier : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public string Code { get; set; } = string.Empty; // YURTICI, ARAS, MNG, SURAT, PTT, HEPSIJET, TRENDYOL_EXPRESS, DHL, COURIER
    public string Name { get; set; } = string.Empty;
    public string? TrackingUrlTemplate { get; set; }
    public string? CustomerAccountNumber { get; set; }
    public string? BranchCode { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsDefault { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public List<Shipment> Shipments { get; set; } = [];
}

public class Shipment : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public string ShipmentNumber { get; set; } = string.Empty;
    public Guid? OrderId { get; set; }
    public string? OrderNumber { get; set; }
    public Guid? CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public Guid? CarrierId { get; set; }
    public string? CarrierName { get; set; }
    public string? TrackingNumber { get; set; }
    public string? TrackingUrl { get; set; }
    public string Type { get; set; } = "Outbound"; // Outbound, Return
    public string Status { get; set; } = "Preparing"; // Preparing, Dispatched, InTransit, Delivered, FailedDelivery, Cancelled
    public int PackageCount { get; set; } = 1;
    public decimal TotalWeightKg { get; set; } = 0.00m;
    public decimal TotalDesi { get; set; } = 0.00m;
    public decimal ShippingCost { get; set; } = 0.00m;
    public string RecipientName { get; set; } = string.Empty;
    public string? RecipientPhone { get; set; }
    public string RecipientAddress { get; set; } = string.Empty;
    public string? RecipientCity { get; set; }
    public string? RecipientDistrict { get; set; }
    public string? Notes { get; set; }
    public Guid? PreparedByUserId { get; set; }
    public string? PreparedByName { get; set; }
    public DateTime? DispatchedAt { get; set; }
    public DateTime? DeliveredAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ShippingCarrier? Carrier { get; set; }
    public List<ShipmentItem> Items { get; set; } = [];
    public List<ShipmentStatusHistory> StatusHistories { get; set; } = [];
}

public class ShipmentItem : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Guid ShipmentId { get; set; }
    public Guid? ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string? Sku { get; set; }
    public int Quantity { get; set; } = 1;
    public string Unit { get; set; } = "Adet";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Shipment? Shipment { get; set; }
}

public class ShipmentStatusHistory : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Guid ShipmentId { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Location { get; set; }
    public string? Description { get; set; }
    public Guid? ChangedByUserId { get; set; }
    public string? ChangedByName { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Shipment? Shipment { get; set; }
}

public class ReturnShipment : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public string ReturnCode { get; set; } = string.Empty;
    public Guid? OriginalShipmentId { get; set; }
    public Guid? OrderId { get; set; }
    public Guid? CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public Guid? CarrierId { get; set; }
    public string? CarrierName { get; set; }
    public string? TrackingNumber { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string Status { get; set; } = "Requested"; // Requested, InTransit, Received, Inspected, Rejected, Restocked
    public string? InspectionNotes { get; set; }
    public Guid? InspectedByUserId { get; set; }
    public string? InspectedByName { get; set; }
    public DateTime? InspectedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
