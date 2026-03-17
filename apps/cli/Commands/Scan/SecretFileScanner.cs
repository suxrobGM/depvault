using System.Net.Http.Headers;
using DepVault.Cli.Commands.Pull;
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
    ICredentialStore credentialStore,
    DirectoryVaultGroupMapper dirMapper)
{
    private HttpClient? httpClient;

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

        var dirMap = await dirMapper.MapAsync(projectId, selected, ct);
        if (dirMap is null)
        {
            return;
        }

        var envType = prompter.IsInteractive
            ? prompter.Select("Select environment type", CommandUtils.EnvironmentTypes, e => e)
            : "DEVELOPMENT";

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
                await UploadAsync(projectId, file, envType, vaultGroupId, ct);
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
        string vaultGroupId, CancellationToken ct)
    {
        var fileBytes = await File.ReadAllBytesAsync(file.FullPath, ct);
        var baseUrl = configService.Load().Server.TrimEnd('/');

        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(fileBytes);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");
        content.Add(fileContent, "file", file.FileName);
        content.Add(new StringContent(envType), "environmentType");
        content.Add(new StringContent(vaultGroupId), "vaultGroupId");
        content.Add(new StringContent(file.FileName), "description");

        var http = GetHttpClient();

        await AnsiConsole.Status()
            .Spinner(Spinner.Known.Dots)
            .StartAsync($"Uploading {file.RelativePath}...", async _ =>
            {
                var response = await http.PostAsync(
                    $"{baseUrl}/api/projects/{projectId}/secrets", content, ct);
                response.EnsureSuccessStatusCode();
            });
    }

    private HttpClient GetHttpClient()
    {
        if (httpClient is not null)
        {
            return httpClient;
        }

        httpClient = new HttpClient();
        var creds = credentialStore.Load();

        if (creds?.AccessToken is not null)
        {
            httpClient.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", creds.AccessToken);
        }

        return httpClient;
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
