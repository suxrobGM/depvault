namespace DepVault.Cli.Services.ProjectResolution;

/// <summary>Controls which fallbacks the resolver may use when no project is explicitly given.</summary>
[Flags]
public enum ResolutionPolicy
{
    None = 0,

    /// <summary>Match the git repo name against the project list (and persist as active).</summary>
    AllowAutoDetect = 1 << 0,

    /// <summary>Prompt the user to select a project from the list.</summary>
    AllowInteractive = 1 << 1,

    /// <summary>Offer "+ Create new project" in the interactive selector.</summary>
    AllowCreate = 1 << 2,

    /// <summary>Confirm the active project before using it (scan's behavior).</summary>
    ConfirmActive = 1 << 3,

    /// <summary>Auto-detect, then interactive select with create — the push/pull default.</summary>
    Interactive = AllowAutoDetect | AllowInteractive | AllowCreate
}

/// <summary>The outcome of project resolution.</summary>
public sealed record ProjectResolution(string ProjectId, string? ProjectName);

/// <summary>
/// Single entry point for resolving the project a command should act on. Honors a
/// <see cref="ResolutionPolicy"/> so CI/non-interactive callers never prompt. The decision tree
/// lives in <see cref="ProjectContextResolver"/>; each strategy is a small collaborator service.
/// </summary>
public interface IProjectContextResolver
{
    Task<ProjectResolution?> ResolveAsync(
        string? explicitId, ResolutionPolicy policy, CancellationToken ct);
}
