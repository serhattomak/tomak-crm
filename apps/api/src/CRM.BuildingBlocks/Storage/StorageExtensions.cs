using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CRM.BuildingBlocks.Storage;

public static class StorageExtensions
{
    public static IServiceCollection AddSupabaseStorage(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<SupabaseStorageOptions>(configuration.GetSection(SupabaseStorageOptions.SectionName));

        services.AddHttpClient<IFileStorageService, SupabaseStorageService>();

        return services;
    }
}
