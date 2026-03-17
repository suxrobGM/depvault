using System.CommandLine;
using DepVault.Cli.Auth;
using DepVault.Cli.Commands.Pull;
using DepVault.Cli.Commands.Push;
using DepVault.Cli.Commands.Scan;
using DepVault.Cli.Config;
using DepVault.Cli.Output;
using DepVault.Cli.Services;
using DepVault.Cli.Utils;
using Spectre.Console;
using ImportNs = DepVault.Cli.ApiClient.Api.Projects.Item.Environments.Import;

namespace DepVault.Cli.Commands;

internal sealed class PushCommands(
    IApiClientFactory clientFactory,
    IAuthContext authContext,
    IConfigService configService,
    IOutputFormatter output,
    IConsolePrompter prompter,
    IFileScanner fileScanner,
    DirectoryVaultGroupMapper dirMapper,
    FileEnvironmentAssigner envAssigner,
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
            if (!authContext.RequireAuth())
            {
                return;
            }

            var projectId = CommandUtils.RequireProjectId(parseResult, projectOpt, configService, output);
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

            var client = clientFactory.Create();
            var envImported = 0;
            var secretsUploaded = 0;
            var format = parseResult.GetValue(formatOpt) ?? "env";

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
                        envImported += await PushEnvFileAsync(
                            client, projectId, file, vaultGroupId, envType, format, ct);
                    }
                    else
                    {
                        await PushSecretFileAsync(
                            projectId, file, vaultGroupId, envType, ct);
                        secretsUploaded++;
                    }
                }
                catch (Exception ex)
                {
                    ApiErrorHandler.HandleError(ex, $"Failed to push {file.RelativePath}");
                }
            }

            AnsiConsole.WriteLine();
            output.PrintSuccess(
                $"Imported {envImported} variables from env files, uploaded {secretsUploaded} secret file(s).");
        });

        return cmd;
    }

    private async Task<int> PushEnvFileAsync(
        ApiClient.ApiClient client, string projectId, DiscoveredFile file,
        string vaultGroupId, string envType, string format, CancellationToken ct)
    {
        var content = await File.ReadAllTextAsync(file.FullPath, ct);
        var detectedFormat = EnvFileScanner.DetectEnvFormat(file.FileName);

        var result = await AnsiConsole.Status()
            .Spinner(Spinner.Known.Dots)
            .StartAsync($"Pushing {file.RelativePath}...", async _ =>
                await client.Api.Projects[projectId].Environments.Import.PostAsync(
                    new ImportNs.ImportPostRequestBody
                    {
                        Content = content,
                        VaultGroupId = vaultGroupId,
                        EnvironmentType = CommandUtils.ParseEnum(envType,
                            ImportNs.ImportPostRequestBody_environmentType.DEVELOPMENT),
                        Format = CommandUtils.ParseEnum(detectedFormat,
                            ImportNs.ImportPostRequestBody_format.Env)
                    }, cancellationToken: ct));

        var count = (int)(result?.Imported ?? 0);
        output.PrintSuccess($"  {file.RelativePath}: {count} variables ({envType})");
        return count;
    }

    private async Task PushSecretFileAsync(
        string projectId, DiscoveredFile file,
        string vaultGroupId, string envType, CancellationToken ct)
    {
        await secretFileScanner.UploadAsync(projectId, file, envType, vaultGroupId, ct);
        output.PrintSuccess($"  {file.RelativePath} ({envType})");
    }

    private List<DiscoveredFile> ResolveFiles(string? explicitFile)
    {
        if (!string.IsNullOrEmpty(explicitFile))
        {
            if (!CommandUtils.RequireFile(explicitFile, output))
            {
                return [];
            }

            var fullPath = Path.GetFullPath(explicitFile);
            var relativePath = Path.GetRelativePath(Directory.GetCurrentDirectory(), fullPath);
            var fileName = Path.GetFileName(fullPath);
            var category = fileScanner.ClassifyFile(fileName);
            return [new DiscoveredFile(fullPath, relativePath, fileName, category)];
        }

        if (!prompter.IsInteractive)
        {
            output.PrintError("--file is required in non-interactive mode.");
            return [];
        }

        var discovered = fileScanner.FindAllPushableFiles(Directory.GetCurrentDirectory());
        if (discovered.Count == 0)
        {
            output.PrintError("No environment or secret files found in current directory.");
            return [];
        }

        return prompter.MultiSelect("Select files to push", discovered,
            f => $"[grey]{(f.Category == FileCategory.Environment ? "env" : "secret")}[/] {Markup.Escape(f.RelativePath)}",
            false);
    }

}
