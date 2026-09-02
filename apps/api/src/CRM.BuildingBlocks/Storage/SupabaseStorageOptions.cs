namespace CRM.BuildingBlocks.Storage;

public class SupabaseStorageOptions
{
    public const string SectionName = "Supabase";

    public string Url { get; set; } = "http://127.0.0.1:54321";
    public string ServiceRoleKey { get; set; } = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIMAwPtLM8k_tCOm_b4i_bF5-aAg3yvR9n7vJq_VqM";
    public string PublicBucket { get; set; } = "crm-public";
    public string PrivateBucket { get; set; } = "crm-private";
}
