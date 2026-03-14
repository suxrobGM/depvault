using System.CommandLine;
using DepVault.Cli.Auth;
using DepVault.Cli.Commands.Scan;
using DepVault.Cli.Output;
using Spectre.Console;

namespace DepVault.Cli.Commands;

internal sealed class ScanCommands(
    IAuthContext authContext,
    IConsolePrompter prompter,
    IOutputFormatter output,
    ProjectResolver projectResolver,
    DependencyScanner dependencyScanner,
    EnvFileScanner envFileScanner,
    SecretLeakScanner secretLeakScanner,
    SecretFileScanner secretFileScanner)
{
    public Command CreateScanCommand()
    {
        var pathOpt = new Option<string?>("--path")
            { Description = "Repository root path (defaults to current directory)" };
        var projectOpt = new Option<string?>("--project") { Description = "Project ID" };

        var cmd = new Command("scan", "Scan repository for dependencies, env files, and secrets")
        {
            pathOpt,
            projectOpt
        };

        cmd.SetAction(async (parseResult, cancellationToken) =>
        {
            if (!authContext.RequireAuth())
            {
                return;
            }

            if (!prompter.IsInteractive)
            {
                output.PrintError(
                    "The scan command requires interactive mode. Use individual commands (analyze, env push) for non-interactive usage.");
                return;
            }

            ConsoleTheme.PrintBanner();
            var repoPath = Path.GetFullPath(parseResult.GetValue(pathOpt) ?? Directory.GetCurrentDirectory());

            if (!Directory.Exists(repoPath))
            {
                output.PrintError($"Directory not found: {repoPath}");
                return;
            }

            AnsiConsole.MarkupLine($"[cyan1]Scanning:[/] {Markup.Escape(repoPath)}");
            AnsiConsole.WriteLine();

            var projectId = await projectResolver.ResolveAsync(
                parseResult.GetValue(projectOpt), repoPath, cancellationToken);
            if (projectId is null)
            {
                return;
            }

            var results = new ScanResults();

            ConsoleTheme.PrintRule("Dependency Analysis");
            await dependencyScanner.RunAsync(projectId, repoPath, results, cancellationToken);

            AnsiConsole.WriteLine();
            ConsoleTheme.PrintRule("Environment Files");
            await envFileScanner.RunAsync(projectId, repoPath, results, cancellationToken);

            AnsiConsole.WriteLine();
            ConsoleTheme.PrintRule("Secret Leak Detection");
            secretLeakScanner.Run(repoPath, results);

            AnsiConsole.WriteLine();
            ConsoleTheme.PrintRule("Secret Files");
            await secretFileScanner.RunAsync(projectId, repoPath, results, cancellationToken);

            AnsiConsole.WriteLine();
            ScanSummary.Print(results);
        });

        return cmd;
    }
}
