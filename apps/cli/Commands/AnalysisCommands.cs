using System.CommandLine;
using DepVault.Cli.Auth;
using DepVault.Cli.Config;
using DepVault.Cli.Output;
using DepVault.Cli.Services;
using DepVault.Cli.ApiClient.Projects.Item.Analyses;
using Spectre.Console;

namespace DepVault.Cli.Commands;

public sealed class AnalysisCommands(
    IApiClientFactory clientFactory,
    IAuthContext authContext,
    IConfigService configService,
    IOutputFormatter output,
    IConsolePrompter prompter,
    IFileScanner fileScanner)
{
    public Command CreateAnalyzeCommand()
    {
        var fileOpt = new Option<string?>("--file") { Description = "Path to dependency file (auto-detected if omitted)" };
        var projectOpt = new Option<string?>("--project") { Description = "Project ID" };
        var ecosystemOpt = new Option<string?>("--ecosystem") { Description = "Ecosystem (auto-detected from filename)" };
        var outputOpt = new Option<string>("--output") { Description = "Output format (table, json)", DefaultValueFactory = _ => "table" };

        var cmd = new Command("analyze", "Upload and analyze a dependency file")
        {
            fileOpt,
            projectOpt,
            ecosystemOpt,
            outputOpt
        };

        cmd.SetAction(async (parseResult, cancellationToken) =>
        {
            if (!authContext.RequireAuth())
            {
                return;
            }

            var projectId = CommandHelpers.RequireProjectId(parseResult, projectOpt, configService, output);
            if (projectId is null)
            {
                return;
            }

            var filePath = parseResult.GetValue(fileOpt);

            // Auto-detect dependency files if --file not provided
            if (string.IsNullOrEmpty(filePath))
            {
                if (!prompter.IsInteractive)
                {
                    output.PrintError("--file is required in non-interactive mode.");
                    return;
                }

                var discovered = fileScanner.FindDependencyFiles(Directory.GetCurrentDirectory());
                if (discovered.Count == 0)
                {
                    output.PrintError("No dependency files found in current directory.");
                    return;
                }

                if (discovered.Count == 1)
                {
                    if (prompter.Confirm($"Analyze [cyan1]{Markup.Escape(discovered[0].RelativePath)}[/]?"))
                    {
                        filePath = discovered[0].FullPath;
                    }
                    else
                    {
                        return;
                    }
                }
                else
                {
                    var selected = prompter.Select(
                        "Select a dependency file to analyze",
                        discovered,
                        f => f.RelativePath);
                    filePath = selected.FullPath;
                }
            }

            if (!CommandHelpers.RequireFile(filePath, output))
            {
                return;
            }

            var fileName = Path.GetFileName(filePath);
            var ecosystemStr = parseResult.GetValue(ecosystemOpt);
            AnalysesPostRequestBody_ecosystem? ecosystem = null;

            if (!string.IsNullOrEmpty(ecosystemStr))
            {
                if (!Enum.TryParse<AnalysesPostRequestBody_ecosystem>(ecosystemStr, ignoreCase: true, out var parsed))
                {
                    output.PrintError($"Unknown ecosystem: '{ecosystemStr}'. Valid: NODEJS, PYTHON, DOTNET, RUST, GO, KOTLIN, JAVA, RUBY, PHP");
                    return;
                }
                ecosystem = parsed;
            }
            else
            {
                ecosystem = EcosystemResolver.Resolve(fileName);
                if (ecosystem is null)
                {
                    output.PrintError($"Cannot detect ecosystem for '{fileName}'. Use --ecosystem.");
                    return;
                }
            }

            try
            {
                var content = File.ReadAllText(filePath);
                var client = clientFactory.Create();
                var outputFmt = parseResult.GetValue(outputOpt);

                var result = await AnsiConsole.Status()
                    .Spinner(Spinner.Known.Dots)
                    .StartAsync($"Analyzing {fileName} ({ecosystem})...", async _ =>
                        await client.Projects[projectId].Analyses.PostAsync(new()
                        {
                            FileName = fileName,
                            Content = content,
                            Ecosystem = ecosystem
                        }, cancellationToken: cancellationToken));

                if (result is null)
                {
                    output.PrintError("Analysis returned no results.");
                    return;
                }

                output.PrintSuccess($"Analysis complete. Health score: {result.HealthScore}");

                var deps = result.Dependencies;
                if (deps is null || deps.Count == 0)
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

                var headers = new[] { "PACKAGE", "VERSION", "LATEST", "STATUS", "LICENSE", "VULNS" };
                var rows = deps.Select(d => new[]
                {
                    d.Name ?? "",
                    d.CurrentVersion ?? "",
                    d.LatestVersion ?? "",
                    d.Status ?? "",
                    d.License ?? "",
                    (d.Vulnerabilities?.Count ?? 0).ToString()
                }).ToList();

                output.PrintTable(headers, rows);
            }
            catch (Exception ex)
            {
                output.PrintError($"Analysis failed: {ex.Message}");
            }
        });

        return cmd;
    }
}
