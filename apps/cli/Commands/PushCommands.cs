using System.CommandLine;
using DepVault.Cli.Commands.Push;
using DepVault.Cli.Crypto;
using DepVault.Cli.Services;
using DepVault.Cli.Utils;
using Spectre.Console;

namespace DepVault.Cli.Commands;

/// <summary>
/// Pushes whole config and secret files to a project as client-encrypted blobs. Each file is read,
/// encrypted with the project DEK (AES-256-GCM), and uploaded verbatim — no parsing into entries and
/// no stale-variable pruning. App ownership and environment slug are inferred from the file path.
/// </summary>
internal sealed class PushCommands(
    CommandContext ctx,
    IFileScanner fileScanner,
    DekResolver dekResolver,
    ConfigFilePusher configFilePusher,
    SecretFilePusher secretFilePusher)
{
    public Command CreatePushCommand()
    {
        var projectOpt = new Option<string?>("--project") { Description = "Project ID (defaults to active)" };
        var fileOpt = new Option<string?>("--file")
        { Description = "Single file to push (auto-discovers if omitted)" };

        var cmd = new Command("push", "Push config and secret files as encrypted blobs")
            { projectOpt, fileOpt };

        cmd.SetAction(async (parseResult, ct) =>
        {
            var pc = await ctx.RequireProjectContextAsync(parseResult, projectOpt, ct);
            if (pc is null)
            {
                Environment.ExitCode = 1;
                return;
            }

            var selected = ResolveFiles(parseResult.GetValue(fileOpt));
            if (selected.Count == 0)
            {
                Environment.ExitCode = 1;
                return;
            }

            // Resolve the project DEK once up front. The same key encrypts every file, so this
            // prompts for the vault password (or reads DEPVAULT_PASSWORD / a CI token) at most once.
            var dek = await ResolveDekAsync(pc.ProjectId, ct);
            if (dek is null)
            {
                ctx.Output.PrintError("Failed to resolve encryption key. Aborting push.");
                Environment.ExitCode = 1;
                return;
            }

            var configPushed = 0;
            var secretsPushed = 0;

            foreach (var file in selected)
            {
                try
                {
                    if (file.Category == FileCategory.Environment)
                    {
                        await configFilePusher.PushAsync(pc.ProjectId, file, dek, ct);
                        configPushed++;
                    }
                    else
                    {
                        await secretFilePusher.PushAsync(pc.ProjectId, file, dek, ct);
                        secretsPushed++;
                    }

                    ctx.Output.PrintSuccess($"  {file.RelativePath}");
                }
                catch (Exception ex)
                {
                    ApiErrorHandler.HandleError(ex, $"Failed to push {file.RelativePath}");
                }
            }

            AnsiConsole.WriteLine();
            ctx.Output.PrintSuccess(
                $"Pushed {configPushed} config file(s) and {secretsPushed} secret file(s).");
        });

        return cmd;
    }

    /// <summary>Resolves the project DEK once for the push, reusing the cached KEK/DEK when present.</summary>
    private async Task<byte[]?> ResolveDekAsync(string projectId, CancellationToken ct)
    {
        var password = dekResolver.CollectVaultPassword();
        return await AnsiConsole.Status()
            .Spinner(Spinner.Known.Dots)
            .StartAsync("Resolving encryption key...", async _ =>
                await dekResolver.ResolveAsync(projectId, password, ct));
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
            var relativePath = Path.GetRelativePath(GitUtils.FindRepoRoot(), fullPath).Replace('\\', '/');
            var fileName = Path.GetFileName(fullPath);
            var category = fileScanner.ClassifyFile(fileName);
            return [new DiscoveredFile(fullPath, relativePath, fileName, category)];
        }

        if (!ctx.Prompter.IsInteractive)
        {
            ctx.Output.PrintError("--file is required in non-interactive mode.");
            return [];
        }

        var discovered = fileScanner.FindAllPushableFiles(GitUtils.FindRepoRoot());
        if (discovered.Count == 0)
        {
            ctx.Output.PrintError("No config or secret files found in repository.");
            return [];
        }

        // Default to all files selected so "push everything" is one keystroke; deselect to skip.
        return ctx.Prompter.MultiSelect("Select files to push", discovered,
            f => $"[grey]{(f.Category == FileCategory.Environment ? "config" : "secret")}[/] {Markup.Escape(f.RelativePath)}");
    }
}
