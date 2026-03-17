using System.Net.Http.Headers;
using DepVault.Cli.Config;
using DepVault.Cli.Output;
using DepVault.Cli.Services;
using DepVault.Cli.Utils;
using Spectre.Console;

namespace DepVault.Cli.Commands.Scan;

internal sealed class SecretFileScanner(
    IOutputFormatter output,
    IConsolePrompter prompter,
    IFileScanner fileScanner,
    IConfigService configService,
    ICredentialStore credentialStore)
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

        foreach (var file in selected)
        {
            try
            {
                await UploadAsync(projectId, file, envType, null, ct);
                results.SecretFilesUploaded++;
                output.PrintSuccess($"Uploaded {file.RelativePath}");
            }
            catch (Exception ex)
            {
                ApiErrorHandler.HandleError(ex, $"Failed to upload {file.RelativePath}");
            }
        }
    }

    /// <summary>Uploads a single secret file via multipart/form-data.</summary>
    public async Task UploadAsync(
        string projectId, DiscoveredFile file, string envType,
        string? vaultGroupId, CancellationToken ct)
    {
        var fileBytes = await File.ReadAllBytesAsync(file.FullPath, ct);
        var baseUrl = configService.Load().Server.TrimEnd('/');

        using var content = new MultipartFormDataContent();
        content.Add(new ByteArrayContent(fileBytes), "file", file.FileName);
        content.Add(new StringContent(envType), "environmentType");
        content.Add(new StringContent(file.FileName), "description");

        if (vaultGroupId is not null)
        {
            content.Add(new StringContent(vaultGroupId), "vaultGroupId");
        }

        using var http = new HttpClient();
        var creds = credentialStore.Load();

        if (creds?.AccessToken is not null)
        {
            http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", creds.AccessToken);
        }

        await AnsiConsole.Status()
            .Spinner(Spinner.Known.Dots)
            .StartAsync($"Uploading {file.RelativePath}...", async _ =>
            {
                var response = await http.PostAsync(
                    $"{baseUrl}/api/projects/{projectId}/secrets", content, ct);
                response.EnsureSuccessStatusCode();
            });
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
