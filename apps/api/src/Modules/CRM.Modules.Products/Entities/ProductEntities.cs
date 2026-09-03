using System.ComponentModel.DataAnnotations.Schema;
using CRM.BuildingBlocks.Tenancy;

namespace CRM.Modules.Products.Entities;

[Table("product_categories", Schema = "public")]
public class ProductCategory : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Guid? ParentId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Icon { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ProductCategory? Parent { get; set; }
    public ICollection<ProductCategory> SubCategories { get; set; } = [];
    public ICollection<Product> Products { get; set; } = [];
}

[Table("products", Schema = "public")]
public class Product : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Guid? CategoryId { get; set; }
    public string Type { get; set; } = "Physical"; // "Physical", "Service", "Digital", "Subscription"
    public string Name { get; set; } = string.Empty;
    public string? SKU { get; set; }
    public string? Barcode { get; set; }
    public string? Brand { get; set; }
    public string Unit { get; set; } = "Adet"; // "Adet", "Saat", "Ay", "Yıl", "Kg", "Paket", "Kutu", "Litre"
    public decimal CostPrice { get; set; } = 0.00m;
    public decimal SellingPrice { get; set; } = 0.00m;
    public string Currency { get; set; } = "TRY";
    public decimal TaxRate { get; set; } = 20.00m; // %0, %1, %10, %20
    public decimal DiscountRate { get; set; } = 0.00m;
    public bool TrackInventory { get; set; } = true;
    public decimal CurrentStock { get; set; } = 0.00m;
    public decimal ReservedStock { get; set; } = 0.00m;
    public decimal MinStockLevel { get; set; } = 5.00m;
    public string Status { get; set; } = "Active"; // "Active", "Inactive", "Draft", "Discontinued"
    public string[]? Images { get; set; }
    public string[]? Tags { get; set; }
    public string? Attributes { get; set; } // JSONB stored as string
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ProductCategory? Category { get; set; }
    public ICollection<ProductVariant> Variants { get; set; } = [];
    public ICollection<ProductStockMovement> StockMovements { get; set; } = [];

    // Helper calculated properties
    public decimal AvailableStock => CurrentStock - ReservedStock;
    public bool IsLowStock => TrackInventory && Type == "Physical" && AvailableStock <= MinStockLevel;
    public decimal ProfitMargin => SellingPrice > 0 ? ((SellingPrice - CostPrice) / SellingPrice) * 100 : 0;
}

[Table("product_variants", Schema = "public")]
public class ProductVariant : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Guid ProductId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? SKU { get; set; }
    public string? Barcode { get; set; }
    public decimal AdditionalPrice { get; set; } = 0.00m;
    public decimal StockQuantity { get; set; } = 0.00m;
    public string? Attributes { get; set; } // JSONB
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Product? Product { get; set; }
    public ICollection<ProductStockMovement> StockMovements { get; set; } = [];
}

[Table("product_stock_movements", Schema = "public")]
public class ProductStockMovement : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Guid ProductId { get; set; }
    public Guid? VariantId { get; set; }
    public string MovementType { get; set; } = "In"; // "In", "Out", "Adjustment", "Return"
    public decimal Quantity { get; set; }
    public decimal PreviousStock { get; set; } = 0.00m;
    public decimal NewStock { get; set; } = 0.00m;
    public decimal? UnitCost { get; set; }
    public string? ReferenceNumber { get; set; }
    public string? Reason { get; set; }
    public string? Notes { get; set; }
    public Guid? PerformedByUserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Product? Product { get; set; }
    public ProductVariant? Variant { get; set; }
}

[Table("warehouses", Schema = "public")]
public class Warehouse : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = "Central"; // "Central", "Branch", "Transit", "Defective", "Consignment"
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? ManagerName { get; set; }
    public string? Phone { get; set; }
    public bool IsDefault { get; set; } = false;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<WarehouseStock> Stocks { get; set; } = [];
}

[Table("warehouse_stocks", Schema = "public")]
public class WarehouseStock : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Guid WarehouseId { get; set; }
    public Guid ProductId { get; set; }
    public Guid? VariantId { get; set; }
    public decimal Quantity { get; set; } = 0.0000m;
    public decimal ReservedQuantity { get; set; } = 0.0000m;
    public string? BinLocation { get; set; } // Raf / Göz
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Warehouse? Warehouse { get; set; }
    public Product? Product { get; set; }
    public ProductVariant? Variant { get; set; }

    public decimal AvailableQuantity => Quantity - ReservedQuantity;
}

[Table("stock_transfers", Schema = "public")]
public class StockTransfer : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public string TransferNumber { get; set; } = string.Empty;
    public Guid SourceWarehouseId { get; set; }
    public Guid TargetWarehouseId { get; set; }
    public string Status { get; set; } = "Draft"; // "Draft", "Dispatched", "Received", "Cancelled"
    public DateTime TransferDate { get; set; } = DateTime.UtcNow;
    public DateTime? DispatchDate { get; set; }
    public DateTime? ReceivedDate { get; set; }
    public string? Notes { get; set; }
    public Guid? CreatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Warehouse? SourceWarehouse { get; set; }
    public Warehouse? TargetWarehouse { get; set; }
    public ICollection<StockTransferItem> Items { get; set; } = [];
}

[Table("stock_transfer_items", Schema = "public")]
public class StockTransferItem : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Guid TransferId { get; set; }
    public Guid ProductId { get; set; }
    public Guid? VariantId { get; set; }
    public decimal Quantity { get; set; } = 0.0000m;
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public StockTransfer? Transfer { get; set; }
    public Product? Product { get; set; }
    public ProductVariant? Variant { get; set; }
}

[Table("stock_counts", Schema = "public")]
public class StockCount : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public string CountNumber { get; set; } = string.Empty;
    public Guid WarehouseId { get; set; }
    public string Status { get; set; } = "Draft"; // "Draft", "InProgress", "Completed", "Cancelled"
    public DateTime CountDate { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedDate { get; set; }
    public string? Notes { get; set; }
    public Guid? CountedByUserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Warehouse? Warehouse { get; set; }
    public ICollection<StockCountItem> Items { get; set; } = [];
}

[Table("stock_count_items", Schema = "public")]
public class StockCountItem : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Guid CountId { get; set; }
    public Guid ProductId { get; set; }
    public Guid? VariantId { get; set; }
    public decimal SystemQuantity { get; set; } = 0.0000m;
    public decimal CountedQuantity { get; set; } = 0.0000m;
    public decimal Difference { get; set; } = 0.0000m;
    public bool IsReconciled { get; set; } = false;
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public StockCount? Count { get; set; }
    public Product? Product { get; set; }
    public ProductVariant? Variant { get; set; }
}
