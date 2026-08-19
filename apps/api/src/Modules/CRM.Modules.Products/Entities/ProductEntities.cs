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
