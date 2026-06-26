using System.CommandLine;
using DepVault.Cli.Auth;
using DepVault.Cli.Common;
using DepVault.Cli.Crypto;
using DepVault.Cli.Services;
using FileEntry = DepVault.Cli.ApiClient.Api.Projects.Item.RepoMap.RepoMapGetResponse_apps_files;

namespace DepVault.Cli.Commands;

/// <summary>
/// Pulls a project's encrypted files (config and secret) and restores each one byte-for-byte to its
/// original relative path. The server is zero-knowledge: blobs are decrypted client-side with the
/// project DEK and written verbatim — no re-serialization, no format conversion.
/// </summary>
public sealed class PullCommands(
    AuthContext ctx,
    DekService dekService,
    RepoFilePuller repoFilePuller,
    RepoFileCommandResolver repoFileCommandResolver)
{
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
            if (!ctx.RequireAuth())
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

            var selection = await repoFileCommandResolver.ResolveAsync(new RepoFileCommandRequest(
                parseResult.GetValue(projectOpt),
                parseResult.GetValue(appOpt),
                parseResult.GetValue(environmentOpt),
                parseResult.GetValue(includeBaseOpt),
                parseResult.GetValue(includeSecretsOpt),
                parseResult.GetValue(outputDirOpt),
                "pull"), ct);
            if (selection is null)
            {
                return;
            }

            var force = parseResult.GetValue(forceOpt);

            // Preview the manifest before any crypto; the overwrite confirm below gates the write.
            repoFileCommandResolver.PrintManifest(selection.Files);

            if (!force && !ConfirmOverwrite(selection.OutputDir, selection.Files))
            {
                return;
            }

            var dek = await dekService.CollectPasswordAndResolveAsync(selection.ProjectId, ct);

            if (dek is null)
            {
                ctx.Output.PrintError("Failed to resolve encryption key.");
                Environment.ExitCode = 1;
                return;
            }

            Spectre.Console.AnsiConsole.MarkupLine($"[cyan1]Restoring {selection.Files.Count} file(s)...[/]");

            var pulled = await repoFilePuller.PullAsync(
                selection.ProjectId, selection.Files, selection.OutputDir, dek, ct);

            Spectre.Console.AnsiConsole.WriteLine();
            ctx.Output.PrintSuccess($"Pulled {pulled} file(s).");
        });

        return cmd;
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
            .Any(p => TargetExists(outputDir, p!));

        if (hasExisting)
        {
            return ctx.Prompter.Confirm("Existing files will be overwritten. Continue?");
        }

        return true;
    }

    /// <summary>Existence probe that treats an out-of-tree path as no conflict (the pull write skips it).</summary>
    private static bool TargetExists(string outputDir, string relativePath)
    {
        try
        {
            return File.Exists(RepoFileSelection.ResolveTargetPath(outputDir, relativePath));
        }
        catch (InvalidOperationException)
        {
            return false;
        }
    }
}
