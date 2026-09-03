using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Products.Entities;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Products.Data;

public class ProductsDbContext(
    DbContextOptions<ProductsDbContext> options,
    ICurrentTenant currentTenant) : DbContext(options)
{
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductCategory> ProductCategories => Set<ProductCategory>();
    public DbSet<ProductVariant> ProductVariants => Set<ProductVariant>();
    public DbSet<ProductStockMovement> ProductStockMovements => Set<ProductStockMovement>();
    public DbSet<Warehouse> Warehouses => Set<Warehouse>();
    public DbSet<WarehouseStock> WarehouseStocks => Set<WarehouseStock>();
    public DbSet<StockTransfer> StockTransfers => Set<StockTransfer>();
    public DbSet<StockTransferItem> StockTransferItems => Set<StockTransferItem>();
    public DbSet<StockCount> StockCounts => Set<StockCount>();
    public DbSet<StockCountItem> StockCountItems => Set<StockCountItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // 1. ProductCategory
        modelBuilder.Entity<ProductCategory>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.ParentId).HasColumnName("parent_id");
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(150).IsRequired();
            entity.Property(e => e.Slug).HasColumnName("slug").HasMaxLength(150).IsRequired();
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.Icon).HasColumnName("icon").HasMaxLength(100);
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(e => e.Parent)
                  .WithMany(p => p.SubCategories)
                  .HasForeignKey(e => e.ParentId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        // 2. Product
        modelBuilder.Entity<Product>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.CategoryId).HasColumnName("category_id");
            entity.Property(e => e.Type).HasColumnName("type").HasMaxLength(50).IsRequired();
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(255).IsRequired();
            entity.Property(e => e.SKU).HasColumnName("sku").HasMaxLength(100);
            entity.Property(e => e.Barcode).HasColumnName("barcode").HasMaxLength(100);
            entity.Property(e => e.Brand).HasColumnName("brand").HasMaxLength(150);
            entity.Property(e => e.Unit).HasColumnName("unit").HasMaxLength(50).IsRequired();
            entity.Property(e => e.CostPrice).HasColumnName("cost_price").HasPrecision(18, 2);
            entity.Property(e => e.SellingPrice).HasColumnName("selling_price").HasPrecision(18, 2);
            entity.Property(e => e.Currency).HasColumnName("currency").HasMaxLength(10).IsRequired();
            entity.Property(e => e.TaxRate).HasColumnName("tax_rate").HasPrecision(5, 2);
            entity.Property(e => e.DiscountRate).HasColumnName("discount_rate").HasPrecision(5, 2);
            entity.Property(e => e.TrackInventory).HasColumnName("track_inventory");
            entity.Property(e => e.CurrentStock).HasColumnName("current_stock").HasPrecision(18, 2);
            entity.Property(e => e.ReservedStock).HasColumnName("reserved_stock").HasPrecision(18, 2);
            entity.Property(e => e.MinStockLevel).HasColumnName("min_stock_level").HasPrecision(18, 2);
            entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(50).IsRequired();
            entity.Property(e => e.Images).HasColumnName("images");
            entity.Property(e => e.Tags).HasColumnName("tags");
            entity.Property(e => e.Attributes).HasColumnName("attributes").HasColumnType("jsonb");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(e => e.Category)
                  .WithMany(c => c.Products)
                  .HasForeignKey(e => e.CategoryId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasMany(e => e.Variants)
                  .WithOne(v => v.Product)
                  .HasForeignKey(v => v.ProductId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.StockMovements)
                  .WithOne(s => s.Product)
                  .HasForeignKey(s => s.ProductId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        // 3. ProductVariant
        modelBuilder.Entity<ProductVariant>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.ProductId).HasColumnName("product_id").IsRequired();
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(150).IsRequired();
            entity.Property(e => e.SKU).HasColumnName("sku").HasMaxLength(100);
            entity.Property(e => e.Barcode).HasColumnName("barcode").HasMaxLength(100);
            entity.Property(e => e.AdditionalPrice).HasColumnName("additional_price").HasPrecision(18, 2);
            entity.Property(e => e.StockQuantity).HasColumnName("stock_quantity").HasPrecision(18, 2);
            entity.Property(e => e.Attributes).HasColumnName("attributes").HasColumnType("jsonb");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        // 4. ProductStockMovement
        modelBuilder.Entity<ProductStockMovement>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.ProductId).HasColumnName("product_id").IsRequired();
            entity.Property(e => e.VariantId).HasColumnName("variant_id");
            entity.Property(e => e.MovementType).HasColumnName("movement_type").HasMaxLength(50).IsRequired();
            entity.Property(e => e.Quantity).HasColumnName("quantity").HasPrecision(18, 2);
            entity.Property(e => e.PreviousStock).HasColumnName("previous_stock").HasPrecision(18, 2);
            entity.Property(e => e.NewStock).HasColumnName("new_stock").HasPrecision(18, 2);
            entity.Property(e => e.UnitCost).HasColumnName("unit_cost").HasPrecision(18, 2);
            entity.Property(e => e.ReferenceNumber).HasColumnName("reference_number").HasMaxLength(100);
            entity.Property(e => e.Reason).HasColumnName("reason").HasMaxLength(255);
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.PerformedByUserId).HasColumnName("performed_by_user_id");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");

            entity.HasOne(e => e.Variant)
                  .WithMany(v => v.StockMovements)
                  .HasForeignKey(e => e.VariantId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        // 5. Warehouse
        modelBuilder.Entity<Warehouse>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.Code).HasColumnName("code").HasMaxLength(50).IsRequired();
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(255).IsRequired();
            entity.Property(e => e.Type).HasColumnName("type").HasMaxLength(50).IsRequired();
            entity.Property(e => e.Address).HasColumnName("address");
            entity.Property(e => e.City).HasColumnName("city").HasMaxLength(100);
            entity.Property(e => e.ManagerName).HasColumnName("manager_name").HasMaxLength(150);
            entity.Property(e => e.Phone).HasColumnName("phone").HasMaxLength(50);
            entity.Property(e => e.IsDefault).HasColumnName("is_default");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        // 6. WarehouseStock
        modelBuilder.Entity<WarehouseStock>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.WarehouseId).HasColumnName("warehouse_id").IsRequired();
            entity.Property(e => e.ProductId).HasColumnName("product_id").IsRequired();
            entity.Property(e => e.VariantId).HasColumnName("variant_id");
            entity.Property(e => e.Quantity).HasColumnName("quantity").HasPrecision(18, 4);
            entity.Property(e => e.ReservedQuantity).HasColumnName("reserved_quantity").HasPrecision(18, 4);
            entity.Property(e => e.BinLocation).HasColumnName("bin_location").HasMaxLength(100);
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(e => e.Warehouse)
                  .WithMany(w => w.Stocks)
                  .HasForeignKey(e => e.WarehouseId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Product)
                  .WithMany()
                  .HasForeignKey(e => e.ProductId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Variant)
                  .WithMany()
                  .HasForeignKey(e => e.VariantId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        // 7. StockTransfer
        modelBuilder.Entity<StockTransfer>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.TransferNumber).HasColumnName("transfer_number").HasMaxLength(50).IsRequired();
            entity.Property(e => e.SourceWarehouseId).HasColumnName("source_warehouse_id").IsRequired();
            entity.Property(e => e.TargetWarehouseId).HasColumnName("target_warehouse_id").IsRequired();
            entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(50).IsRequired();
            entity.Property(e => e.TransferDate).HasColumnName("transfer_date");
            entity.Property(e => e.DispatchDate).HasColumnName("dispatch_date");
            entity.Property(e => e.ReceivedDate).HasColumnName("received_date");
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.CreatedByUserId).HasColumnName("created_by_user_id");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(e => e.SourceWarehouse)
                  .WithMany()
                  .HasForeignKey(e => e.SourceWarehouseId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.TargetWarehouse)
                  .WithMany()
                  .HasForeignKey(e => e.TargetWarehouseId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        // 8. StockTransferItem
        modelBuilder.Entity<StockTransferItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.TransferId).HasColumnName("transfer_id").IsRequired();
            entity.Property(e => e.ProductId).HasColumnName("product_id").IsRequired();
            entity.Property(e => e.VariantId).HasColumnName("variant_id");
            entity.Property(e => e.Quantity).HasColumnName("quantity").HasPrecision(18, 4);
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");

            entity.HasOne(e => e.Transfer)
                  .WithMany(t => t.Items)
                  .HasForeignKey(e => e.TransferId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Product)
                  .WithMany()
                  .HasForeignKey(e => e.ProductId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        // 9. StockCount
        modelBuilder.Entity<StockCount>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.CountNumber).HasColumnName("count_number").HasMaxLength(50).IsRequired();
            entity.Property(e => e.WarehouseId).HasColumnName("warehouse_id").IsRequired();
            entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(50).IsRequired();
            entity.Property(e => e.CountDate).HasColumnName("count_date");
            entity.Property(e => e.CompletedDate).HasColumnName("completed_date");
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.CountedByUserId).HasColumnName("counted_by_user_id");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(e => e.Warehouse)
                  .WithMany()
                  .HasForeignKey(e => e.WarehouseId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        // 10. StockCountItem
        modelBuilder.Entity<StockCountItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.CountId).HasColumnName("count_id").IsRequired();
            entity.Property(e => e.ProductId).HasColumnName("product_id").IsRequired();
            entity.Property(e => e.VariantId).HasColumnName("variant_id");
            entity.Property(e => e.SystemQuantity).HasColumnName("system_quantity").HasPrecision(18, 4);
            entity.Property(e => e.CountedQuantity).HasColumnName("counted_quantity").HasPrecision(18, 4);
            entity.Property(e => e.Difference).HasColumnName("difference").HasPrecision(18, 4);
            entity.Property(e => e.IsReconciled).HasColumnName("is_reconciled");
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");

            entity.HasOne(e => e.Count)
                  .WithMany(c => c.Items)
                  .HasForeignKey(e => e.CountId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Product)
                  .WithMany()
                  .HasForeignKey(e => e.ProductId)
                  .OnDelete(DeleteBehavior.Restrict);

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
