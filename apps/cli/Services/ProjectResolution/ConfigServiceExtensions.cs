using DepVault.Cli.Config;

namespace DepVault.Cli.Services.ProjectResolution;

internal static class ConfigServiceExtensions
{
    /// <summary>Persists the resolved project as the active one for subsequent commands.</summary>
    public static void SetActiveProject(
        this IConfigService configService, string projectId, string? projectName)
    {
        var config = configService.Load();
        config.ActiveProjectId = projectId;
        config.ActiveProjectName = projectName;
        configService.Save(config);
    }
}
