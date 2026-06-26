using System.CommandLine;
using DepVault.Cli.Auth;
using DepVault.Cli.Services;
using Spectre.Console;

namespace DepVault.Cli.Commands;

/// <summary>
/// Removes the files <c>pull</c> wrote: derives the same set from the repo map and deletes them on disk.
/// Previews + confirms before deleting (or requires <c>--force</c> non-interactively). No decryption.
/// </summary>
public sealed class PurgeCommands(
    AuthContext ctx,
    RepoFilePurger repoFilePurger,
    RepoFileCommandResolver repoFileCommandResolver)
{
    public Command CreatePurgeCommand()
    {
        var projectOpt = new Option<string?>("--project") { Description = "Project ID (defaults to active)" };
        var appOpt = new Option<string?>("--app")
        { Description = "Only purge files for this app (matches app name or path)" };
        var environmentOpt = new Option<string?>("--environment")
        { Description = "Only purge files for this environment slug (e.g. dev, prod, staging)" };
        var includeBaseOpt = new Option<bool>("--include-base")
        {
            Description = "Include base-environment files when filtering by --environment",
            DefaultValueFactory = _ => true
        };
        var includeSecretsOpt = new Option<bool>("--include-secrets")
        { Description = "Also remove secret files", DefaultValueFactory = _ => true };
        var outputDirOpt = new Option<string?>("--output-dir")
        { Description = "Base directory to purge from (defaults to repo root)" };
        var dryRunOpt = new Option<bool>("--dry-run")
        { Description = "Preview what would be deleted without removing anything" };
        var noPruneOpt = new Option<bool>("--no-prune")
        { Description = "Keep directories left empty after deletion" };
        var forceOpt = new Option<bool>("--force", "--yes", "-y")
        { Description = "Delete without confirmation (required in non-interactive mode)" };

        var cmd = new Command("purge", "Remove pulled config and secret files from the repository")
        {
            projectOpt, appOpt, environmentOpt, includeBaseOpt,
            includeSecretsOpt, outputDirOpt, dryRunOpt, noPruneOpt, forceOpt
        };

        cmd.SetAction(async (parseResult, ct) =>
        {
            if (!ctx.RequireAuth())
            {
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
                "purge"), ct);
            if (selection is null)
            {
                return;
            }

            var dryRun = parseResult.GetValue(dryRunOpt);
            var prune = !parseResult.GetValue(noPruneOpt);
            var force = parseResult.GetValue(forceOpt);

            repoFileCommandResolver.PrintManifest(selection.Files);

            if (!dryRun && !force && !ConfirmDelete(selection.Files.Count))
            {
                return;
            }

            var result = repoFilePurger.Purge(selection.Files, selection.OutputDir, dryRun, prune, ct);

            AnsiConsole.WriteLine();
            if (dryRun)
            {
                ctx.Output.PrintSuccess($"Would delete {result.AffectedFiles} file(s).");
            }
            else
            {
                ctx.Output.PrintSuccess($"Deleted {result.AffectedFiles} file(s).");
                if (result.DirsRemoved > 0)
                {
                    ctx.Output.PrintKeyValue("Empty directories removed", result.DirsRemoved.ToString());
                }
            }

            if (result.NotFound > 0)
            {
                ctx.Output.PrintKeyValue("Already absent", result.NotFound.ToString());
            }
        });

        return cmd;
    }

    /// <summary>Non-interactive callers must pass <c>--force</c>; interactive callers confirm (default No).</summary>
    private bool ConfirmDelete(int count)
    {
        if (!ctx.Prompter.IsInteractive)
        {
            ctx.Output.PrintError("Purge is destructive. Pass --force to delete in non-interactive mode.");
            Environment.ExitCode = 1;
            return false;
        }

        return ctx.Prompter.Confirm($"Delete {count} file(s)? This cannot be undone.", defaultValue: false);
    }
}
