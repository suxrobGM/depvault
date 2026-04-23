using System.Net.Http.Headers;
using System.Text;
using DepVault.Cli.Commands.Push;
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
    DirectoryVaultMapper vaultMapper)
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

        var dirMap = await vaultMapper.MapAsync(projectId, selected, null, false, ct);
        if (dirMap is null)
        {
            return;
        }

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
                await UploadAsync(projectId, file, vaultId, ct);
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
        string projectId, DiscoveredFile file,
        string vaultId, CancellationToken ct)
    {
        var fileBytes = await File.ReadAllBytesAsync(file.FullPath, ct);
        var baseUrl = configService.Load().Server.TrimEnd('/');

        using var body = BuildMultipartBody(fileBytes, file.FileName, vaultId);
        var http = GetHttpClient();

        await AnsiConsole.Status()
            .Spinner(Spinner.Known.Dots)
            .StartAsync($"Uploading {file.RelativePath}...", async _ =>
            {
                var response = await http.PostAsync(
                    $"{baseUrl}/api/projects/{projectId}/secrets", body, ct);
                response.EnsureSuccessStatusCode();
            });
    }

    /// <summary>
    /// Builds multipart/form-data manually to match browser format.
    /// .NET's MultipartFormDataContent serializes headers in an order
    /// that Bun's parser doesn't recognize as a file upload.
    /// </summary>
    private static ByteArrayContent BuildMultipartBody(
        byte[] fileBytes, string fileName, string vaultId)
    {
        var boundary = "----FormBoundary" + Guid.NewGuid().ToString("N")[..16];
        using var ms = new MemoryStream();

        // File part — Content-Disposition must come before Content-Type
        WritePart(ms, boundary);
        WriteUtf8(ms, $"Content-Disposition: form-data; name=\"file\"; filename=\"{fileName}\"\r\n");
        WriteUtf8(ms, $"Content-Type: {GetMimeType(fileName)}\r\n");
        WriteUtf8(ms, "\r\n");
        ms.Write(fileBytes);
        WriteUtf8(ms, "\r\n");

        WriteTextField(ms, boundary, "vaultId", vaultId);
        WriteTextField(ms, boundary, "description", fileName);

        WriteUtf8(ms, $"--{boundary}--\r\n");

        var content = new ByteArrayContent(ms.ToArray());
        content.Headers.ContentType = MediaTypeHeaderValue.Parse($"multipart/form-data; boundary={boundary}");
        return content;
    }

    private static void WritePart(MemoryStream ms, string boundary)
        => WriteUtf8(ms, $"--{boundary}\r\n");

    private static void WriteTextField(MemoryStream ms, string boundary, string name, string value)
    {
        WritePart(ms, boundary);
        WriteUtf8(ms, $"Content-Disposition: form-data; name=\"{name}\"\r\n");
        WriteUtf8(ms, "\r\n");
        WriteUtf8(ms, $"{value}\r\n");
    }

    private static void WriteUtf8(MemoryStream ms, string value)
        => ms.Write(Encoding.UTF8.GetBytes(value));

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

    private static string GetMimeType(string fileName)
    {
        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        return ext switch
        {
            ".json" => "application/json",
            ".plist" => "application/xml",
            ".yaml" or ".yml" => "application/x-yaml",
            ".pem" or ".key" => "application/x-pem-file",
            ".p12" or ".pfx" => "application/x-pkcs12",
            ".jks" or ".keystore" => "application/x-java-keystore",
            _ => "application/octet-stream"
        };
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
