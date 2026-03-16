using System.CommandLine;
using DepVault.Cli.ApiClient.Projects.Item.Analyses;
using DepVault.Cli.Auth;
using DepVault.Cli.Config;
using DepVault.Cli.Output;
using DepVault.Cli.Services;
using DepVault.Cli.Utils;
using Spectre.Console;

namespace DepVault.Cli.Commands;

public sealed class AnalysisCommands(
    IAuthContext authContext,
    IConfigService configService,
    IOutputFormatter output,
    IConsolePrompter prompter,
    IFileScanner fileScanner,
    AnalysisClient analysisClient)
{
    public Command CreateAnalyzeCommand()
    {
        var fileOpt = new Option<string?>("--file")
        { Description = "Path to dependency file (auto-detected if omitted)" };
        var projectOpt = new Option<string?>("--project") { Description = "Project ID" };
        var ecosystemOpt = new Option<string?>("--ecosystem")
        { Description = "Ecosystem (auto-detected from filename)" };
        var outputOpt = new Option<string>("--output")
        { Description = "Output format (table, json)", DefaultValueFactory = _ => "table" };

        var cmd = new Command("analyze", "Upload and analyze a dependency file")
            { fileOpt, projectOpt, ecosystemOpt, outputOpt };

        cmd.SetAction(async (parseResult, cancellationToken) =>
        {
            if (!authContext.RequireAuth())
            {
                return;
            }

            var projectId = CommandUtils.RequireProjectId(parseResult, projectOpt, configService, output);
            if (projectId is null)
            {
                return;
            }

            var filePath = CommandUtils.ResolveFileInteractive(
                parseResult, fileOpt, prompter, output,
                () => fileScanner.FindDependencyFiles(Directory.GetCurrentDirectory()),
                "dependency");

            if (filePath is null)
            {
                return;
            }

            var ecosystem = ResolveEcosystem(filePath, parseResult.GetValue(ecosystemOpt));
            if (ecosystem is null)
            {
                return;
            }

            try
            {
                var content = await File.ReadAllTextAsync(filePath, cancellationToken);
                var fileName = Path.GetFileName(filePath);

                var result = await AnsiConsole.Status()
                    .Spinner(Spinner.Known.Dots)
                    .StartAsync($"Analyzing {fileName} ({ecosystem})...", async _ =>
                        await analysisClient.AnalyzeFileAsync(projectId, fileName, content, ecosystem,
                            cancellationToken));

                if (result is null)
                {
                    output.PrintError("Analysis returned no results.");
                    return;
                }

                output.PrintSuccess($"Analysis complete. Health score: {result.HealthScore:F0}");
                PrintDependencies(result.Dependencies, parseResult.GetValue(outputOpt));
            }
            catch (Exception ex)
            {
                ApiErrorHandler.HandleError(ex, "Analysis failed");
            }
        });

        return cmd;
    }

    private AnalysesPostRequestBody_ecosystem? ResolveEcosystem(string filePath, string? explicitEcosystem)
    {
        var fileName = Path.GetFileName(filePath);

        if (!string.IsNullOrEmpty(explicitEcosystem))
        {
            if (Enum.TryParse<AnalysesPostRequestBody_ecosystem>(explicitEcosystem, true, out var parsed))
            {
                return parsed;
            }

            output.PrintError(
                $"Unknown ecosystem: '{explicitEcosystem}'. Valid: NODEJS, PYTHON, DOTNET, RUST, GO, KOTLIN, JAVA, RUBY, PHP");
            return null;
        }

        var ecosystem = EcosystemResolver.Resolve(fileName);
        if (ecosystem is null)
        {
            output.PrintError($"Cannot detect ecosystem for '{fileName}'. Use --ecosystem.");
        }

        return ecosystem;
    }

    private void PrintDependencies(List<AnalysesPostResponse_dependencies> deps, string? outputFmt)
    {
        if (deps.Count == 0)
        {
            AnsiConsole.MarkupLine("[grey]No dependencies found.[/]");
            return;
        }

        if (outputFmt == "json")
        {
            output.PrintJson(deps.Select(d => new
            {
                name = d.Name,
                version = d.CurrentVersion,
                latestVersion = d.LatestVersion,
                status = d.Status,
                license = d.License,
                vulnerabilities = d.Vulnerabilities?.Count ?? 0
            }));
            return;
        }

        output.PrintTable(
            ["PACKAGE", "VERSION", "LATEST", "STATUS", "LICENSE", "VULNS"],
            deps.Select(d => new[]
            {
                d.Name ?? "", d.CurrentVersion ?? "", d.LatestVersion ?? "",
                d.Status ?? "", d.License ?? "", (d.Vulnerabilities?.Count ?? 0).ToString()
            }).ToList());
    }
}
