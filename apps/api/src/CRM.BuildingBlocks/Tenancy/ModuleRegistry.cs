namespace CRM.BuildingBlocks.Tenancy;

public record ModuleDefinition(string Key, string DefaultDisplayName, string Category);

public static class ModuleRegistry
{
    public static readonly ModuleDefinition[] All =
    [
        // Sales CRM
        new("customers", "Müşteriler", "Sales"),
        new("products", "Ürün & Hizmetler", "Sales"),
        new("orders", "Siparişler", "Sales"),
        new("pipelines", "Pipeline & Akış", "Sales"),
        new("quotes", "Teklifler", "Sales"),
        new("shipping", "Kargo & Sevkiyat", "Sales"),

        // HR & Payroll
        new("organization", "Organizasyon", "HR"),
        new("payroll", "Bordro & Maaşlar", "HR"),
        new("leaves", "İzinler & Takvim", "HR"),
        new("attendance", "Vardiya & PDKS", "HR"),

        // Communication & Tools
        new("chat", "Mesajlar", "Tools"),
    ];

    public static ModuleDefinition? GetByKey(string key) =>
        All.FirstOrDefault(m => m.Key.Equals(key, StringComparison.OrdinalIgnoreCase));

    public static bool IsValidModule(string key) =>
        All.Any(m => m.Key.Equals(key, StringComparison.OrdinalIgnoreCase));

    public static string[] GetDefaultModuleKeys() =>
        All.Select(m => m.Key).ToArray();
}
