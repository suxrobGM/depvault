using DepVault.Cli.Output;
using DepVault.Cli.Services;
using DepVault.Cli.Utils;
using Spectre.Console;

namespace DepVault.Cli.Commands.Scan;

/// <summary>
/// Uploads environment/config files to a project as encrypted blobs. Each file is encrypted
/// client-side (AES-256-GCM) with the project DEK before upload — the server is zero-knowledge and
/// only ever stores ciphertext. App + environment are inferred from the file's location and name.
/// </summary>
internal sealed class EnvFileScanner(
    IOutputFormatter output,
    IConsolePrompter prompter,
    IFileScanner fileScanner,
    RepoFileUploadService uploadService)
{
    /// <summary>
    /// Discovers and (after selection) uploads env/config files. The DEK is supplied lazily so the
    /// vault password is collected at most once per scan, and only when the user actually selects
    /// files to push.
    /// </summary>
    public async Task RunAsync(
        string projectId, string repoPath, ScanResults results,
        Lazy<Task<byte[]?>> dek, CancellationToken ct)
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

        var key = await dek.Value;
        if (key is null)
        {
            return;
        }

        AnsiConsole.WriteLine();

        foreach (var file in selected)
        {
            try
            {
                await uploadService.UploadAsync(projectId, repoPath, file, key, ct);
                results.ConfigFilesPushed++;
                output.PrintSuccess($"Pushed {file.RelativePath}");
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
}
