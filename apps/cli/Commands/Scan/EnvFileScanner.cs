using DepVault.Cli.Auth;
using DepVault.Cli.Commands.Pull;
using DepVault.Cli.Output;
using DepVault.Cli.Services;
using DepVault.Cli.Utils;
using Spectre.Console;
using ImportNs = DepVault.Cli.ApiClient.Projects.Item.Environments.Import;

namespace DepVault.Cli.Commands.Scan;

internal sealed class EnvFileScanner(
    IApiClientFactory clientFactory,
    IOutputFormatter output,
    IConsolePrompter prompter,
    IFileScanner fileScanner,
    DirectoryVaultGroupMapper dirMapper)
{
    public async Task RunAsync(string projectId, string repoPath, ScanResults results, CancellationToken ct)
    {
        var files = fileScanner.FindEnvFiles(repoPath);
        if (files.Count == 0)
        {
            AnsiConsole.MarkupLine("[grey]No environment files found.[/]");
            return;
        }

        PrintFileTree(files);

        AnsiConsole.MarkupLine("[yellow]Warning: These files may contain sensitive data. Review before pushing.[/]");
        AnsiConsole.WriteLine();

        var selected = prompter.MultiSelect(
            "Select files to push (none selected by default)", files, f => f.RelativePath, false);

        if (selected.Count == 0)
        {
            AnsiConsole.MarkupLine("[grey]Skipped environment file push.[/]");
            return;
        }

        var dirVaultGroupMap = await dirMapper.MapAsync(projectId, selected, ct);
        if (dirVaultGroupMap is null)
        {
            return;
        }

        AnsiConsole.WriteLine();
        await PushFilesAsync(projectId, selected, dirVaultGroupMap, results, ct);
    }

    private async Task PushFilesAsync(
        string projectId, List<DiscoveredFile> files,
        Dictionary<string, string> dirVaultGroupMap, ScanResults results, CancellationToken ct)
    {
        var client = clientFactory.Create();

        // Prompt once for ambiguous files instead of per-file
        var hasAmbiguous = files.Any(f => DetectEnvironmentType(f.FileName) is null);
        string? defaultEnvType = null;
        if (hasAmbiguous)
        {
            defaultEnvType = CommandUtils.ResolveEnvironmentType(null, null, prompter);
        }

        foreach (var file in files)
        {
            var dir = Path.GetDirectoryName(file.RelativePath)?.Replace('\\', '/') ?? ".";
            if (!dirVaultGroupMap.TryGetValue(dir, out var vaultGroupId))
            {
                AnsiConsole.MarkupLine($"[grey]Skipped {Markup.Escape(file.RelativePath)} (no vault group)[/]");
                continue;
            }

            var envType = DetectEnvironmentType(file.FileName) ?? defaultEnvType ?? "DEVELOPMENT";
            var format = DetectEnvFormat(file.FileName);

            try
            {
                var content = await File.ReadAllTextAsync(file.FullPath, ct);

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
                                Format = CommandUtils.ParseEnum(format, ImportNs.ImportPostRequestBody_format.Env)
                            }, cancellationToken: ct));

                results.EnvVariablesPushed += (int)(result?.Imported ?? 0);
                output.PrintSuccess($"Imported {(int)(result?.Imported ?? 0)} variables from {file.RelativePath}");
            }
            catch (Exception ex)
            {
                ApiErrorHandler.HandleError(ex, $"Failed to push {file.RelativePath}");
            }
        }
    }

    private static void PrintFileTree(List<DiscoveredFile> files)
    {
        var tree = new Tree($"[cyan1]Found {files.Count} environment file(s)[/]");
        foreach (var f in files)
        {
            tree.AddNode($"[white]{Markup.Escape(f.RelativePath)}[/]");
        }

        AnsiConsole.Write(tree);
        AnsiConsole.WriteLine();
    }

    /// <summary>
    ///     Infers environment type from filename. Returns null if the filename
    ///     gives no hint (e.g. plain ".env").
    /// </summary>
    internal static string? DetectEnvironmentType(string fileName)
    {
        var segments = fileName.ToLowerInvariant().Split(['.', '-', '_']);

        foreach (var segment in segments)
        {
            switch (segment)
            {
                case "production" or "prod":
                    return "PRODUCTION";
                case "staging" or "stage":
                    return "STAGING";
                case "development" or "dev":
                    return "DEVELOPMENT";
            }
        }

        return null;
    }

    internal static string DetectEnvFormat(string fileName)
    {
        if (fileName.EndsWith(".json", StringComparison.OrdinalIgnoreCase))
        {
            return "appsettings.json";
        }

        if (fileName.EndsWith(".yaml", StringComparison.OrdinalIgnoreCase) ||
            fileName.EndsWith(".yml", StringComparison.OrdinalIgnoreCase))
        {
            return "secrets.yaml";
        }

        if (fileName.EndsWith(".toml", StringComparison.OrdinalIgnoreCase))
        {
            return "config.toml";
        }

        return "env";
    }
}
