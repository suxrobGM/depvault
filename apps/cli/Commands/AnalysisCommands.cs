using System.CommandLine;
using DepVault.Cli.Auth;
using DepVault.Cli.Config;
using DepVault.Cli.Output;
using DepVault.Cli.ApiClient.Projects.Item.Analyses;

namespace DepVault.Cli.Commands;

public sealed class AnalysisCommands(
    IApiClientFactory clientFactory,
    IAuthContext authContext,
    IConfigService configService,
    IOutputFormatter output)
{
    private static readonly Dictionary<string, AnalysesPostRequestBody_ecosystem> EcosystemMap = new(StringComparer.OrdinalIgnoreCase)
    {
        ["package.json"] = AnalysesPostRequestBody_ecosystem.NODEJS,
        ["package-lock.json"] = AnalysesPostRequestBody_ecosystem.NODEJS,
        ["yarn.lock"] = AnalysesPostRequestBody_ecosystem.NODEJS,
        ["requirements.txt"] = AnalysesPostRequestBody_ecosystem.PYTHON,
        ["pyproject.toml"] = AnalysesPostRequestBody_ecosystem.PYTHON,
        ["Pipfile"] = AnalysesPostRequestBody_ecosystem.PYTHON,
        ["poetry.lock"] = AnalysesPostRequestBody_ecosystem.PYTHON,
        ["Cargo.toml"] = AnalysesPostRequestBody_ecosystem.RUST,
        ["Cargo.lock"] = AnalysesPostRequestBody_ecosystem.RUST,
        ["go.mod"] = AnalysesPostRequestBody_ecosystem.GO,
        ["pom.xml"] = AnalysesPostRequestBody_ecosystem.KOTLIN,
        ["build.gradle"] = AnalysesPostRequestBody_ecosystem.KOTLIN,
        ["Gemfile"] = AnalysesPostRequestBody_ecosystem.RUBY,
        ["composer.json"] = AnalysesPostRequestBody_ecosystem.PHP,
    };

    public Command CreateAnalyzeCommand()
    {
        var fileOpt = new Option<string>("--file") { Description = "Path to dependency file", Required = true };
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

            var filePath = parseResult.GetValue(fileOpt)!;
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
                if (fileName.EndsWith(".csproj") || fileName == "packages.config" || fileName == "Directory.Packages.props")
                {
                    ecosystem = AnalysesPostRequestBody_ecosystem.DOTNET;
                }
                else if (EcosystemMap.TryGetValue(fileName, out var detected))
                {
                    ecosystem = detected;
                }
                else
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

                Console.WriteLine($"Analyzing {fileName} ({ecosystem})...");

                var result = await client.Projects[projectId].Analyses.PostAsync(new()
                {
                    FileName = fileName,
                    Content = content,
                    Ecosystem = ecosystem
                }, cancellationToken: cancellationToken);

                if (result is null)
                {
                    output.PrintError("Analysis returned no results.");
                    return;
                }

                Console.WriteLine($"Analysis complete. Health score: {result.HealthScore}");

                var deps = result.Dependencies;
                if (deps is null || deps.Count == 0)
                {
                    Console.WriteLine("No dependencies found.");
                    return;
                }

                if (outputFmt == "json")
                {
                    output.PrintJson(deps.Select(d => new
                    {
                        name = d.Name,
                        version = d.CurrentVersion,
                        latestVersion = d.LatestVersion?.String,
                        status = d.Status,
                        license = d.License?.String,
                        vulnerabilities = d.Vulnerabilities?.Count ?? 0
                    }));
                    return;
                }

                var headers = new[] { "PACKAGE", "VERSION", "LATEST", "STATUS", "LICENSE", "VULNS" };
                var rows = deps.Select(d => new[]
                {
                    d.Name ?? "",
                    d.CurrentVersion ?? "",
                    d.LatestVersion?.String ?? "",
                    d.Status ?? "",
                    d.License?.String ?? "",
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
