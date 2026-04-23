using System.CommandLine;
using DepVault.Cli.Commands.Push;
using DepVault.Cli.Commands.Scan;
using DepVault.Cli.Services;
using DepVault.Cli.Utils;
using Spectre.Console;

namespace DepVault.Cli.Commands;

internal sealed class PushCommands(
    CommandContext ctx,
    IFileScanner fileScanner,
    DirectoryVaultMapper vaultMapper,
    EnvImporter envImporter,
    SecretFileScanner secretFileScanner,
    StaleVariableCleaner staleVariableCleaner)
{
    public Command CreatePushCommand()
    {
        var projectOpt = new Option<string?>("--project") { Description = "Project ID (defaults to active)" };
        var vaultOpt = new Option<string?>("--vault")
        { Description = "Vault name (creates it if missing). All files push into this vault." };
        var fileOpt = new Option<string?>("--file")
        { Description = "Single file to push (auto-discovers if omitted)" };
        var formatOpt = new Option<string>("--format")
        { Description = "Import format for env files", DefaultValueFactory = _ => "env" };
        var noSyncOpt = new Option<bool>("--no-sync")
        { Description = "Skip removing stale variables that are no longer in the pushed file" };
        var createMissingOpt = new Option<bool>("--create-missing")
        { Description = "Auto-create missing vaults without prompting (non-interactive)" };

        var cmd = new Command("push", "Push environment variables and secret files")
            { projectOpt, vaultOpt, fileOpt, formatOpt, noSyncOpt, createMissingOpt };

        cmd.SetAction(async (parseResult, ct) =>
        {
            var pc = await ctx.RequireProjectContextAsync(parseResult, projectOpt, ct);
            if (pc is null)
            {
                Environment.ExitCode = 1;
                return;
            }

            var explicitVault = parseResult.GetValue(vaultOpt);
            var noSync = parseResult.GetValue(noSyncOpt);
            var createMissing = parseResult.GetValue(createMissingOpt);
            var selected = ResolveFiles(parseResult.GetValue(fileOpt));
            if (selected.Count == 0)
            {
                Environment.ExitCode = 1;
                return;
            }

            var dirMap = await vaultMapper.MapAsync(pc.ProjectId, selected, explicitVault, createMissing, ct);
            if (dirMap is null)
            {
                Environment.ExitCode = 1;
                return;
            }

            // Resolve encryption key once before processing any env files
            var hasEnvFiles = selected.Any(a => a.Category == FileCategory.Environment);
            if (hasEnvFiles && !await envImporter.EnsureDekAsync(pc.ProjectId, ct))
            {
                ctx.Output.PrintError("Failed to resolve encryption key. Aborting push.");
                Environment.ExitCode = 1;
                return;
            }

            var envImported = 0;
            var secretsUploaded = 0;
            var importedVaults = new List<(string VaultId, HashSet<string> Keys)>();

            foreach (var file in selected)
            {
                var dir = Path.GetDirectoryName(file.RelativePath)?.Replace('\\', '/') ?? ".";
                if (!dirMap.TryGetValue(dir, out var vaultId))
                {
                    AnsiConsole.MarkupLine($"[grey]Skipped {Markup.Escape(file.RelativePath)} (no vault)[/]");
                    continue;
                }

                try
                {
                    if (file.Category == FileCategory.Environment)
                    {
                        var result = await envImporter.ImportAsync(pc.ProjectId, file, vaultId, ct);
                        ctx.Output.PrintSuccess($"  {file.RelativePath}: {result.Imported} variables");
                        envImported += result.Imported;
                        importedVaults.Add((vaultId, result.ImportedKeys));
                    }
                    else
                    {
                        await secretFileScanner.UploadAsync(pc.ProjectId, file, vaultId, ct);
                        ctx.Output.PrintSuccess($"  {file.RelativePath}");
                        secretsUploaded++;
                    }
                }
                catch (Exception ex)
                {
                    ApiErrorHandler.HandleError(ex, $"Failed to push {file.RelativePath}");
                }
            }

            // Sync: remove stale variables not present in pushed files
            var totalDeleted = 0;
            if (!noSync && importedVaults.Count > 0)
            {
                AnsiConsole.WriteLine();
                foreach (var (vaultId, keys) in importedVaults)
                {
                    try
                    {
                        var deleted = await staleVariableCleaner.CleanAsync(pc.ProjectId, vaultId, keys, ct);
                        totalDeleted += deleted;
                    }
                    catch (Exception ex)
                    {
                        ApiErrorHandler.HandleError(ex, "Failed to clean stale variables");
                    }
                }
            }

            AnsiConsole.WriteLine();
            var summary = $"Imported {envImported} variables from env files, uploaded {secretsUploaded} secret file(s).";
            if (totalDeleted > 0)
            {
                summary += $" Removed {totalDeleted} stale variable(s).";
            }

            ctx.Output.PrintSuccess(summary);
        });

        return cmd;
    }

    private List<DiscoveredFile> ResolveFiles(string? explicitFile)
    {
        if (!string.IsNullOrEmpty(explicitFile))
        {
            if (!ctx.RequireFile(explicitFile))
            {
                return [];
            }

            var fullPath = Path.GetFullPath(explicitFile);
            var relativePath = Path.GetRelativePath(GitUtils.FindRepoRoot(), fullPath);
            var fileName = Path.GetFileName(fullPath);
            var category = fileScanner.ClassifyFile(fileName);
            return [new DiscoveredFile(fullPath, relativePath, fileName, category)];
        }

        if (!ctx.Prompter.IsInteractive)
        {
            ctx.Output.PrintError("--file is required in non-interactive mode.");
            return [];
        }

        var discovered = fileScanner.FindAllPushableFiles(GitUtils.FindRepoRoot());
        if (discovered.Count == 0)
        {
            ctx.Output.PrintError("No environment or secret files found in repository.");
            return [];
        }

        return ctx.Prompter.MultiSelect("Select files to push", discovered,
            f => $"[grey]{(f.Category == FileCategory.Environment ? "env" : "secret")}[/] {Markup.Escape(f.RelativePath)}",
            false);
    }
}
