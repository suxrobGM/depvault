using DepVault.Cli.Config;
using DepVault.Cli.Output;

namespace DepVault.Cli.Services.ProjectResolution;

/// <summary>
/// Decides which project a command acts on by trying each strategy in order: an explicit id, the
/// active project from config, git auto-detection, then an interactive picker. The
/// <see cref="ResolutionPolicy"/> gates which strategies are eligible so CI/non-interactive callers
/// never prompt. Each strategy is a small collaborator service.
/// </summary>
public sealed class ProjectContextResolver(
    IConfigService configService,
    IConsolePrompter prompter,
    IOutputFormatter output,
    IActiveProjectResolver activeProjectResolver,
    IProjectAutoDetector autoDetector,
    IInteractiveProjectResolver interactiveResolver) : IProjectContextResolver
{
    public async Task<ProjectResolution?> ResolveAsync(
        string? explicitId, ResolutionPolicy policy, CancellationToken ct)
    {
        if (!string.IsNullOrEmpty(explicitId))
        {
            return new ProjectResolution(explicitId, null);
        }

        var config = configService.Load();
        if (!string.IsNullOrEmpty(config.ActiveProjectId))
        {
            var active = await activeProjectResolver.ResolveAsync(
                config.ActiveProjectId, config.ActiveProjectName, policy, ct);
            if (active is not null)
            {
                // Auto-switch to the project matching the current repo when it diverges from active.
                if (policy.HasFlag(ResolutionPolicy.AllowAutoDetect))
                {
                    return await autoDetector.ReconcileAsync(active, ct) ?? active;
                }

                return active;
            }
        }

        if (policy.HasFlag(ResolutionPolicy.AllowAutoDetect))
        {
            var detected = await autoDetector.DetectAsync(ct);
            if (detected is not null)
            {
                return detected;
            }
        }

        if (policy.HasFlag(ResolutionPolicy.AllowInteractive) && prompter.IsInteractive)
        {
            return await interactiveResolver.ResolveAsync(policy, ct);
        }

        output.PrintError("No project specified. Use --project or 'depvault project select <id>'.");
        return null;
    }
}
