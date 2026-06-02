using System.CommandLine;
using DepVault.Cli.Commands.Pull;
using DepVault.Cli.Crypto;
using DepVault.Cli.Services;
using DepVault.Cli.Utils;
using Spectre.Console;
using AppEntry = DepVault.Cli.ApiClient.Api.Projects.Item.RepoMap.RepoMapGetResponse_apps;
using FileEntry = DepVault.Cli.ApiClient.Api.Projects.Item.RepoMap.RepoMapGetResponse_apps_files;
using RepoFileKind = DepVault.Cli.ApiClient.Api.Projects.Item.RepoMap.RepoMapGetResponse_apps_files_kind;

namespace DepVault.Cli.Commands;

/// <summary>
/// Pulls a project's encrypted files (config and secret) and restores each one byte-for-byte to its
/// original relative path. The server is zero-knowledge: blobs are decrypted client-side with the
/// project DEK and written verbatim — no re-serialization, no format conversion.
/// </summary>
public sealed class PullCommands(
    CommandContext ctx,
    DekService dekService,
    RepoFilePuller repoFilePuller,
    IRepositoryLocator repositoryLocator)
{
    private const string BaseSlug = "base";

    public Command CreatePullCommand()
    {
        var projectOpt = new Option<string?>("--project") { Description = "Project ID (defaults to active)" };
        var appOpt = new Option<string?>("--app")
        { Description = "Only pull files for this app (matches app name or path)" };
        var environmentOpt = new Option<string?>("--environment")
        { Description = "Only pull files for this environment slug (e.g. dev, prod, staging)" };
        var includeBaseOpt = new Option<bool>("--include-base")
        {
            Description = "Include base-environment files when filtering by --environment",
            DefaultValueFactory = _ => true
        };
        var includeSecretsOpt = new Option<bool>("--include-secrets")
        { Description = "Also restore secret files", DefaultValueFactory = _ => true };
        var outputDirOpt = new Option<string?>("--output-dir")
        { Description = "Base output directory (defaults to repo root)" };
        var forceOpt = new Option<bool>("--force") { Description = "Overwrite existing files without prompting" };
        var formatOpt = new Option<string?>("--format")
        { Description = "Export mode: convert files to a different format (not yet implemented)" };

        var cmd = new Command("pull", "Pull and restore encrypted config and secret files")
        {
            projectOpt, appOpt, environmentOpt, includeBaseOpt,
            includeSecretsOpt, outputDirOpt, forceOpt, formatOpt
        };

        cmd.SetAction(async (parseResult, ct) =>
        {
            var pc = await ctx.RequireProjectContextAsync(parseResult, projectOpt, ct);
            if (pc is null)
            {
                Environment.ExitCode = 1;
                return;
            }

            // --format is reserved for an explicit export/convert mode. Normal pull restores
            // blobs verbatim, so a format selector here is intentionally a no-op for now.
            if (!string.IsNullOrEmpty(parseResult.GetValue(formatOpt)))
            {
                ctx.Output.PrintError(
                    "--format export mode is not yet implemented. Pull restores files verbatim.");
                Environment.ExitCode = 1;
                return;
            }

            var appFilter = parseResult.GetValue(appOpt);
            var envFilter = NormalizeEnv(parseResult.GetValue(environmentOpt));
            var includeBase = parseResult.GetValue(includeBaseOpt);
            var includeSecrets = parseResult.GetValue(includeSecretsOpt);
            var outputDir = Path.GetFullPath(parseResult.GetValue(outputDirOpt) ?? repositoryLocator.FindRepoRoot());
            var force = parseResult.GetValue(forceOpt);

            var repoMap = await AnsiConsole.Status()
                .Spinner(Spinner.Known.Dots)
                .StartAsync("Fetching repository map...", async _ =>
                    await pc.Client.Api.Projects[pc.ProjectId].RepoMap.GetAsync(cancellationToken: ct));

            var apps = FilterApps(repoMap?.Apps, appFilter);
            if (apps is null)
            {
                Environment.ExitCode = 1;
                return;
            }

            var files = CollectFiles(apps, envFilter, includeBase, includeSecrets);

            if (files.Count == 0)
            {
                AnsiConsole.MarkupLine("[grey]No files match the requested filters.[/]");
                return;
            }

            if (!force && !ConfirmOverwrite(outputDir, files))
            {
                return;
            }

            var dek = await dekService.CollectPasswordAndResolveAsync(pc.ProjectId, ct);

            if (dek is null)
            {
                ctx.Output.PrintError("Failed to resolve encryption key.");
                Environment.ExitCode = 1;
                return;
            }

            AnsiConsole.MarkupLine($"[cyan1]Restoring {files.Count} file(s)...[/]");

            var pulled = await repoFilePuller.PullAsync(pc.ProjectId, files, outputDir, dek, ct);

            AnsiConsole.WriteLine();
            ctx.Output.PrintSuccess($"Pulled {pulled} file(s).");
        });

        return cmd;
    }

    private static string? NormalizeEnv(string? environment)
    {
        return string.IsNullOrWhiteSpace(environment) ? null : environment.Trim().ToLowerInvariant();
    }

    /// <summary>
    /// Filters repo-map apps by the optional <paramref name="appFilter"/>, matching against either
    /// the app name or its repo-relative path (case-insensitive). Returns null on an error that
    /// should abort the command.
    /// </summary>
    private List<AppEntry>? FilterApps(List<AppEntry>? apps, string? appFilter)
    {
        if (apps is null || apps.Count == 0)
        {
            ctx.Output.PrintError("This project has no apps to pull.");
            return null;
        }

        if (string.IsNullOrEmpty(appFilter))
        {
            return apps;
        }

        var matched = apps.Where(a =>
            string.Equals(a.Name, appFilter, StringComparison.OrdinalIgnoreCase)
            || string.Equals(a.AppPath, appFilter, StringComparison.OrdinalIgnoreCase)).ToList();

        if (matched.Count == 0)
        {
            var available = string.Join(", ", apps.Select(a => a.Name ?? a.AppPath ?? "?"));
            ctx.Output.PrintError($"App '{appFilter}' not found. Available: {available}");
            return null;
        }

        return matched;
    }

    private static List<FileEntry> CollectFiles(
        IEnumerable<AppEntry> apps, string? envFilter, bool includeBase, bool includeSecrets)
    {
        return apps
            .SelectMany(a => a.Files ?? [])
            .Where(f => includeSecrets || f.Kind != RepoFileKind.SECRET)
            .Where(f => MatchesEnvironment(f.EnvironmentSlug, envFilter, includeBase))
            .ToList();
    }

    /// <summary>
    /// Decides whether a file's environment slug passes the filter. With no filter every file is
    /// included. With a filter, files matching that slug are included; base files are included too
    /// unless <paramref name="includeBase"/> is false.
    /// </summary>
    private static bool MatchesEnvironment(string? slug, string? envFilter, bool includeBase)
    {
        if (envFilter is null)
        {
            return true;
        }

        var normalized = (slug ?? BaseSlug).ToLowerInvariant();

        if (string.Equals(normalized, envFilter, StringComparison.Ordinal))
        {
            return true;
        }

        return includeBase && string.Equals(normalized, BaseSlug, StringComparison.Ordinal);
    }

    private bool ConfirmOverwrite(string outputDir, IReadOnlyList<FileEntry> files)
    {
        if (!ctx.Prompter.IsInteractive)
        {
            return true;
        }

        var hasExisting = files
            .Select(f => f.RelativePath)
            .Where(p => !string.IsNullOrEmpty(p))
            .Any(p => File.Exists(Path.Combine(outputDir, p!.Replace('\\', '/').TrimStart('/'))));

        if (hasExisting)
        {
            return ctx.Prompter.Confirm("Existing files will be overwritten. Continue?");
        }

        return true;
    }
}
