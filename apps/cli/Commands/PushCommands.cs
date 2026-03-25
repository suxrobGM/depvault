using System.CommandLine;
using DepVault.Cli.Commands.Pull;
using DepVault.Cli.Commands.Push;
using DepVault.Cli.Commands.Scan;
using DepVault.Cli.Services;
using DepVault.Cli.Utils;
using Spectre.Console;

namespace DepVault.Cli.Commands;

internal sealed class PushCommands(
    CommandContext ctx,
    IFileScanner fileScanner,
    DirectoryVaultGroupMapper dirMapper,
    FileEnvironmentAssigner envAssigner,
    EnvImporter envImporter,
    SecretFileScanner secretFileScanner,
    StaleVariableCleaner staleVariableCleaner)
{
    public Command CreatePushCommand()
    {
        var projectOpt = new Option<string?>("--project") { Description = "Project ID (defaults to active)" };
        var envOpt = new Option<string?>("--environment")
        { Description = "Environment type (prompts per file if not set)" };
        var fileOpt = new Option<string?>("--file")
        { Description = "Single file to push (auto-discovers if omitted)" };
        var formatOpt = new Option<string>("--format")
        { Description = "Import format for env files", DefaultValueFactory = _ => "env" };
        var noSyncOpt = new Option<bool>("--no-sync")
        { Description = "Skip removing stale variables that are no longer in the pushed file" };

        var cmd = new Command("push", "Push environment variables and secret files")
            { projectOpt, envOpt, fileOpt, formatOpt, noSyncOpt };

        cmd.SetAction(async (parseResult, ct) =>
        {
            var pc = await ctx.RequireProjectContextAsync(parseResult, projectOpt, ct);
            if (pc is null)
            {
                return;
            }

            var explicitEnv = parseResult.GetValue(envOpt);
            var noSync = parseResult.GetValue(noSyncOpt);
            var selected = ResolveFiles(parseResult.GetValue(fileOpt));
            if (selected.Count == 0)
            {
                return;
            }

            var dirMap = await dirMapper.MapAsync(pc.ProjectId, selected, ct);
            if (dirMap is null)
            {
                return;
            }

            AnsiConsole.WriteLine();
            var assignments = envAssigner.AssignEnvironments(selected, explicitEnv);

            // Resolve encryption key once before processing any env files
            var hasEnvFiles = assignments.Any(a => a.File.Category == FileCategory.Environment);
            if (hasEnvFiles && !await envImporter.EnsureDekAsync(pc.ProjectId, ct))
            {
                ctx.Output.PrintError("Failed to resolve encryption key. Aborting push.");
                return;
            }

            var envImported = 0;
            var secretsUploaded = 0;
            var importedGroups = new List<(string VaultGroupId, string EnvType, HashSet<string> Keys)>();

            foreach (var (file, envType) in assignments)
            {
                var dir = Path.GetDirectoryName(file.RelativePath)?.Replace('\\', '/') ?? ".";
                if (!dirMap.TryGetValue(dir, out var vaultGroupId))
                {
                    AnsiConsole.MarkupLine($"[grey]Skipped {Markup.Escape(file.RelativePath)} (no vault group)[/]");
                    continue;
                }

                try
                {
                    if (file.Category == FileCategory.Environment)
                    {
                        var result = await envImporter.ImportAsync(
                            pc.ProjectId, file, vaultGroupId, envType, ct);
                        ctx.Output.PrintSuccess($"  {file.RelativePath}: {result.Imported} variables ({envType})");
                        envImported += result.Imported;
                        importedGroups.Add((vaultGroupId, envType, result.ImportedKeys));
                    }
                    else
                    {
                        await secretFileScanner.UploadAsync(pc.ProjectId, file, vaultGroupId, ct);
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
            if (!noSync && importedGroups.Count > 0)
            {
                AnsiConsole.WriteLine();
                foreach (var (vaultGroupId, envType, keys) in importedGroups)
                {
                    try
                    {
                        var deleted = await staleVariableCleaner.CleanAsync(
                            pc.ProjectId, vaultGroupId, envType, keys, ct);
                        totalDeleted += deleted;
                    }
                    catch (Exception ex)
                    {
                        ApiErrorHandler.HandleError(ex, $"Failed to clean stale variables for {envType}");
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
            var relativePath = Path.GetRelativePath(Directory.GetCurrentDirectory(), fullPath);
            var fileName = Path.GetFileName(fullPath);
            var category = fileScanner.ClassifyFile(fileName);
            return [new DiscoveredFile(fullPath, relativePath, fileName, category)];
        }

        if (!ctx.Prompter.IsInteractive)
        {
            ctx.Output.PrintError("--file is required in non-interactive mode.");
            return [];
        }

        var discovered = fileScanner.FindAllPushableFiles(Directory.GetCurrentDirectory());
        if (discovered.Count == 0)
        {
            ctx.Output.PrintError("No environment or secret files found in current directory.");
            return [];
        }

        return ctx.Prompter.MultiSelect("Select files to push", discovered,
            f => $"[grey]{(f.Category == FileCategory.Environment ? "env" : "secret")}[/] {Markup.Escape(f.RelativePath)}",
            false);
    }
}
