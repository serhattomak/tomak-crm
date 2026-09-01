using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using CRM.BuildingBlocks.Tenancy;

namespace CRM.Modules.Vehicles.Entities;

[Table("vehicles", Schema = "public")]
public class Vehicle : ITenantScopedEntity
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Column("tenant_id")]
    public Guid TenantId { get; set; }

    [Column("brand")]
    [MaxLength(100)]
    public string Brand { get; set; } = string.Empty;

    [Column("model")]
    [MaxLength(100)]
    public string Model { get; set; } = string.Empty;

    [Column("series")]
    [MaxLength(100)]
    public string? Series { get; set; }

    [Column("generation")]
    [MaxLength(100)]
    public string? Generation { get; set; }

    [Column("platform")]
    [MaxLength(100)]
    public string? Platform { get; set; }

    [Column("project_code")]
    [MaxLength(100)]
    public string? ProjectCode { get; set; }

    [Column("internal_code")]
    [MaxLength(100)]
    public string? InternalCode { get; set; }

    [Column("model_year")]
    public int ModelYear { get; set; } = 2025;

    [Column("trim")]
    [MaxLength(100)]
    public string Trim { get; set; } = "Base";

    [Column("variant")]
    [MaxLength(100)]
    public string? Variant { get; set; }

    [Column("segment")]
    [MaxLength(50)]
    public string Segment { get; set; } = "C-SUV";

    [Column("body_type")]
    [MaxLength(50)]
    public string BodyType { get; set; } = "SUV";

    [Column("doors")]
    public int Doors { get; set; } = 5;

    [Column("seats")]
    public int Seats { get; set; } = 5;

    [Column("drive_type")]
    [MaxLength(50)]
    public string DriveType { get; set; } = "FWD";

    [Column("market")]
    [MaxLength(100)]
    public string Market { get; set; } = "Global";

    [Column("country")]
    [MaxLength(100)]
    public string Country { get; set; } = "Türkiye";

    [Column("plant")]
    [MaxLength(150)]
    public string? Plant { get; set; }

    [Column("vin_prefix")]
    [MaxLength(50)]
    public string? VinPrefix { get; set; }

    [Column("engine")]
    [MaxLength(150)]
    public string Engine { get; set; } = "2.0L Turbo";

    [Column("transmission")]
    [MaxLength(100)]
    public string Transmission { get; set; } = "8-Speed Automatic";

    [Column("fuel")]
    [MaxLength(50)]
    public string Fuel { get; set; } = "Petrol";

    [Column("emission")]
    [MaxLength(50)]
    public string Emission { get; set; } = "Euro 6d";

    [Column("status")]
    [MaxLength(50)]
    public string Status { get; set; } = "Active";

    [Column("icon")]
    [MaxLength(20)]
    public string Icon { get; set; } = "🚗";

    [Column("price_usd")]
    public decimal PriceUsd { get; set; }

    [Column("price_try")]
    public decimal PriceTry { get; set; }

    // Technical Specs (JSONB)
    [Column("dimensions", TypeName = "jsonb")]
    public string DimensionsJson { get; set; } = "{}";

    [Column("weights", TypeName = "jsonb")]
    public string WeightsJson { get; set; } = "{}";

    [Column("engine_spec", TypeName = "jsonb")]
    public string EngineSpecJson { get; set; } = "{}";

    [Column("performance", TypeName = "jsonb")]
    public string PerformanceJson { get; set; } = "{}";

    [Column("fuel_eco", TypeName = "jsonb")]
    public string FuelEcoJson { get; set; } = "{}";

    [Column("suspension", TypeName = "jsonb")]
    public string SuspensionJson { get; set; } = "{}";

    [Column("brakes", TypeName = "jsonb")]
    public string BrakesJson { get; set; } = "{}";

    [Column("tyres")]
    [MaxLength(100)]
    public string? Tyres { get; set; }

    [Column("safety", TypeName = "jsonb")]
    public string SafetyJson { get; set; } = "{}";

    [Column("comfort", TypeName = "jsonb")]
    public string ComfortJson { get; set; } = "{}";

    [Column("infotainment", TypeName = "jsonb")]
    public string InfotainmentJson { get; set; } = "{}";

    [Column("warranty", TypeName = "jsonb")]
    public string WarrantyJson { get; set; } = "{}";

    [Column("equipment", TypeName = "jsonb")]
    public string EquipmentJson { get; set; } = "[]";

    [Column("notes")]
    public string? Notes { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<VehicleDocument> Documents { get; set; } = new List<VehicleDocument>();
}

[Table("vehicle_systems", Schema = "public")]
public class VehicleSystem : ITenantScopedEntity
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Column("tenant_id")]
    public Guid TenantId { get; set; }

    [Column("code")]
    [MaxLength(50)]
    public string Code { get; set; } = string.Empty;

    [Column("name")]
    [MaxLength(150)]
    public string Name { get; set; } = string.Empty;

    [Column("icon")]
    [MaxLength(20)]
    public string Icon { get; set; } = "⚙️";

    [Column("display_order")]
    public int DisplayOrder { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<VehicleSubsystem> Subsystems { get; set; } = new List<VehicleSubsystem>();
    public ICollection<VehiclePart> Parts { get; set; } = new List<VehiclePart>();
}

[Table("vehicle_subsystems", Schema = "public")]
public class VehicleSubsystem : ITenantScopedEntity
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Column("tenant_id")]
    public Guid TenantId { get; set; }

    [Column("system_id")]
    public Guid SystemId { get; set; }

    [ForeignKey(nameof(SystemId))]
    public VehicleSystem? System { get; set; }

    [Column("code")]
    [MaxLength(50)]
    public string Code { get; set; } = string.Empty;

    [Column("name")]
    [MaxLength(150)]
    public string Name { get; set; } = string.Empty;

    [Column("display_order")]
    public int DisplayOrder { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<VehiclePart> Parts { get; set; } = new List<VehiclePart>();
}

[Table("vehicle_parts", Schema = "public")]
public class VehiclePart : ITenantScopedEntity
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Column("tenant_id")]
    public Guid TenantId { get; set; }

    [Column("system_id")]
    public Guid? SystemId { get; set; }

    [ForeignKey(nameof(SystemId))]
    public VehicleSystem? System { get; set; }

    [Column("subsystem_id")]
    public Guid? SubsystemId { get; set; }

    [ForeignKey(nameof(SubsystemId))]
    public VehicleSubsystem? Subsystem { get; set; }

    [Column("part_number")]
    [MaxLength(100)]
    public string PartNumber { get; set; } = string.Empty;

    [Column("oem_number")]
    [MaxLength(100)]
    public string? OemNumber { get; set; }

    [Column("name_tr")]
    [MaxLength(200)]
    public string NameTr { get; set; } = string.Empty;

    [Column("name_en")]
    [MaxLength(200)]
    public string NameEn { get; set; } = string.Empty;

    [Column("name_cn")]
    [MaxLength(200)]
    public string? NameCn { get; set; }

    [Column("qty_per_assembly")]
    public int QtyPerAssembly { get; set; } = 1;

    [Column("location")]
    [MaxLength(100)]
    public string? Location { get; set; }

    [Column("stock_quantity")]
    public int StockQuantity { get; set; }

    [Column("unit_price")]
    public decimal UnitPrice { get; set; }

    [Column("supersession")]
    [MaxLength(200)]
    public string? Supersession { get; set; } = "—";

    [Column("compatible_models", TypeName = "jsonb")]
    public string CompatibleModelsJson { get; set; } = "[]";

    [Column("hotspot_coord_x")]
    public int? HotspotCoordX { get; set; }

    [Column("hotspot_coord_y")]
    public int? HotspotCoordY { get; set; }

    [Column("notes")]
    public string? Notes { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

[Table("vehicle_documents", Schema = "public")]
public class VehicleDocument : ITenantScopedEntity
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Column("tenant_id")]
    public Guid TenantId { get; set; }

    [Column("vehicle_id")]
    public Guid? VehicleId { get; set; }

    [ForeignKey(nameof(VehicleId))]
    public Vehicle? Vehicle { get; set; }

    [Column("part_id")]
    public Guid? PartId { get; set; }

    [Column("name")]
    [MaxLength(255)]
    public string Name { get; set; } = string.Empty;

    [Column("document_type")]
    [MaxLength(50)]
    public string DocumentType { get; set; } = "PDF";

    [Column("category")]
    [MaxLength(100)]
    public string Category { get; set; } = "Genel";

    [Column("file_size")]
    [MaxLength(50)]
    public string FileSize { get; set; } = "1 MB";

    [Column("file_url")]
    public string? FileUrl { get; set; }

    [Column("tags", TypeName = "jsonb")]
    public string TagsJson { get; set; } = "[]";

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
