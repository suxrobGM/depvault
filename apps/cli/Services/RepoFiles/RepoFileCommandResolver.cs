using DepVault.Cli.Auth;
using DepVault.Cli.Commands;
using DepVault.Cli.Common;
using DepVault.Cli.Output;
using DepVault.Cli.Services.ProjectResolution;
using Spectre.Console;
using AppEntry = DepVault.Cli.ApiClient.Api.Projects.Item.RepoMap.RepoMapGetResponse_apps;
using FileEntry = DepVault.Cli.ApiClient.Api.Projects.Item.RepoMap.RepoMapGetResponse_apps_files;
using RepoFileKind = DepVault.Cli.ApiClient.Api.Projects.Item.RepoMap.RepoMapGetResponse_apps_files_kind;

namespace DepVault.Cli.Services;

public sealed record RepoFileCommandRequest(
    string? ExplicitProjectId,
    string? AppFilter,
    string? Environment,
    bool IncludeBase,
    bool IncludeSecrets,
    string? OutputDir,
    string OperationName);

public sealed record RepoFileCommandSelection(
    string ProjectId,
    string OutputDir,
    IReadOnlyList<FileEntry> Files);

internal enum RepoFileCommandMatchStatus
{
    Success,
    NoApps,
    NoAppMatch,
    NoFiles
}

internal sealed record RepoFileCommandMatch(
    RepoFileCommandMatchStatus Status,
    IReadOnlyList<FileEntry> Files);

/// <summary>Shared repo-map resolution, filtering, and manifest rendering for pull-like commands.</summary>
public sealed class RepoFileCommandResolver(
    AuthContext ctx,
    IRepositoryLocator repositoryLocator,
    IProjectContextResolver projectContextResolver,
    IApiClientFactory clientFactory,
    ConsoleRenderer renderer)
{
    public async Task<RepoFileCommandSelection?> ResolveAsync(
        RepoFileCommandRequest request,
        CancellationToken ct)
    {
        var resolution = await projectContextResolver.ResolveAsync(
            request.ExplicitProjectId, ResolutionPolicy.Interactive, ct);
        if (resolution is null || !ProjectGuard.ConfirmOverride(ctx, request.ExplicitProjectId))
        {
            Environment.ExitCode = 1;
            return null;
        }

        renderer.PrintStatusLine();
        var projectId = resolution.ProjectId;
        var outputDir = Path.GetFullPath(request.OutputDir ?? repositoryLocator.FindRepoRoot());
        var client = clientFactory.Create();

        var repoMap = await AnsiConsole.Status()
            .Spinner(Spinner.Known.Dots)
            .StartAsync("Fetching repository map...", async _ =>
                await client.Api.Projects[projectId].RepoMap.GetAsync(cancellationToken: ct));

        var match = SelectFiles(
            repoMap?.Apps,
            request.AppFilter,
            RepoFileSelection.NormalizeEnv(request.Environment),
            request.IncludeBase,
            request.IncludeSecrets,
            request.OperationName,
            ctx.Output);

        if (match.Status is RepoFileCommandMatchStatus.NoApps or RepoFileCommandMatchStatus.NoAppMatch)
        {
            Environment.ExitCode = 1;
            return null;
        }

        return match.Status == RepoFileCommandMatchStatus.Success
            ? new RepoFileCommandSelection(projectId, outputDir, match.Files)
            : null;
    }

    public void PrintManifest(IReadOnlyList<FileEntry> files)
    {
        var rows = files.Select(f => new[]
        {
            f.RelativePath ?? "",
            f.EnvironmentSlug ?? RepoFileSelection.BaseSlug,
            f.Kind == RepoFileKind.SECRET ? "secret" : "config"
        }).ToList();

        ctx.Output.PrintTable(["FILE", "ENV", "KIND"], rows);
    }

    internal static RepoFileCommandMatch SelectFiles(
        List<AppEntry>? apps,
        string? appFilter,
        string? envFilter,
        bool includeBase,
        bool includeSecrets,
        string operationName,
        IOutputFormatter output)
    {
        if (apps is null || apps.Count == 0)
        {
            output.PrintError($"This project has no apps to {operationName}.");
            return new RepoFileCommandMatch(RepoFileCommandMatchStatus.NoApps, []);
        }

        var matched = RepoFileSelection.FilterApps(apps, appFilter);
        if (matched.Count == 0)
        {
            var available = string.Join(", ", apps.Select(a => a.Name ?? a.AppPath ?? "?"));
            output.PrintError($"App '{appFilter}' not found. Available: {available}");
            return new RepoFileCommandMatch(RepoFileCommandMatchStatus.NoAppMatch, []);
        }

        var files = RepoFileSelection.CollectFiles(matched, envFilter, includeBase, includeSecrets);
        if (files.Count == 0)
        {
            AnsiConsole.MarkupLine("[grey]No files match the requested filters.[/]");
            return new RepoFileCommandMatch(RepoFileCommandMatchStatus.NoFiles, []);
        }

        return new RepoFileCommandMatch(RepoFileCommandMatchStatus.Success, files);
    }
}
