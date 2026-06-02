using System.CommandLine;
using DepVault.Cli.Crypto;
using DepVault.Cli.Output;
using DepVault.Cli.Services;
using DepVault.Cli.Auth;
using DepVault.Cli.Common;
using Spectre.Console;

namespace DepVault.Cli.Commands;

/// <summary>
/// Pushes whole config and secret files to a project as client-encrypted blobs. Each file is read,
/// encrypted with the project DEK (AES-256-GCM), and uploaded verbatim — no parsing into entries and
/// no stale-variable pruning. App ownership and environment slug are inferred from the file path.
/// </summary>
internal sealed class PushCommands(
    AuthContext ctx,
    IFileScanner fileScanner,
    DekService dekService,
    RepoFileUploadService uploadService,
    IRepositoryLocator repositoryLocator,
    IProjectContextResolver projectContextResolver,
    IErrorHandler errorHandler,
    IFileArgResolver fileArgResolver,
    ConsoleRenderer renderer)
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
            if (!ctx.RequireAuth())
            {
                Environment.ExitCode = 1;
                return;
            }

            var explicitId = parseResult.GetValue(projectOpt);
            var resolution = await projectContextResolver.ResolveAsync(
                explicitId, ResolutionPolicy.Interactive, ct);
            if (resolution is null || !ProjectGuard.ConfirmOverride(ctx, explicitId))
            {
                Environment.ExitCode = 1;
                return;
            }

            renderer.PrintStatusLine();
            var projectId = resolution.ProjectId;

            var selected = ResolveFiles(parseResult.GetValue(fileOpt));
            if (selected.Count == 0)
            {
                Environment.ExitCode = 1;
                return;
            }

            // Preview the manifest (no file bytes read) and confirm before any crypto. CI mode
            // auto-confirms because Confirm returns its default in non-interactive mode.
            var repoRoot = repositoryLocator.FindRepoRoot();
            PrintManifest(selected, repoRoot);
            if (!ctx.Prompter.Confirm($"Push {selected.Count} file(s)?"))
            {
                return;
            }

            // Resolve the project DEK once up front. The same key encrypts every file, so this
            // prompts for the vault password (or reads DEPVAULT_PASSWORD / a CI token) at most once.
            var dek = await dekService.CollectPasswordAndResolveAsync(projectId, ct);
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
                    await uploadService.UploadAsync(projectId, repoRoot, file, dek, ct);
                    if (file.Category == FileCategory.Environment)
                    {
                        configPushed++;
                    }
                    else
                    {
                        secretsPushed++;
                    }

                    ctx.Output.PrintSuccess($"  {file.RelativePath}");
                }
                catch (Exception ex)
                {
                    if (errorHandler.Handle(ex, $"Failed to push {file.RelativePath}") == ErrorDisposition.Abort)
                    {
                        Environment.ExitCode = 1;
                        break;
                    }
                }
            }

            AnsiConsole.WriteLine();
            ctx.Output.PrintSuccess(
                $"Pushed {configPushed} config file(s) and {secretsPushed} secret file(s).");
        });

        return cmd;
    }

    /// <summary>
    /// Renders the push manifest (file, app, env, size, kind) without reading file contents.
    /// App and environment are resolved with the pure path helpers; size comes from file metadata.
    /// </summary>
    private void PrintManifest(List<DiscoveredFile> files, string repoRoot)
    {
        var rows = files.Select(f =>
        {
            var (_, appName) = AppRootResolver.Resolve(repoRoot, f.RelativePath);
            long size;
            try
            {
                size = new FileInfo(f.FullPath).Length;
            }
            catch
            {
                size = 0;
            }

            return new[]
            {
                f.RelativePath,
                appName,
                EnvSlugResolver.Resolve(f.FileName),
                FormatUtils.FileSize(size),
                f.Category == FileCategory.Environment ? "config" : "secret"
            };
        }).ToList();

        ctx.Output.PrintTable(["FILE", "APP", "ENV", "SIZE", "KIND"], rows);
    }

    private List<DiscoveredFile> ResolveFiles(string? explicitFile)
    {
        if (!string.IsNullOrEmpty(explicitFile))
        {
            if (!fileArgResolver.RequireFile(explicitFile))
            {
                return [];
            }

            var fullPath = Path.GetFullPath(explicitFile);
            var relativePath = Path.GetRelativePath(repositoryLocator.FindRepoRoot(), fullPath).Replace('\\', '/');
            var fileName = Path.GetFileName(fullPath);
            var category = fileScanner.ClassifyFile(fileName);
            return [new DiscoveredFile(fullPath, relativePath, fileName, category)];
        }

        if (!ctx.Prompter.IsInteractive)
        {
            ctx.Output.PrintError("--file is required in non-interactive mode.");
            return [];
        }

        var discovered = fileScanner.FindAllPushableFiles(repositoryLocator.FindRepoRoot());
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
