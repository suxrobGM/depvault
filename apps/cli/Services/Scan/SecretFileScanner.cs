using DepVault.Cli.Output;
using DepVault.Cli.Services;
using Spectre.Console;

namespace DepVault.Cli.Services.Scan;

/// <summary>
/// Uploads secret files to a project as encrypted blobs. Each file is encrypted client-side
/// (AES-256-GCM) with the project DEK before upload — the server is zero-knowledge and only ever
/// stores ciphertext. App + environment are inferred from the file's location and name.
/// </summary>
internal sealed class SecretFileScanner(
    IOutputFormatter output,
    IConsolePrompter prompter,
    IFileScanner fileScanner,
    RepoFileUploadService uploadService,
    IErrorHandler errorHandler)
{
    /// <summary>
    /// Discovers and (after selection) uploads secret files. The DEK is supplied lazily so the
    /// vault password is collected at most once per scan, and only when the user actually selects
    /// files to upload.
    /// </summary>
    public async Task RunAsync(
        string projectId, string repoPath, ScanResults results,
        Lazy<Task<byte[]?>> dek, CancellationToken ct)
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

        var key = await dek.Value;
        if (key is null)
        {
            return;
        }

        foreach (var file in selected)
        {
            try
            {
                await uploadService.UploadAsync(projectId, repoPath, file, key, ct);
                results.SecretFilesUploaded++;
                output.PrintSuccess($"Uploaded {file.RelativePath}");
            }
            catch (Exception ex)
            {
                if (errorHandler.Handle(ex, $"Failed to upload {file.RelativePath}") == ErrorDisposition.Abort)
                {
                    break;
                }
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
