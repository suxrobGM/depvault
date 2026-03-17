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
    SecretFileScanner secretFileScanner)
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

        var cmd = new Command("push", "Push environment variables and secret files")
            { projectOpt, envOpt, fileOpt, formatOpt };

        cmd.SetAction(async (parseResult, ct) =>
        {
            if (!ctx.RequireAuth())
            {
                return;
            }

            var projectId = ctx.RequireProjectId(parseResult, projectOpt);
            if (projectId is null)
            {
                return;
            }

            var explicitEnv = parseResult.GetValue(envOpt);
            var selected = ResolveFiles(parseResult.GetValue(fileOpt));
            if (selected.Count == 0)
            {
                return;
            }

            var dirMap = await dirMapper.MapAsync(projectId, selected, ct);
            if (dirMap is null)
            {
                return;
            }

            AnsiConsole.WriteLine();
            var assignments = envAssigner.AssignEnvironments(selected, explicitEnv);

            var envImported = 0;
            var secretsUploaded = 0;

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
                        var count = await envImporter.ImportAsync(
                            projectId, file, vaultGroupId, envType, ct);
                        ctx.Output.PrintSuccess($"  {file.RelativePath}: {count} variables ({envType})");
                        envImported += count;
                    }
                    else
                    {
                        await secretFileScanner.UploadAsync(projectId, file, envType, vaultGroupId, ct);
                        ctx.Output.PrintSuccess($"  {file.RelativePath} ({envType})");
                        secretsUploaded++;
                    }
                }
                catch (Exception ex)
                {
                    ApiErrorHandler.HandleError(ex, $"Failed to push {file.RelativePath}");
                }
            }

            AnsiConsole.WriteLine();
            ctx.Output.PrintSuccess(
                $"Imported {envImported} variables from env files, uploaded {secretsUploaded} secret file(s).");
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
