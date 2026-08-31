using System.ComponentModel.DataAnnotations.Schema;
using CRM.BuildingBlocks.Tenancy;

namespace CRM.Modules.Integrations.Entities;

[Table("carts", Schema = "public")]
public class Cart : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Guid? CustomerId { get; set; }
    public string? GuestToken { get; set; }
    public Guid? GuestTokenUuid { get; set; }
    public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddDays(7);
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<CartItem> Items { get; set; } = [];
}

[Table("cart_items", Schema = "public")]
public class CartItem : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Guid CartId { get; set; }
    public Guid ProductId { get; set; }
    public Guid? VariantId { get; set; }
    public int Quantity { get; set; } = 1;
    public decimal PriceSnapshot { get; set; }
    public decimal SnapshotPrice { get; set; }
    public string? SnapshotName { get; set; }
    public string Currency { get; set; } = "TRY";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Cart? Cart { get; set; }
}

[Table("payment_gateways", Schema = "public")]
public class PaymentGateway : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public string Provider { get; set; } = "iyzico"; // VARCHAR enum: iyzico, paytr, stripe
    public string? ApiKey { get; set; }
    public string? Secret { get; set; }
    public string? ApiKeyEncrypted { get; set; }
    public string? SecretEncrypted { get; set; }
    public string Config { get; set; } = "{}";
    public bool TestMode { get; set; } = true;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
