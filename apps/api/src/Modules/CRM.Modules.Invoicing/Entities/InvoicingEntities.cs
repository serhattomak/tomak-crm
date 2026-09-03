using System.ComponentModel.DataAnnotations.Schema;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Customers.Entities;
using CRM.Modules.Orders.Entities;
using CRM.Modules.Products.Entities;

namespace CRM.Modules.Invoicing.Entities;

[Table("cari_accounts", Schema = "public")]
public class CariAccount : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Guid? CustomerId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Type { get; set; } = "Customer"; // Customer, Supplier, Both, Personnel
    public string? TaxOffice { get; set; }
    public string? TaxNumber { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? District { get; set; }
    public string Country { get; set; } = "Türkiye";
    public string? PostalCode { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string Currency { get; set; } = "TRY";
    public decimal TotalDebit { get; set; } = 0.00m;
    public decimal TotalCredit { get; set; } = 0.00m;
    public decimal Balance { get; set; } = 0.00m;
    public decimal CreditLimit { get; set; } = 0.00m;
    public int PaymentTermDays { get; set; } = 30;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Customer? Customer { get; set; }
    public ICollection<Invoice> Invoices { get; set; } = [];
    public ICollection<CariTransaction> Transactions { get; set; } = [];
}

[Table("invoices", Schema = "public")]
public class Invoice : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Guid CariAccountId { get; set; }
    public Guid? OrderId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public string Series { get; set; } = "A";
    public string Type { get; set; } = "Sales"; // Sales, Purchase, SalesReturn, PurchaseReturn
    public string Profile { get; set; } = "TICARIFATURA"; // TICARIFATURA, TEMELFATURA, EARSIVFATURA, IHRACAT
    public string Status { get; set; } = "Draft"; // Draft, Issued, Sent, Approved, Cancelled, Paid, PartiallyPaid
    public DateTime IssueDate { get; set; } = DateTime.UtcNow;
    public DateTime? DueDate { get; set; }
    public string Currency { get; set; } = "TRY";
    public decimal ExchangeRate { get; set; } = 1.0000m;
    public decimal Subtotal { get; set; } = 0.00m;
    public decimal DiscountTotal { get; set; } = 0.00m;
    public decimal TaxTotal { get; set; } = 0.00m;
    public decimal WithholdingTotal { get; set; } = 0.00m;
    public decimal GrandTotal { get; set; } = 0.00m;
    public decimal PaidAmount { get; set; } = 0.00m;
    public decimal RemainingAmount { get; set; } = 0.00m;
    public string? EInvoiceUuid { get; set; }
    public string? EInvoiceStatus { get; set; }
    public string? Notes { get; set; }
    public string? PaymentTerms { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public CariAccount? CariAccount { get; set; }
    public Order? Order { get; set; }
    public ICollection<InvoiceItem> Items { get; set; } = [];
}

[Table("invoice_items", Schema = "public")]
public class InvoiceItem : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Guid InvoiceId { get; set; }
    public Guid? ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string? SKU { get; set; }
    public string Unit { get; set; } = "Adet";
    public decimal Quantity { get; set; } = 1.0000m;
    public decimal UnitPrice { get; set; } = 0.0000m;
    public decimal DiscountRate { get; set; } = 0.00m;
    public decimal DiscountAmount { get; set; } = 0.00m;
    public decimal TaxRate { get; set; } = 20.00m;
    public decimal TaxAmount { get; set; } = 0.00m;
    public string? WithholdingRate { get; set; }
    public decimal WithholdingAmount { get; set; } = 0.00m;
    public decimal TotalPrice { get; set; } = 0.00m;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Invoice? Invoice { get; set; }
    public Product? Product { get; set; }
}

[Table("financial_accounts", Schema = "public")]
public class FinancialAccount : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = "Bank"; // Cash, Bank, Pos
    public string? BankName { get; set; }
    public string? BranchName { get; set; }
    public string? AccountNumber { get; set; }
    public string? IBAN { get; set; }
    public string Currency { get; set; } = "TRY";
    public decimal Balance { get; set; } = 0.00m;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<FinancialTransaction> Transactions { get; set; } = [];
}

[Table("financial_transactions", Schema = "public")]
public class FinancialTransaction : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Guid FinancialAccountId { get; set; }
    public Guid? CariAccountId { get; set; }
    public Guid? InvoiceId { get; set; }
    public string Type { get; set; } = "Collection"; // Collection, Payment, Transfer, Expense
    public decimal Amount { get; set; } = 0.00m;
    public string Currency { get; set; } = "TRY";
    public decimal ExchangeRate { get; set; } = 1.0000m;
    public string? DocumentNumber { get; set; }
    public string Description { get; set; } = string.Empty;
    public DateTime TransactionDate { get; set; } = DateTime.UtcNow;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public FinancialAccount? FinancialAccount { get; set; }
    public CariAccount? CariAccount { get; set; }
    public Invoice? Invoice { get; set; }
}

[Table("cari_transactions", Schema = "public")]
public class CariTransaction : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Guid CariAccountId { get; set; }
    public string Type { get; set; } = "SalesInvoice"; // SalesInvoice, PurchaseInvoice, Payment, Collection, OpeningBalance, Cancellation
    public string? DocumentNumber { get; set; }
    public string Description { get; set; } = string.Empty;
    public DateTime TransactionDate { get; set; } = DateTime.UtcNow;
    public DateTime? DueDate { get; set; }
    public decimal Debit { get; set; } = 0.00m;  // Borç
    public decimal Credit { get; set; } = 0.00m; // Alacak
    public decimal BalanceAfter { get; set; } = 0.00m;
    public string Currency { get; set; } = "TRY";
    public string? SourceType { get; set; } // Invoice, FinancialTransaction
    public Guid? SourceId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public CariAccount? CariAccount { get; set; }
}
