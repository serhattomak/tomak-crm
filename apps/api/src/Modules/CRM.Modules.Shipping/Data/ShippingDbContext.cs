using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Shipping.Entities;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Shipping.Data;

public class ShippingDbContext(
    DbContextOptions<ShippingDbContext> options,
    ICurrentTenant currentTenant) : DbContext(options)
{
    public DbSet<ShippingCarrier> Carriers => Set<ShippingCarrier>();
    public DbSet<Shipment> Shipments => Set<Shipment>();
    public DbSet<ShipmentItem> ShipmentItems => Set<ShipmentItem>();
    public DbSet<ShipmentStatusHistory> ShipmentStatusHistories => Set<ShipmentStatusHistory>();
    public DbSet<ReturnShipment> ReturnShipments => Set<ReturnShipment>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // 1. ShippingCarrier
        modelBuilder.Entity<ShippingCarrier>(b =>
        {
            b.ToTable("shipping_carriers");
            b.HasKey(x => x.Id);
            b.Property(x => x.Id).HasColumnName("id");
            b.Property(x => x.TenantId).HasColumnName("tenant_id").IsRequired();
            b.Property(x => x.Code).HasColumnName("code").HasMaxLength(50).IsRequired();
            b.Property(x => x.Name).HasColumnName("name").HasMaxLength(150).IsRequired();
            b.Property(x => x.TrackingUrlTemplate).HasColumnName("tracking_url_template").HasMaxLength(500);
            b.Property(x => x.CustomerAccountNumber).HasColumnName("customer_account_number").HasMaxLength(100);
            b.Property(x => x.BranchCode).HasColumnName("branch_code").HasMaxLength(100);
            b.Property(x => x.IsActive).HasColumnName("is_active").IsRequired();
            b.Property(x => x.IsDefault).HasColumnName("is_default").IsRequired();
            b.Property(x => x.CreatedAt).HasColumnName("created_at").IsRequired();
            b.Property(x => x.UpdatedAt).HasColumnName("updated_at").IsRequired();

            b.HasQueryFilter(x => x.TenantId == currentTenant.Id);
        });

        // 2. Shipment
        modelBuilder.Entity<Shipment>(b =>
        {
            b.ToTable("shipments");
            b.HasKey(x => x.Id);
            b.Property(x => x.Id).HasColumnName("id");
            b.Property(x => x.TenantId).HasColumnName("tenant_id").IsRequired();
            b.Property(x => x.ShipmentNumber).HasColumnName("shipment_number").HasMaxLength(50).IsRequired();
            b.Property(x => x.OrderId).HasColumnName("order_id");
            b.Property(x => x.OrderNumber).HasColumnName("order_number").HasMaxLength(100);
            b.Property(x => x.CustomerId).HasColumnName("customer_id");
            b.Property(x => x.CustomerName).HasColumnName("customer_name").HasMaxLength(255).IsRequired();
            b.Property(x => x.CarrierId).HasColumnName("carrier_id");
            b.Property(x => x.CarrierName).HasColumnName("carrier_name").HasMaxLength(150);
            b.Property(x => x.TrackingNumber).HasColumnName("tracking_number").HasMaxLength(100);
            b.Property(x => x.TrackingUrl).HasColumnName("tracking_url").HasMaxLength(500);
            b.Property(x => x.Type).HasColumnName("type").HasMaxLength(50).IsRequired();
            b.Property(x => x.Status).HasColumnName("status").HasMaxLength(50).IsRequired();
            b.Property(x => x.PackageCount).HasColumnName("package_count").IsRequired();
            b.Property(x => x.TotalWeightKg).HasColumnName("total_weight_kg").HasColumnType("numeric(10,2)").IsRequired();
            b.Property(x => x.TotalDesi).HasColumnName("total_desi").HasColumnType("numeric(10,2)").IsRequired();
            b.Property(x => x.ShippingCost).HasColumnName("shipping_cost").HasColumnType("numeric(12,2)").IsRequired();
            b.Property(x => x.RecipientName).HasColumnName("recipient_name").HasMaxLength(255).IsRequired();
            b.Property(x => x.RecipientPhone).HasColumnName("recipient_phone").HasMaxLength(50);
            b.Property(x => x.RecipientAddress).HasColumnName("recipient_address").IsRequired();
            b.Property(x => x.RecipientCity).HasColumnName("recipient_city").HasMaxLength(100);
            b.Property(x => x.RecipientDistrict).HasColumnName("recipient_district").HasMaxLength(100);
            b.Property(x => x.Notes).HasColumnName("notes");
            b.Property(x => x.PreparedByUserId).HasColumnName("prepared_by_user_id");
            b.Property(x => x.PreparedByName).HasColumnName("prepared_by_name").HasMaxLength(255);
            b.Property(x => x.DispatchedAt).HasColumnName("dispatched_at");
            b.Property(x => x.DeliveredAt).HasColumnName("delivered_at");
            b.Property(x => x.CreatedAt).HasColumnName("created_at").IsRequired();
            b.Property(x => x.UpdatedAt).HasColumnName("updated_at").IsRequired();

            b.HasOne(x => x.Carrier)
                .WithMany(c => c.Shipments)
                .HasForeignKey(x => x.CarrierId)
                .OnDelete(DeleteBehavior.SetNull);

            b.HasMany(x => x.Items)
                .WithOne(i => i.Shipment)
                .HasForeignKey(i => i.ShipmentId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasMany(x => x.StatusHistories)
                .WithOne(h => h.Shipment)
                .HasForeignKey(h => h.ShipmentId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasQueryFilter(x => x.TenantId == currentTenant.Id);
        });

        // 3. ShipmentItem
        modelBuilder.Entity<ShipmentItem>(b =>
        {
            b.ToTable("shipment_items");
            b.HasKey(x => x.Id);
            b.Property(x => x.Id).HasColumnName("id");
            b.Property(x => x.TenantId).HasColumnName("tenant_id").IsRequired();
            b.Property(x => x.ShipmentId).HasColumnName("shipment_id").IsRequired();
            b.Property(x => x.ProductId).HasColumnName("product_id");
            b.Property(x => x.ProductName).HasColumnName("product_name").HasMaxLength(255).IsRequired();
            b.Property(x => x.Sku).HasColumnName("sku").HasMaxLength(100);
            b.Property(x => x.Quantity).HasColumnName("quantity").IsRequired();
            b.Property(x => x.Unit).HasColumnName("unit").HasMaxLength(50).IsRequired();
            b.Property(x => x.CreatedAt).HasColumnName("created_at").IsRequired();

            b.HasQueryFilter(x => x.TenantId == currentTenant.Id);
        });

        // 4. ShipmentStatusHistory
        modelBuilder.Entity<ShipmentStatusHistory>(b =>
        {
            b.ToTable("shipment_status_history");
            b.HasKey(x => x.Id);
            b.Property(x => x.Id).HasColumnName("id");
            b.Property(x => x.TenantId).HasColumnName("tenant_id").IsRequired();
            b.Property(x => x.ShipmentId).HasColumnName("shipment_id").IsRequired();
            b.Property(x => x.Status).HasColumnName("status").HasMaxLength(50).IsRequired();
            b.Property(x => x.Location).HasColumnName("location").HasMaxLength(200);
            b.Property(x => x.Description).HasColumnName("description");
            b.Property(x => x.ChangedByUserId).HasColumnName("changed_by_user_id");
            b.Property(x => x.ChangedByName).HasColumnName("changed_by_name").HasMaxLength(255);
            b.Property(x => x.CreatedAt).HasColumnName("created_at").IsRequired();

            b.HasQueryFilter(x => x.TenantId == currentTenant.Id);
        });

        // 5. ReturnShipment
        modelBuilder.Entity<ReturnShipment>(b =>
        {
            b.ToTable("return_shipments");
            b.HasKey(x => x.Id);
            b.Property(x => x.Id).HasColumnName("id");
            b.Property(x => x.TenantId).HasColumnName("tenant_id").IsRequired();
            b.Property(x => x.ReturnCode).HasColumnName("return_code").HasMaxLength(50).IsRequired();
            b.Property(x => x.OriginalShipmentId).HasColumnName("original_shipment_id");
            b.Property(x => x.OrderId).HasColumnName("order_id");
            b.Property(x => x.CustomerId).HasColumnName("customer_id");
            b.Property(x => x.CustomerName).HasColumnName("customer_name").HasMaxLength(255).IsRequired();
            b.Property(x => x.CarrierId).HasColumnName("carrier_id");
            b.Property(x => x.CarrierName).HasColumnName("carrier_name").HasMaxLength(150);
            b.Property(x => x.TrackingNumber).HasColumnName("tracking_number").HasMaxLength(100);
            b.Property(x => x.Reason).HasColumnName("reason").HasMaxLength(255).IsRequired();
            b.Property(x => x.Status).HasColumnName("status").HasMaxLength(50).IsRequired();
            b.Property(x => x.InspectionNotes).HasColumnName("inspection_notes");
            b.Property(x => x.InspectedByUserId).HasColumnName("inspected_by_user_id");
            b.Property(x => x.InspectedByName).HasColumnName("inspected_by_name").HasMaxLength(255);
            b.Property(x => x.InspectedAt).HasColumnName("inspected_at");
            b.Property(x => x.CreatedAt).HasColumnName("created_at").IsRequired();
            b.Property(x => x.UpdatedAt).HasColumnName("updated_at").IsRequired();

            b.HasQueryFilter(x => x.TenantId == currentTenant.Id);
        });
    }
}
