using System.ComponentModel.DataAnnotations.Schema;
using CRM.BuildingBlocks.Tenancy;

namespace CRM.Modules.Orders.Entities;

[Table("orders", Schema = "public")]
public class Order : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public Guid? CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string Status { get; set; } = "Draft"; // Draft, PendingApproval, Confirmed, Processing, Shipped, Delivered, Cancelled, Refunded
    public string PaymentStatus { get; set; } = "Unpaid"; // Unpaid, PartiallyPaid, Paid, Refunded
    public string PaymentMethod { get; set; } = "BankTransfer"; // BankTransfer, CreditCard, Cash, Check, OpenAccount
    public string Currency { get; set; } = "TRY";
    public decimal Subtotal { get; set; } = 0.00m;
    public decimal DiscountAmount { get; set; } = 0.00m;
    public decimal TaxAmount { get; set; } = 0.00m;
    public decimal ShippingFee { get; set; } = 0.00m;
    public decimal TotalAmount { get; set; } = 0.00m;
    public decimal PaidAmount { get; set; } = 0.00m;
    public string? ShippingAddress { get; set; }
    public string? BillingAddress { get; set; }
    public string? TrackingNumber { get; set; }
    public string? Carrier { get; set; }
    public string? InvoiceNumber { get; set; }
    public string? Notes { get; set; }
    public string? ExternalId { get; set; }
    public string? ExternalSource { get; set; }
    public string Source { get; set; } = "Manual"; // VARCHAR enum Manual | ECommerce
    public Guid? PaymentGatewayId { get; set; }
    public Guid? EcommerceCustomerId { get; set; }
    public DateTime OrderDate { get; set; } = DateTime.UtcNow;
    public DateTime? DueDate { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<OrderItem> Items { get; set; } = [];
    public ICollection<OrderPayment> Payments { get; set; } = [];
    public ICollection<OrderActivity> Activities { get; set; } = [];
}

[Table("order_items", Schema = "public")]
public class OrderItem : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Guid OrderId { get; set; }
    public Guid? ProductId { get; set; }
    public Guid? VariantId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string? SKU { get; set; }
    public string Unit { get; set; } = "Adet";
    public decimal UnitPrice { get; set; } = 0.00m;
    public decimal UnitCost { get; set; } = 0.00m;
    public decimal Quantity { get; set; } = 1.00m;
    public decimal TaxRate { get; set; } = 20.00m;
    public decimal DiscountRate { get; set; } = 0.00m;
    public decimal DiscountAmount { get; set; } = 0.00m;
    public decimal TaxAmount { get; set; } = 0.00m;
    public decimal TotalPrice { get; set; } = 0.00m;
    public string? OptionsOrNotes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Order? Order { get; set; }
}

[Table("order_payments", Schema = "public")]
public class OrderPayment : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Guid OrderId { get; set; }
    public decimal Amount { get; set; } = 0.00m;
    public string PaymentMethod { get; set; } = "BankTransfer";
    public string? ReferenceNumber { get; set; }
    public string? Notes { get; set; }
    public DateTime PaymentDate { get; set; } = DateTime.UtcNow;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Order? Order { get; set; }
}

[Table("order_activities", Schema = "public")]
public class OrderActivity : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Guid OrderId { get; set; }
    public string ActivityType { get; set; } = "StatusChange"; // StatusChange, PaymentAdded, ItemUpdated, Created
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Order? Order { get; set; }
}
