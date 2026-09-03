using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Invoicing.Entities;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Invoicing.Data;

public class InvoicingDbContext(
    DbContextOptions<InvoicingDbContext> options,
    ICurrentTenant currentTenant) : DbContext(options)
{
    public DbSet<CariAccount> CariAccounts => Set<CariAccount>();
    public DbSet<CariTransaction> CariTransactions => Set<CariTransaction>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<InvoiceItem> InvoiceItems => Set<InvoiceItem>();
    public DbSet<FinancialAccount> FinancialAccounts => Set<FinancialAccount>();
    public DbSet<FinancialTransaction> FinancialTransactions => Set<FinancialTransaction>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // 1. CariAccount
        modelBuilder.Entity<CariAccount>(entity =>
        {
            entity.ToTable("cari_accounts");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.CustomerId).HasColumnName("customer_id");
            entity.Property(e => e.Code).HasColumnName("code").HasMaxLength(50).IsRequired();
            entity.Property(e => e.Title).HasColumnName("title").HasMaxLength(255).IsRequired();
            entity.Property(e => e.Type).HasColumnName("type").HasMaxLength(50).IsRequired();
            entity.Property(e => e.TaxOffice).HasColumnName("tax_office").HasMaxLength(150);
            entity.Property(e => e.TaxNumber).HasColumnName("tax_number").HasMaxLength(50);
            entity.Property(e => e.Address).HasColumnName("address");
            entity.Property(e => e.City).HasColumnName("city").HasMaxLength(100);
            entity.Property(e => e.District).HasColumnName("district").HasMaxLength(100);
            entity.Property(e => e.Country).HasColumnName("country").HasMaxLength(100).IsRequired();
            entity.Property(e => e.PostalCode).HasColumnName("postal_code").HasMaxLength(20);
            entity.Property(e => e.Email).HasColumnName("email").HasMaxLength(255);
            entity.Property(e => e.Phone).HasColumnName("phone").HasMaxLength(50);
            entity.Property(e => e.Currency).HasColumnName("currency").HasMaxLength(10).IsRequired();
            entity.Property(e => e.TotalDebit).HasColumnName("total_debit").HasPrecision(18, 2);
            entity.Property(e => e.TotalCredit).HasColumnName("total_credit").HasPrecision(18, 2);
            entity.Property(e => e.Balance).HasColumnName("balance").HasPrecision(18, 2);
            entity.Property(e => e.CreditLimit).HasColumnName("credit_limit").HasPrecision(18, 2);
            entity.Property(e => e.PaymentTermDays).HasColumnName("payment_term_days");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        // 2. Invoice
        modelBuilder.Entity<Invoice>(entity =>
        {
            entity.ToTable("invoices");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.CariAccountId).HasColumnName("cari_account_id").IsRequired();
            entity.Property(e => e.OrderId).HasColumnName("order_id");
            entity.Property(e => e.InvoiceNumber).HasColumnName("invoice_number").HasMaxLength(50).IsRequired();
            entity.Property(e => e.Series).HasColumnName("series").HasMaxLength(10).IsRequired();
            entity.Property(e => e.Type).HasColumnName("type").HasMaxLength(50).IsRequired();
            entity.Property(e => e.Profile).HasColumnName("profile").HasMaxLength(50).IsRequired();
            entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(50).IsRequired();
            entity.Property(e => e.IssueDate).HasColumnName("issue_date");
            entity.Property(e => e.DueDate).HasColumnName("due_date");
            entity.Property(e => e.Currency).HasColumnName("currency").HasMaxLength(10).IsRequired();
            entity.Property(e => e.ExchangeRate).HasColumnName("exchange_rate").HasPrecision(18, 4);
            entity.Property(e => e.Subtotal).HasColumnName("subtotal").HasPrecision(18, 2);
            entity.Property(e => e.DiscountTotal).HasColumnName("discount_total").HasPrecision(18, 2);
            entity.Property(e => e.TaxTotal).HasColumnName("tax_total").HasPrecision(18, 2);
            entity.Property(e => e.WithholdingTotal).HasColumnName("withholding_total").HasPrecision(18, 2);
            entity.Property(e => e.GrandTotal).HasColumnName("grand_total").HasPrecision(18, 2);
            entity.Property(e => e.PaidAmount).HasColumnName("paid_amount").HasPrecision(18, 2);
            entity.Property(e => e.RemainingAmount).HasColumnName("remaining_amount").HasPrecision(18, 2);
            entity.Property(e => e.EInvoiceUuid).HasColumnName("e_invoice_uuid").HasMaxLength(100);
            entity.Property(e => e.EInvoiceStatus).HasColumnName("e_invoice_status").HasMaxLength(50);
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.PaymentTerms).HasColumnName("payment_terms");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(e => e.CariAccount)
                  .WithMany(c => c.Invoices)
                  .HasForeignKey(e => e.CariAccountId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasMany(e => e.Items)
                  .WithOne(i => i.Invoice)
                  .HasForeignKey(i => i.InvoiceId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        // 3. InvoiceItem
        modelBuilder.Entity<InvoiceItem>(entity =>
        {
            entity.ToTable("invoice_items");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.InvoiceId).HasColumnName("invoice_id").IsRequired();
            entity.Property(e => e.ProductId).HasColumnName("product_id");
            entity.Property(e => e.ProductName).HasColumnName("product_name").HasMaxLength(255).IsRequired();
            entity.Property(e => e.SKU).HasColumnName("sku").HasMaxLength(100);
            entity.Property(e => e.Unit).HasColumnName("unit").HasMaxLength(50).IsRequired();
            entity.Property(e => e.Quantity).HasColumnName("quantity").HasPrecision(18, 4);
            entity.Property(e => e.UnitPrice).HasColumnName("unit_price").HasPrecision(18, 4);
            entity.Property(e => e.DiscountRate).HasColumnName("discount_rate").HasPrecision(5, 2);
            entity.Property(e => e.DiscountAmount).HasColumnName("discount_amount").HasPrecision(18, 2);
            entity.Property(e => e.TaxRate).HasColumnName("tax_rate").HasPrecision(5, 2);
            entity.Property(e => e.TaxAmount).HasColumnName("tax_amount").HasPrecision(18, 2);
            entity.Property(e => e.WithholdingRate).HasColumnName("withholding_rate").HasMaxLength(20);
            entity.Property(e => e.WithholdingAmount).HasColumnName("withholding_amount").HasPrecision(18, 2);
            entity.Property(e => e.TotalPrice).HasColumnName("total_price").HasPrecision(18, 2);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        // 4. FinancialAccount
        modelBuilder.Entity<FinancialAccount>(entity =>
        {
            entity.ToTable("financial_accounts");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(150).IsRequired();
            entity.Property(e => e.Type).HasColumnName("type").HasMaxLength(50).IsRequired();
            entity.Property(e => e.BankName).HasColumnName("bank_name").HasMaxLength(150);
            entity.Property(e => e.BranchName).HasColumnName("branch_name").HasMaxLength(150);
            entity.Property(e => e.AccountNumber).HasColumnName("account_number").HasMaxLength(100);
            entity.Property(e => e.IBAN).HasColumnName("iban").HasMaxLength(50);
            entity.Property(e => e.Currency).HasColumnName("currency").HasMaxLength(10).IsRequired();
            entity.Property(e => e.Balance).HasColumnName("balance").HasPrecision(18, 2);
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        // 5. FinancialTransaction
        modelBuilder.Entity<FinancialTransaction>(entity =>
        {
            entity.ToTable("financial_transactions");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.FinancialAccountId).HasColumnName("financial_account_id").IsRequired();
            entity.Property(e => e.CariAccountId).HasColumnName("cari_account_id");
            entity.Property(e => e.InvoiceId).HasColumnName("invoice_id");
            entity.Property(e => e.Type).HasColumnName("type").HasMaxLength(50).IsRequired();
            entity.Property(e => e.Amount).HasColumnName("amount").HasPrecision(18, 2);
            entity.Property(e => e.Currency).HasColumnName("currency").HasMaxLength(10).IsRequired();
            entity.Property(e => e.ExchangeRate).HasColumnName("exchange_rate").HasPrecision(18, 4);
            entity.Property(e => e.DocumentNumber).HasColumnName("document_number").HasMaxLength(100);
            entity.Property(e => e.Description).HasColumnName("description").IsRequired();
            entity.Property(e => e.TransactionDate).HasColumnName("transaction_date");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");

            entity.HasOne(e => e.FinancialAccount)
                  .WithMany(a => a.Transactions)
                  .HasForeignKey(e => e.FinancialAccountId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        // 6. CariTransaction
        modelBuilder.Entity<CariTransaction>(entity =>
        {
            entity.ToTable("cari_transactions");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.CariAccountId).HasColumnName("cari_account_id").IsRequired();
            entity.Property(e => e.Type).HasColumnName("type").HasMaxLength(50).IsRequired();
            entity.Property(e => e.DocumentNumber).HasColumnName("document_number").HasMaxLength(100);
            entity.Property(e => e.Description).HasColumnName("description").IsRequired();
            entity.Property(e => e.TransactionDate).HasColumnName("transaction_date");
            entity.Property(e => e.DueDate).HasColumnName("due_date");
            entity.Property(e => e.Debit).HasColumnName("debit").HasPrecision(18, 2);
            entity.Property(e => e.Credit).HasColumnName("credit").HasPrecision(18, 2);
            entity.Property(e => e.BalanceAfter).HasColumnName("balance_after").HasPrecision(18, 2);
            entity.Property(e => e.Currency).HasColumnName("currency").HasMaxLength(10).IsRequired();
            entity.Property(e => e.SourceType).HasColumnName("source_type").HasMaxLength(50);
            entity.Property(e => e.SourceId).HasColumnName("source_id");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");

            entity.HasOne(e => e.CariAccount)
                  .WithMany(c => c.Transactions)
                  .HasForeignKey(e => e.CariAccountId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        if (currentTenant.Id.HasValue && currentTenant.Id.Value != Guid.Empty)
        {
            foreach (var entry in ChangeTracker.Entries<ITenantScopedEntity>())
            {
                if (entry.State == EntityState.Added && entry.Entity.TenantId == Guid.Empty)
                {
                    entry.Entity.TenantId = currentTenant.Id.Value;
                }
            }
        }

        return base.SaveChangesAsync(cancellationToken);
    }
}
