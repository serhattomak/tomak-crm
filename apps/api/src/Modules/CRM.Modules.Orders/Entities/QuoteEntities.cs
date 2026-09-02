using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Customers.Entities;

namespace CRM.Modules.Orders.Entities;

[Table("quotes", Schema = "public")]
public class Quote : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public string QuoteNumber { get; set; } = string.Empty; // e.g. TEK-2026-0001
    public int RevisionNumber { get; set; } = 0; // 0 = R0, 1 = R1...
    public Guid? ParentQuoteId { get; set; }
    public string Title { get; set; } = string.Empty;
    public Guid? CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public Guid? DealId { get; set; }
    public Guid? AssignedUserId { get; set; }
    public string? AssignedUserName { get; set; }
    public string Status { get; set; } = "Draft"; // 'Draft', 'PendingApproval', 'Approved', 'Sent', 'Viewed', 'Accepted', 'Rejected', 'Expired', 'Revised'
    public string Currency { get; set; } = "TRY";
    public decimal ExchangeRate { get; set; } = 1.0000m;
    public decimal Subtotal { get; set; } = 0.00m;
    public string DiscountType { get; set; } = "Percentage"; // 'Percentage' or 'Amount'
    public decimal DiscountRate { get; set; } = 0.00m;
    public decimal DiscountAmount { get; set; } = 0.00m;
    public decimal TaxAmount { get; set; } = 0.00m;
    public decimal TotalAmount { get; set; } = 0.00m;
    public DateTime? ValidUntil { get; set; }
    public DateTime? SentAt { get; set; }
    public DateTime? AcceptedAt { get; set; }
    public DateTime? RejectedAt { get; set; }
    public string? RejectionReason { get; set; }
    public string? ApprovalNotes { get; set; }
    public Guid? ApprovedByUserId { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public string? TermsAndConditions { get; set; }
    public string? PaymentTerms { get; set; }
    public string? DeliveryTerms { get; set; }
    public string? BankDetails { get; set; }
    public string? Notes { get; set; }
    public string? PaymentMethod { get; set; }
    public int? PaymentDueDays { get; set; }
    public DateTime? PaymentDueDate { get; set; }
    public string PublicViewToken { get; set; } = Guid.NewGuid().ToString("N");
    public Guid? ConvertedOrderId { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Quote? ParentQuote { get; set; }
    public ICollection<Quote> Revisions { get; set; } = [];
    public ICollection<QuoteItem> Items { get; set; } = [];
    public ICollection<QuoteActivity> Activities { get; set; } = [];
    public Order? ConvertedOrder { get; set; }
}

[Table("quote_items", Schema = "public")]
public class QuoteItem : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Guid QuoteId { get; set; }
    public Guid? ProductId { get; set; }
    public Guid? VariantId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string? SKU { get; set; }
    public string? Description { get; set; }
    public decimal Quantity { get; set; } = 1.00m;
    public string Unit { get; set; } = "Adet";
    public decimal UnitPrice { get; set; } = 0.00m;
    public decimal UnitCost { get; set; } = 0.00m;
    public decimal DiscountRate { get; set; } = 0.00m;
    public decimal DiscountAmount { get; set; } = 0.00m;
    public decimal TaxRate { get; set; } = 20.00m;
    public decimal TaxAmount { get; set; } = 0.00m;
    public decimal TotalPrice { get; set; } = 0.00m;
    public bool IsOptional { get; set; } = false;
    public bool IsSelected { get; set; } = true;
    public int OrderIndex { get; set; } = 0;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Quote? Quote { get; set; }
}

[Table("quote_activities", Schema = "public")]
public class QuoteActivity : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Guid QuoteId { get; set; }
    public Guid? UserId { get; set; }
    public string? UserName { get; set; }
    public string ActivityType { get; set; } = "Created"; // 'Created', 'Updated', 'Sent', 'Viewed', 'Approved', 'RejectedApproval', 'RevisionCreated', 'Accepted', 'Rejected', 'ConvertedToOrder', 'NoteAdded'
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Quote? Quote { get; set; }
}

[Table("quote_templates", Schema = "public")]
public class QuoteTemplate : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? TermsAndConditions { get; set; }
    public string? PaymentTerms { get; set; }
    public string? DeliveryTerms { get; set; }
    public string? BankDetails { get; set; }
    public bool IsDefault { get; set; } = false;

    [MaxLength(200)]
    public string? Subject { get; set; }

    public string? HtmlBody { get; set; }

    public string VariablesJson { get; set; } = "[]";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Deserializes VariablesJson (jsonb array of strings) to a list.
    /// Returns empty list when JSON is null/empty or deserialization fails.
    /// </summary>
    public List<string> GetVariables()
    {
        if (string.IsNullOrWhiteSpace(VariablesJson))
        {
            return [];
        }

        try
        {
            return JsonSerializer.Deserialize<List<string>>(VariablesJson) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }

    /// <summary>
    /// Serializes the given variable names into VariablesJson.
    /// </summary>
    public void SetVariables(List<string> vars)
    {
        VariablesJson = JsonSerializer.Serialize(vars ?? []);
    }

    /// <summary>
    /// Overload for array-based callers — satisfies spec requiring string[] helpers.
    /// </summary>
    public string[] GetVariablesArray()
    {
        return [.. GetVariables()];
    }

    /// <summary>
    /// Overload for array-based callers (e.g., Create/Update commands with string[]?).
    /// Kept to avoid breaking existing callers — collection-expression callers should use
    /// <see cref="SetVariables(List{string})"/> with explicit List construction.
    /// </summary>
    public void SetVariables(string[] vars)
    {
        VariablesJson = JsonSerializer.Serialize(vars ?? Array.Empty<string>());
    }
}
