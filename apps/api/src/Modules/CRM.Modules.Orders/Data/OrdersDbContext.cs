using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Orders.Entities;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Orders.Data;

public class OrdersDbContext(
    DbContextOptions<OrdersDbContext> options,
    ICurrentTenant currentTenant) : DbContext(options)
{
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<OrderPayment> OrderPayments => Set<OrderPayment>();
    public DbSet<OrderActivity> OrderActivities => Set<OrderActivity>();
    public DbSet<Quote> Quotes => Set<Quote>();
    public DbSet<QuoteItem> QuoteItems => Set<QuoteItem>();
    public DbSet<QuoteActivity> QuoteActivities => Set<QuoteActivity>();
    public DbSet<QuoteTemplate> QuoteTemplates => Set<QuoteTemplate>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // 1. Order
        modelBuilder.Entity<Order>(entity =>
        {
            entity.ToTable("orders");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.OrderNumber).HasColumnName("order_number").HasMaxLength(50).IsRequired();
            entity.Property(e => e.CustomerId).HasColumnName("customer_id");
            entity.Property(e => e.CustomerName).HasColumnName("customer_name").HasMaxLength(255).IsRequired();
            entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(50).IsRequired();
            entity.Property(e => e.PaymentStatus).HasColumnName("payment_status").HasMaxLength(50).IsRequired();
            entity.Property(e => e.PaymentMethod).HasColumnName("payment_method").HasMaxLength(50).IsRequired();
            entity.Property(e => e.Currency).HasColumnName("currency").HasMaxLength(10).IsRequired();
            entity.Property(e => e.Subtotal).HasColumnName("subtotal").HasPrecision(15, 2);
            entity.Property(e => e.DiscountAmount).HasColumnName("discount_amount").HasPrecision(15, 2);
            entity.Property(e => e.TaxAmount).HasColumnName("tax_amount").HasPrecision(15, 2);
            entity.Property(e => e.ShippingFee).HasColumnName("shipping_fee").HasPrecision(15, 2);
            entity.Property(e => e.TotalAmount).HasColumnName("total_amount").HasPrecision(15, 2);
            entity.Property(e => e.PaidAmount).HasColumnName("paid_amount").HasPrecision(15, 2);
            entity.Property(e => e.ShippingAddress).HasColumnName("shipping_address");
            entity.Property(e => e.BillingAddress).HasColumnName("billing_address");
            entity.Property(e => e.TrackingNumber).HasColumnName("tracking_number").HasMaxLength(100);
            entity.Property(e => e.Carrier).HasColumnName("carrier").HasMaxLength(100);
            entity.Property(e => e.InvoiceNumber).HasColumnName("invoice_number").HasMaxLength(100);
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.OrderDate).HasColumnName("order_date");
            entity.Property(e => e.DueDate).HasColumnName("due_date");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasMany(e => e.Items)
                  .WithOne(i => i.Order)
                  .HasForeignKey(i => i.OrderId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.Payments)
                  .WithOne(p => p.Order)
                  .HasForeignKey(p => p.OrderId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.Activities)
                  .WithOne(a => a.Order)
                  .HasForeignKey(a => a.OrderId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        // 2. OrderItem
        modelBuilder.Entity<OrderItem>(entity =>
        {
            entity.ToTable("order_items");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.OrderId).HasColumnName("order_id").IsRequired();
            entity.Property(e => e.ProductId).HasColumnName("product_id");
            entity.Property(e => e.VariantId).HasColumnName("variant_id");
            entity.Property(e => e.ProductName).HasColumnName("product_name").HasMaxLength(255).IsRequired();
            entity.Property(e => e.SKU).HasColumnName("sku").HasMaxLength(100);
            entity.Property(e => e.Unit).HasColumnName("unit").HasMaxLength(50).IsRequired();
            entity.Property(e => e.UnitPrice).HasColumnName("unit_price").HasPrecision(15, 2);
            entity.Property(e => e.UnitCost).HasColumnName("unit_cost").HasPrecision(15, 2);
            entity.Property(e => e.Quantity).HasColumnName("quantity").HasPrecision(15, 2);
            entity.Property(e => e.TaxRate).HasColumnName("tax_rate").HasPrecision(5, 2);
            entity.Property(e => e.DiscountRate).HasColumnName("discount_rate").HasPrecision(5, 2);
            entity.Property(e => e.DiscountAmount).HasColumnName("discount_amount").HasPrecision(15, 2);
            entity.Property(e => e.TaxAmount).HasColumnName("tax_amount").HasPrecision(15, 2);
            entity.Property(e => e.TotalPrice).HasColumnName("total_price").HasPrecision(15, 2);
            entity.Property(e => e.OptionsOrNotes).HasColumnName("options_or_notes");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        // 3. OrderPayment
        modelBuilder.Entity<OrderPayment>(entity =>
        {
            entity.ToTable("order_payments");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.OrderId).HasColumnName("order_id").IsRequired();
            entity.Property(e => e.Amount).HasColumnName("amount").HasPrecision(15, 2);
            entity.Property(e => e.PaymentMethod).HasColumnName("payment_method").HasMaxLength(50).IsRequired();
            entity.Property(e => e.ReferenceNumber).HasColumnName("reference_number").HasMaxLength(100);
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.PaymentDate).HasColumnName("payment_date");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        // 4. OrderActivity
        modelBuilder.Entity<OrderActivity>(entity =>
        {
            entity.ToTable("order_activities");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.OrderId).HasColumnName("order_id").IsRequired();
            entity.Property(e => e.ActivityType).HasColumnName("activity_type").HasMaxLength(50).IsRequired();
            entity.Property(e => e.Title).HasColumnName("title").HasMaxLength(255).IsRequired();
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        // 5. Quote
        modelBuilder.Entity<Quote>(entity =>
        {
            entity.ToTable("quotes");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.QuoteNumber).HasColumnName("quote_number").HasMaxLength(100).IsRequired();
            entity.Property(e => e.RevisionNumber).HasColumnName("revision_number");
            entity.Property(e => e.ParentQuoteId).HasColumnName("parent_quote_id");
            entity.Property(e => e.Title).HasColumnName("title").HasMaxLength(255).IsRequired();
            entity.Property(e => e.CustomerId).HasColumnName("customer_id");
            entity.Property(e => e.CustomerName).HasColumnName("customer_name").HasMaxLength(255).IsRequired();
            entity.Property(e => e.DealId).HasColumnName("deal_id");
            entity.Property(e => e.AssignedUserId).HasColumnName("assigned_user_id");
            entity.Property(e => e.AssignedUserName).HasColumnName("assigned_user_name").HasMaxLength(255);
            entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(50).IsRequired();
            entity.Property(e => e.Currency).HasColumnName("currency").HasMaxLength(10).IsRequired();
            entity.Property(e => e.ExchangeRate).HasColumnName("exchange_rate").HasPrecision(18, 4);
            entity.Property(e => e.Subtotal).HasColumnName("subtotal").HasPrecision(18, 2);
            entity.Property(e => e.DiscountType).HasColumnName("discount_type").HasMaxLength(20).IsRequired();
            entity.Property(e => e.DiscountRate).HasColumnName("discount_rate").HasPrecision(5, 2);
            entity.Property(e => e.DiscountAmount).HasColumnName("discount_amount").HasPrecision(18, 2);
            entity.Property(e => e.TaxAmount).HasColumnName("tax_amount").HasPrecision(18, 2);
            entity.Property(e => e.TotalAmount).HasColumnName("total_amount").HasPrecision(18, 2);
            entity.Property(e => e.ValidUntil).HasColumnName("valid_until");
            entity.Property(e => e.SentAt).HasColumnName("sent_at");
            entity.Property(e => e.AcceptedAt).HasColumnName("accepted_at");
            entity.Property(e => e.RejectedAt).HasColumnName("rejected_at");
            entity.Property(e => e.RejectionReason).HasColumnName("rejection_reason");
            entity.Property(e => e.ApprovalNotes).HasColumnName("approval_notes");
            entity.Property(e => e.ApprovedByUserId).HasColumnName("approved_by_user_id");
            entity.Property(e => e.ApprovedAt).HasColumnName("approved_at");
            entity.Property(e => e.TermsAndConditions).HasColumnName("terms_and_conditions");
            entity.Property(e => e.PaymentTerms).HasColumnName("payment_terms");
            entity.Property(e => e.DeliveryTerms).HasColumnName("delivery_terms");
            entity.Property(e => e.BankDetails).HasColumnName("bank_details");
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.PaymentMethod).HasColumnName("payment_method").HasMaxLength(50);
            entity.Property(e => e.PaymentDueDays).HasColumnName("payment_due_days");
            entity.Property(e => e.PaymentDueDate).HasColumnName("payment_due_date").HasColumnType("date");
            entity.Property(e => e.PublicViewToken).HasColumnName("public_view_token").HasMaxLength(100).IsRequired();
            entity.Property(e => e.ConvertedOrderId).HasColumnName("converted_order_id");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasMany(e => e.Items)
                  .WithOne(i => i.Quote)
                  .HasForeignKey(i => i.QuoteId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.Activities)
                  .WithOne(a => a.Quote)
                  .HasForeignKey(a => a.QuoteId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.Revisions)
                  .WithOne(r => r.ParentQuote)
                  .HasForeignKey(r => r.ParentQuoteId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.ConvertedOrder)
                  .WithMany()
                  .HasForeignKey(e => e.ConvertedOrderId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        // 6. QuoteItem
        modelBuilder.Entity<QuoteItem>(entity =>
        {
            entity.ToTable("quote_items");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.QuoteId).HasColumnName("quote_id").IsRequired();
            entity.Property(e => e.ProductId).HasColumnName("product_id");
            entity.Property(e => e.VariantId).HasColumnName("variant_id");
            entity.Property(e => e.ProductName).HasColumnName("product_name").HasMaxLength(255).IsRequired();
            entity.Property(e => e.SKU).HasColumnName("sku").HasMaxLength(100);
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.Quantity).HasColumnName("quantity").HasPrecision(18, 2);
            entity.Property(e => e.Unit).HasColumnName("unit").HasMaxLength(50).IsRequired();
            entity.Property(e => e.UnitPrice).HasColumnName("unit_price").HasPrecision(18, 2);
            entity.Property(e => e.UnitCost).HasColumnName("unit_cost").HasPrecision(18, 2);
            entity.Property(e => e.DiscountRate).HasColumnName("discount_rate").HasPrecision(5, 2);
            entity.Property(e => e.DiscountAmount).HasColumnName("discount_amount").HasPrecision(18, 2);
            entity.Property(e => e.TaxRate).HasColumnName("tax_rate").HasPrecision(5, 2);
            entity.Property(e => e.TaxAmount).HasColumnName("tax_amount").HasPrecision(18, 2);
            entity.Property(e => e.TotalPrice).HasColumnName("total_price").HasPrecision(18, 2);
            entity.Property(e => e.IsOptional).HasColumnName("is_optional");
            entity.Property(e => e.IsSelected).HasColumnName("is_selected");
            entity.Property(e => e.OrderIndex).HasColumnName("order_index");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        // 7. QuoteActivity
        modelBuilder.Entity<QuoteActivity>(entity =>
        {
            entity.ToTable("quote_activities");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.QuoteId).HasColumnName("quote_id").IsRequired();
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.UserName).HasColumnName("user_name").HasMaxLength(255);
            entity.Property(e => e.ActivityType).HasColumnName("activity_type").HasMaxLength(50).IsRequired();
            entity.Property(e => e.Title).HasColumnName("title").HasMaxLength(255).IsRequired();
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.OldValue).HasColumnName("old_value");
            entity.Property(e => e.NewValue).HasColumnName("new_value");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        // 8. QuoteTemplate
        modelBuilder.Entity<QuoteTemplate>(entity =>
        {
            entity.ToTable("quote_templates");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(150).IsRequired();
            entity.Property(e => e.TermsAndConditions).HasColumnName("terms_and_conditions");
            entity.Property(e => e.PaymentTerms).HasColumnName("payment_terms");
            entity.Property(e => e.DeliveryTerms).HasColumnName("delivery_terms");
            entity.Property(e => e.BankDetails).HasColumnName("bank_details");
            entity.Property(e => e.IsDefault).HasColumnName("is_default");
            entity.Property(e => e.Subject).HasColumnName("subject").HasMaxLength(200);
            entity.Property(e => e.HtmlBody).HasColumnName("html_body");
            entity.Property(e => e.VariablesJson).HasColumnName("variables_json").HasColumnType("jsonb").HasDefaultValue("[]");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

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
