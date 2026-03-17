using DepVault.Cli.Auth;
using DepVault.Cli.Output;
using DepVault.Cli.Services;
using DepVault.Cli.Utils;
using Spectre.Console;
using SecretNs = DepVault.Cli.ApiClient.Api.Projects.Item.Secrets;

namespace DepVault.Cli.Commands.Scan;

internal sealed class SecretFileScanner(
    IApiClientFactory clientFactory,
    IOutputFormatter output,
    IConsolePrompter prompter,
    IFileScanner fileScanner)
{
    public async Task RunAsync(string projectId, string repoPath, ScanResults results, CancellationToken ct)
    {
        var files = fileScanner.FindSecretFiles(repoPath);
        if (files.Count == 0)
        {
            AnsiConsole.MarkupLine("[grey]No secret files found.[/]");
            return;
        }

        PrintFileTree(files);

        var selected = prompter.MultiSelect(
            "Select files to upload (none selected by default)", files, f => f.RelativePath, false);

        if (selected.Count == 0)
        {
            AnsiConsole.MarkupLine("[grey]Skipped secret file upload.[/]");
            return;
        }

        var envType = CommandUtils.ResolveEnvironmentType(null, null, prompter);
        var client = clientFactory.Create();

        foreach (var file in selected)
        {
            try
            {
                var fileBytes = await File.ReadAllBytesAsync(file.FullPath, ct);

                await AnsiConsole.Status()
                    .Spinner(Spinner.Known.Dots)
                    .StartAsync($"Uploading {file.RelativePath}...", async _ =>
                        await client.Api.Projects[projectId].Secrets.PostAsync(new SecretNs.SecretsPostRequestBody
                        {
                            File = fileBytes,
                            Description = file.FileName,
                            EnvironmentType = CommandUtils.ParseEnum(envType,
                                SecretNs.SecretsPostRequestBody_environmentType.DEVELOPMENT)
                        }, cancellationToken: ct));

                results.SecretFilesUploaded++;
                output.PrintSuccess($"Uploaded {file.RelativePath}");
            }
            catch (Exception ex)
            {
                ApiErrorHandler.HandleError(ex, $"Failed to upload {file.RelativePath}");
            }
        }
    }

    private static void PrintFileTree(List<DiscoveredFile> files)
    {
        var tree = new Tree($"[cyan1]Found {files.Count} secret file(s)[/]");
        foreach (var f in files)
        {
            var size = new FileInfo(f.FullPath).Length;
            var sizeStr = size < 1024 ? $"{size} B" : $"{size / 1024.0:F1} KB";
            tree.AddNode($"[white]{Markup.Escape(f.RelativePath)}[/] [grey]({sizeStr})[/]");
        }

        AnsiConsole.Write(tree);
        AnsiConsole.WriteLine();
    }
}
