using System.CommandLine;
using DepVault.Cli.ApiClient.Projects.Item.Secrets;
using DepVault.Cli.Auth;
using DepVault.Cli.Commands.Pull;
using DepVault.Cli.Commands.Scan;
using DepVault.Cli.Config;
using DepVault.Cli.Output;
using DepVault.Cli.Services;
using DepVault.Cli.Utils;
using Spectre.Console;
using ImportNs = DepVault.Cli.ApiClient.Projects.Item.Environments.Import;

namespace DepVault.Cli.Commands;

public sealed class PushCommands(
    IApiClientFactory clientFactory,
    IAuthContext authContext,
    IConfigService configService,
    IOutputFormatter output,
    IConsolePrompter prompter,
    IFileScanner fileScanner,
    DirectoryVaultGroupMapper dirMapper)
{
    public Command CreatePushCommand()
    {
        return new Command("push", "Push environment variables or secret files")
        {
            CreatePushEnvCommand(),
            CreatePushSecretsCommand()
        };
    }

    private Command CreatePushEnvCommand()
    {
        var projectOpt = new Option<string?>("--project") { Description = "Project ID (defaults to active)" };
        var envOpt = new Option<string?>("--environment")
            { Description = "Environment type (prompts if not set and filename is ambiguous)" };
        var formatOpt = new Option<string>("--format")
            { Description = "Import format", DefaultValueFactory = _ => "env" };
        var fileOpt = new Option<string?>("--file")
            { Description = "Single file to import (auto-discovers if omitted)" };
        var cmd = new Command("env", "Push environment variables from local files")
            { projectOpt, envOpt, formatOpt, fileOpt };

        cmd.SetAction(async (parseResult, cancellationToken) =>
        {
            if (!authContext.RequireAuth())
            {
                return;
            }

            var projectId = CommandUtils.RequireProjectId(parseResult, projectOpt, configService, output);
            if (projectId is null)
            {
                return;
            }

            var selected = ResolveFiles(parseResult.GetValue(fileOpt),
                () => fileScanner.FindEnvFiles(Directory.GetCurrentDirectory()), "environment");
            if (selected.Count == 0)
            {
                return;
            }

            var dirMap = await dirMapper.MapAsync(projectId, selected, cancellationToken);
            if (dirMap is null)
            {
                return;
            }

            AnsiConsole.WriteLine();
            var explicitEnv = parseResult.GetValue(envOpt);
            var hasAmbiguous = selected.Any(f => EnvFileScanner.DetectEnvironmentType(f.FileName) is null);
            var defaultEnvType = hasAmbiguous
                ? CommandUtils.ResolveEnvironmentType(explicitEnv, null, prompter)
                : null;

            var client = clientFactory.Create();
            var totalImported = 0;

            foreach (var file in selected)
            {
                var dir = Path.GetDirectoryName(file.RelativePath)?.Replace('\\', '/') ?? ".";
                if (!dirMap.TryGetValue(dir, out var vaultGroupId))
                {
                    AnsiConsole.MarkupLine($"[grey]Skipped {Markup.Escape(file.RelativePath)} (no vault group)[/]");
                    continue;
                }

                try
                {
                    var content = await File.ReadAllTextAsync(file.FullPath, cancellationToken);
                    var envType = EnvFileScanner.DetectEnvironmentType(file.FileName)
                                  ?? defaultEnvType ?? "DEVELOPMENT";
                    var detectedFormat = EnvFileScanner.DetectEnvFormat(file.FileName);

                    var result = await AnsiConsole.Status()
                        .Spinner(Spinner.Known.Dots)
                        .StartAsync($"Pushing {file.RelativePath}...", async _ =>
                            await client.Projects[projectId].Environments.Import.PostAsync(
                                new ImportNs.ImportPostRequestBody
                                {
                                    Content = content,
                                    VaultGroupId = vaultGroupId,
                                    EnvironmentType = CommandUtils.ParseEnum(envType,
                                        ImportNs.ImportPostRequestBody_environmentType.DEVELOPMENT),
                                    Format = CommandUtils.ParseEnum(detectedFormat,
                                        ImportNs.ImportPostRequestBody_format.Env)
                                }, cancellationToken: cancellationToken));

                    var count = (int)(result?.Imported ?? 0);
                    totalImported += count;
                    output.PrintSuccess($"  {file.RelativePath}: {count} variables");
                }
                catch (Exception ex)
                {
                    output.PrintError($"Failed to push {file.RelativePath}: {ex.Message}");
                }
            }

            AnsiConsole.WriteLine();
            output.PrintSuccess($"Imported {totalImported} variables from {selected.Count} file(s).");
        });

        return cmd;
    }

    private Command CreatePushSecretsCommand()
    {
        var projectOpt = new Option<string?>("--project") { Description = "Project ID (defaults to active)" };
        var envOpt = new Option<string?>("--environment") { Description = "Environment type (prompts if not set)" };
        var fileOpt = new Option<string?>("--file") { Description = "Single file to upload (discovers if omitted)" };
        var cmd = new Command("secrets", "Upload secret files") { projectOpt, envOpt, fileOpt };

        cmd.SetAction(async (parseResult, cancellationToken) =>
        {
            if (!authContext.RequireAuth())
            {
                return;
            }

            var projectId = CommandUtils.RequireProjectId(parseResult, projectOpt, configService, output);
            if (projectId is null)
            {
                return;
            }

            var selected = ResolveFiles(parseResult.GetValue(fileOpt),
                () => fileScanner.FindSecretFiles(Directory.GetCurrentDirectory()), "secret");
            if (selected.Count == 0)
            {
                return;
            }

            var dirMap = await dirMapper.MapAsync(projectId, selected, cancellationToken);
            if (dirMap is null)
            {
                return;
            }

            AnsiConsole.WriteLine();
            var envValue = CommandUtils.ResolveEnvironmentType(
                parseResult.GetValue(envOpt), null, prompter);
            var client = clientFactory.Create();
            var uploaded = 0;

            foreach (var file in selected)
            {
                var dir = Path.GetDirectoryName(file.RelativePath)?.Replace('\\', '/') ?? ".";
                if (!dirMap.TryGetValue(dir, out var vaultGroupId))
                {
                    AnsiConsole.MarkupLine($"[grey]Skipped {Markup.Escape(file.RelativePath)} (no vault group)[/]");
                    continue;
                }

                try
                {
                    await AnsiConsole.Status()
                        .Spinner(Spinner.Known.Dots)
                        .StartAsync($"Uploading {file.RelativePath}...", async _ =>
                            await client.Projects[projectId].Secrets.PostAsync(
                                new SecretsPostRequestBody
                                {
                                    VaultGroupId = vaultGroupId,
                                    EnvironmentType = CommandUtils.ParseEnum(envValue,
                                        SecretsPostRequestBody_environmentType.DEVELOPMENT)
                                }, cancellationToken: cancellationToken));

                    output.PrintSuccess($"  {file.RelativePath}");
                    uploaded++;
                }
                catch (Exception ex)
                {
                    output.PrintError($"Failed to upload {file.RelativePath}: {ex.Message}");
                }
            }

            AnsiConsole.WriteLine();
            output.PrintSuccess($"Uploaded {uploaded} secret file(s).");
        });

        return cmd;
    }

    private List<DiscoveredFile> ResolveFiles(
        string? explicitFile, Func<List<DiscoveredFile>> discover, string fileTypeLabel)
    {
        if (!string.IsNullOrEmpty(explicitFile))
        {
            if (!CommandUtils.RequireFile(explicitFile, output))
            {
                return [];
            }

            var relativePath = Path.GetRelativePath(Directory.GetCurrentDirectory(), explicitFile);
            return
            [
                new DiscoveredFile(explicitFile, relativePath, Path.GetFileName(explicitFile), FileCategory.Environment)
            ];
        }

        if (!prompter.IsInteractive)
        {
            output.PrintError("--file is required in non-interactive mode.");
            return [];
        }

        var discovered = discover();
        if (discovered.Count == 0)
        {
            output.PrintError($"No {fileTypeLabel} files found in current directory.");
            return [];
        }

        return prompter.MultiSelect($"Select {fileTypeLabel} files to push", discovered, f => f.RelativePath, false);
    }
}
