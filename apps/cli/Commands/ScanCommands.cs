using System.CommandLine;
using DepVault.Cli.ApiClient.Projects;
using DepVault.Cli.ApiClient.Projects.Item.Analyses;
using DepVault.Cli.ApiClient.Projects.Item.VaultGroups;
using DepVault.Cli.Auth;
using DepVault.Cli.Config;
using DepVault.Cli.Output;
using DepVault.Cli.Services;
using Spectre.Console;
using ImportNs = DepVault.Cli.ApiClient.Projects.Item.Environments.Import;
using SecretNs = DepVault.Cli.ApiClient.Projects.Item.Secrets;

namespace DepVault.Cli.Commands;

public sealed class ScanCommands(
    IApiClientFactory clientFactory,
    IAuthContext authContext,
    IConfigService configService,
    IOutputFormatter output,
    IConsolePrompter prompter,
    IFileScanner fileScanner,
    ISecretDetector secretDetector)
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
            var repoPath = parseResult.GetValue(pathOpt) ?? Directory.GetCurrentDirectory();
            repoPath = Path.GetFullPath(repoPath);

            if (!Directory.Exists(repoPath))
            {
                output.PrintError($"Directory not found: {repoPath}");
                return;
            }

            AnsiConsole.MarkupLine($"[cyan1]Scanning:[/] {Markup.Escape(repoPath)}");
            AnsiConsole.WriteLine();

            // Step 1: Resolve project
            var projectId = await ResolveProjectAsync(parseResult, projectOpt, repoPath, cancellationToken);
            if (projectId is null)
            {
                return;
            }

            var results = new ScanResults();

            // Step 2: Dependency files
            ConsoleTheme.PrintRule("Dependency Analysis");
            await ScanDependenciesAsync(projectId, repoPath, results, cancellationToken);

            // Step 3: Environment files
            AnsiConsole.WriteLine();
            ConsoleTheme.PrintRule("Environment Files");
            await ScanEnvFilesAsync(projectId, repoPath, results, cancellationToken);

            // Step 4: Secret leak scan
            AnsiConsole.WriteLine();
            ConsoleTheme.PrintRule("Secret Leak Detection");
            ScanForSecretLeaks(repoPath, results);

            // Step 5: Secret files
            AnsiConsole.WriteLine();
            ConsoleTheme.PrintRule("Secret Files");
            await ScanSecretFilesAsync(projectId, repoPath, results, cancellationToken);

            // Step 6: Summary
            AnsiConsole.WriteLine();
            ShowSummary(results);
        });

        return cmd;
    }

    private async Task<string?> ResolveProjectAsync(ParseResult parseResult, Option<string?> projectOpt,
        string repoPath, CancellationToken ct)
    {
        var projectId = parseResult.GetValue(projectOpt);
        if (!string.IsNullOrEmpty(projectId))
        {
            return projectId;
        }

        var config = configService.Load();
        var client = clientFactory.Create();

        if (!string.IsNullOrEmpty(config.ActiveProjectId))
        {
            try
            {
                var existing = await AnsiConsole.Status()
                    .Spinner(Spinner.Known.Dots)
                    .StartAsync("Fetching project info...", async _ =>
                        await client.Projects[config.ActiveProjectId].GetAsync(cancellationToken: ct));

                if (existing is not null &&
                    prompter.Confirm(
                        $"Use project [cyan1]{Markup.Escape(existing.Name ?? config.ActiveProjectId)}[/]?"))
                {
                    return config.ActiveProjectId;
                }
            }
            catch
            {
                /* fall through to selection */
            }
        }

        var projects = await AnsiConsole.Status()
            .Spinner(Spinner.Known.Dots)
            .StartAsync("Fetching projects...", async _ =>
                await client.Projects.GetAsync(c =>
                {
                    c.QueryParameters.Page = 1;
                    c.QueryParameters.Limit = 100;
                }, ct));

        var items = projects?.Items ?? [];
        var createNewLabel = "+ Create new project";

        var choices = items
            .Select(p => p.Name ?? p.Id ?? "Unknown")
            .Append(createNewLabel)
            .ToList();

        var selected = prompter.Select("Select a project", choices, c => c);

        if (selected == createNewLabel)
        {
            var defaultName = new DirectoryInfo(repoPath).Name;
            var name = prompter.Ask("Project name", defaultName);

            var created = await AnsiConsole.Status()
                .Spinner(Spinner.Known.Dots)
                .StartAsync("Creating project...", async _ =>
                    await client.Projects.PostAsync(new ProjectsPostRequestBody { Name = name },
                        cancellationToken: ct));

            if (created?.Id is null)
            {
                output.PrintError("Failed to create project.");
                return null;
            }

            config.ActiveProjectId = created.Id;
            configService.Save(config);
            output.PrintSuccess($"Created project '{name}'");
            return created.Id;
        }

        var match = items.FirstOrDefault(p => (p.Name ?? p.Id) == selected);
        if (match?.Id is null)
        {
            output.PrintError("Failed to resolve selected project.");
            return null;
        }

        config.ActiveProjectId = match.Id;
        configService.Save(config);
        return match.Id;
    }

    private async Task ScanDependenciesAsync(string projectId, string repoPath, ScanResults results,
        CancellationToken ct)
    {
        var files = fileScanner.FindDependencyFiles(repoPath);
        if (files.Count == 0)
        {
            AnsiConsole.MarkupLine("[grey]No dependency files found.[/]");
            return;
        }

        var tree = new Tree($"[cyan1]Found {files.Count} dependency file(s)[/]");
        foreach (var f in files)
        {
            tree.AddNode($"[white]{Markup.Escape(f.RelativePath)}[/]");
        }

        AnsiConsole.Write(tree);
        AnsiConsole.WriteLine();

        var selected = prompter.MultiSelect(
            "Select files to analyze",
            files,
            f => f.RelativePath);

        if (selected.Count == 0)
        {
            AnsiConsole.MarkupLine("[grey]Skipped dependency analysis.[/]");
            return;
        }

        var client = clientFactory.Create();

        await AnsiConsole.Progress()
            .Columns(
                new TaskDescriptionColumn(),
                new ProgressBarColumn(),
                new SpinnerColumn())
            .StartAsync(async ctx =>
            {
                foreach (var file in selected)
                {
                    var task = ctx.AddTask($"[white]{Markup.Escape(file.RelativePath)}[/]");

                    var ecosystem = EcosystemResolver.Resolve(file.FileName);
                    if (ecosystem is null)
                    {
                        task.Description = $"[yellow]{Markup.Escape(file.RelativePath)} (unknown ecosystem)[/]";
                        task.Value = 100;
                        continue;
                    }

                    try
                    {
                        var content = await File.ReadAllTextAsync(file.FullPath, ct);
                        task.Value = 30;

                        var result = await client.Projects[projectId].Analyses.PostAsync(new AnalysesPostRequestBody
                        {
                            FileName = file.FileName,
                            Content = content,
                            Ecosystem = ecosystem
                        }, cancellationToken: ct);

                        task.Value = 100;
                        results.FilesAnalyzed++;
                        results.TotalDependencies += result?.Dependencies?.Count ?? 0;
                        results.HealthScores.Add((file.RelativePath, result?.HealthScore ?? 0));

                        if (result?.Dependencies is not null)
                        {
                            foreach (var dep in result.Dependencies)
                            {
                                var vulnCount = dep.Vulnerabilities?.Count ?? 0;
                                results.TotalVulnerabilities += vulnCount;
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        task.Description =
                            $"[red]{Markup.Escape(file.RelativePath)} (failed: {Markup.Escape(ex.Message)})[/]";
                        task.Value = 100;
                    }
                }
            });

        if (results.HealthScores.Count > 0)
        {
            AnsiConsole.WriteLine();
            var table = new Table().Border(ConsoleTheme.Border).BorderStyle(new Style(ConsoleTheme.Muted));
            table.AddColumn("[cyan1]FILE[/]");
            table.AddColumn("[cyan1]HEALTH[/]");

            foreach (var (path, score) in results.HealthScores)
            {
                var color = score >= 80 ? "green" : score >= 50 ? "yellow" : "red";
                table.AddRow(Markup.Escape(path), $"[{color}]{score:F0}%[/]");
            }

            AnsiConsole.Write(table);
        }
    }

    private async Task ScanEnvFilesAsync(string projectId, string repoPath, ScanResults results, CancellationToken ct)
    {
        var files = fileScanner.FindEnvFiles(repoPath);
        if (files.Count == 0)
        {
            AnsiConsole.MarkupLine("[grey]No environment files found.[/]");
            return;
        }

        var tree = new Tree($"[cyan1]Found {files.Count} environment file(s)[/]");
        foreach (var f in files)
        {
            tree.AddNode($"[white]{Markup.Escape(f.RelativePath)}[/]");
        }

        AnsiConsole.Write(tree);
        AnsiConsole.WriteLine();

        AnsiConsole.MarkupLine("[yellow]Warning: These files may contain sensitive data. Review before pushing.[/]");
        AnsiConsole.WriteLine();

        var selected = prompter.MultiSelect(
            "Select files to push (none selected by default)",
            files,
            f => f.RelativePath,
            allSelected: false);

        if (selected.Count == 0)
        {
            AnsiConsole.MarkupLine("[grey]Skipped environment file push.[/]");
            return;
        }

        var client = clientFactory.Create();

        // Fetch existing vault groups once
        var existingGroups = await AnsiConsole.Status()
            .Spinner(Spinner.Known.Dots)
            .StartAsync("Fetching vault groups...", async _ =>
                await client.Projects[projectId].VaultGroups.GetAsync(cancellationToken: ct)) ?? [];

        // Group files by directory → each directory maps to a vault group
        var filesByDir = selected
            .GroupBy(f => Path.GetDirectoryName(f.RelativePath)?.Replace('\\', '/') ?? ".")
            .ToList();

        // Build mapping: directory → vault group, auto-detecting from directory name
        var dirVaultGroupMap = new Dictionary<string, string>(); // dir → vault group ID

        foreach (var dirGroup in filesByDir)
        {
            var dir = dirGroup.Key;
            var suggestedName = SuggestVaultGroupName(dir);
            var fileList = string.Join(", ", dirGroup.Select(f => f.FileName));

            AnsiConsole.MarkupLine($"[cyan1]{Markup.Escape(dir)}/[/] [grey]({Markup.Escape(fileList)})[/]");

            // Check if a vault group with the suggested name already exists → auto-use it
            var existingMatch = existingGroups.FirstOrDefault(g =>
                string.Equals(g.Name, suggestedName, StringComparison.OrdinalIgnoreCase));

            if (existingMatch?.Id is not null)
            {
                dirVaultGroupMap[dir] = existingMatch.Id;
                AnsiConsole.MarkupLine($"  [grey]→ vault group:[/] [cyan1]{Markup.Escape(existingMatch.Name ?? suggestedName)}[/]");
                continue;
            }

            // No match — create a new vault group, confirming the name
            var name = prompter.Ask("  Vault group name", suggestedName);

            var created = await AnsiConsole.Status()
                .Spinner(Spinner.Known.Dots)
                .StartAsync($"Creating vault group '{name}'...", async _ =>
                    await client.Projects[projectId].VaultGroups.PostAsync(
                        new VaultGroupsPostRequestBody { Name = name }, cancellationToken: ct));

            if (created?.Id is null)
            {
                output.PrintError($"Failed to create vault group for {dir}. Skipping.");
                continue;
            }

            output.PrintSuccess($"Created vault group '{name}'");
            dirVaultGroupMap[dir] = created.Id;
            existingGroups.Add(new ApiClient.Projects.Item.VaultGroups.VaultGroups { Id = created.Id, Name = created.Name });
        }

        AnsiConsole.WriteLine();

        // Push each file to its directory's vault group
        foreach (var file in selected)
        {
            var dir = Path.GetDirectoryName(file.RelativePath)?.Replace('\\', '/') ?? ".";
            if (!dirVaultGroupMap.TryGetValue(dir, out var vaultGroupId))
            {
                AnsiConsole.MarkupLine($"[grey]Skipped {Markup.Escape(file.RelativePath)} (no vault group)[/]");
                continue;
            }

            var envType = DetectEnvironmentType(file.FileName);
            var format = DetectEnvFormat(file.FileName);

            try
            {
                var content = await File.ReadAllTextAsync(file.FullPath, ct);

                var result = await AnsiConsole.Status()
                    .Spinner(Spinner.Known.Dots)
                    .StartAsync($"Pushing {file.RelativePath}...", async _ =>
                        await client.Projects[projectId].Environments.Import.PostAsync(
                            new ImportNs.ImportPostRequestBody
                            {
                                Content = content,
                                VaultGroupId = vaultGroupId,
                                EnvironmentType = CommandHelpers.ParseEnum(envType,
                                    ImportNs.ImportPostRequestBody_environmentType.DEVELOPMENT),
                                Format = CommandHelpers.ParseEnum(format, ImportNs.ImportPostRequestBody_format.Env)
                            }, cancellationToken: ct));

                var imported = (int)(result?.Imported ?? 0);
                results.EnvVariablesPushed += imported;
                output.PrintSuccess($"Imported {imported} variables from {file.RelativePath}");
            }
            catch (Exception ex)
            {
                output.PrintError($"Failed to push {file.RelativePath}: {ex.Message}");
            }
        }
    }

    /// <summary>Derives a vault group name from a directory path (e.g. "apps/backend" → "backend", "deploy" → "deploy", "." → "default").</summary>
    private static string SuggestVaultGroupName(string directory)
    {
        if (string.IsNullOrEmpty(directory) || directory == ".")
        {
            return "default";
        }

        // Use the last meaningful segment: "apps/backend" → "backend", "deploy" → "deploy"
        var parts = directory.Split('/', StringSplitOptions.RemoveEmptyEntries);
        return parts[^1];
    }

    /// <summary>Auto-detects environment type from file name (e.g. ".env.production" → "PRODUCTION").</summary>
    private static string DetectEnvironmentType(string fileName)
    {
        var lower = fileName.ToLowerInvariant();

        if (lower.Contains("production") || lower.Contains("prod"))
            return "PRODUCTION";
        if (lower.Contains("staging") || lower.Contains("stage"))
            return "STAGING";

        return "DEVELOPMENT";
    }

    private async Task<string?> ResolveVaultGroupAsync(string projectId, CancellationToken ct)
    {
        var client = clientFactory.Create();

        var groups = await AnsiConsole.Status()
            .Spinner(Spinner.Known.Dots)
            .StartAsync("Fetching vault groups...", async _ =>
                await client.Projects[projectId].VaultGroups.GetAsync(cancellationToken: ct));

        var createLabel = "+ Create new vault group";

        if (groups is not null && groups.Count > 0)
        {
            var choices = groups
                .Select(g => g.Name ?? g.Id ?? "Unknown")
                .Append(createLabel)
                .ToList();

            var selected = prompter.Select("Select vault group", choices, c => c);

            if (selected != createLabel)
            {
                var match = groups.FirstOrDefault(g => (g.Name ?? g.Id) == selected);
                return match?.Id;
            }
        }

        var name = prompter.Ask("Vault group name", "default");

        var created = await AnsiConsole.Status()
            .Spinner(Spinner.Known.Dots)
            .StartAsync("Creating vault group...", async _ =>
                await client.Projects[projectId].VaultGroups.PostAsync(new VaultGroupsPostRequestBody { Name = name },
                    cancellationToken: ct));

        if (created?.Id is null)
        {
            output.PrintError("Failed to create vault group.");
            return null;
        }

        output.PrintSuccess($"Created vault group '{name}'");
        return created.Id;
    }

    private void ScanForSecretLeaks(string repoPath, ScanResults results)
    {
        List<SecretDetection>? detections = null;

        AnsiConsole.Status()
            .Spinner(Spinner.Known.Dots)
            .Start("Scanning for secret leaks...", _ => { detections = secretDetector.ScanDirectory(repoPath); });

        if (detections is null || detections.Count == 0)
        {
            output.PrintSuccess("No secret leaks detected.");
            return;
        }

        results.SecretLeaksFound = detections.Count;

        var table = new Table().Border(ConsoleTheme.Border).BorderStyle(new Style(ConsoleTheme.Muted));
        table.AddColumn("[cyan1]FILE[/]");
        table.AddColumn("[cyan1]LINE[/]");
        table.AddColumn("[cyan1]TYPE[/]");
        table.AddColumn("[cyan1]SEVERITY[/]");
        table.AddColumn("[cyan1]MATCH[/]");

        foreach (var d in detections.Take(50))
        {
            var severityColor = d.Severity switch
            {
                SecretSeverity.Critical => "red",
                SecretSeverity.High => "yellow",
                SecretSeverity.Medium => "blue",
                _ => "grey"
            };

            table.AddRow(
                Markup.Escape(d.FilePath),
                d.LineNumber.ToString(),
                Markup.Escape(d.PatternName),
                $"[{severityColor}]{d.Severity}[/]",
                Markup.Escape(d.MatchedSnippet));
        }

        AnsiConsole.Write(table);

        if (detections.Count > 50)
        {
            AnsiConsole.MarkupLine($"[grey]... and {detections.Count - 50} more detections[/]");
        }

        AnsiConsole.WriteLine();

        var leakedFiles = detections.Select(d => d.FilePath).Distinct().ToList();

        if (prompter.Confirm("Add detected files to .gitignore?", false))
        {
            var gitignorePath = Path.Combine(repoPath, ".gitignore");
            var existingLines = File.Exists(gitignorePath)
                ? new HashSet<string>(File.ReadAllLines(gitignorePath))
                : [];

            var newEntries = leakedFiles.Where(f => !existingLines.Contains(f)).ToList();
            if (newEntries.Count > 0)
            {
                File.AppendAllLines(gitignorePath, ["", "# Secret files detected by depvault scan", .. newEntries]);
                output.PrintSuccess($"Added {newEntries.Count} entries to .gitignore");
            }
            else
            {
                AnsiConsole.MarkupLine("[grey]All detected files already in .gitignore.[/]");
            }
        }
    }

    private async Task ScanSecretFilesAsync(string projectId, string repoPath, ScanResults results,
        CancellationToken ct)
    {
        var files = fileScanner.FindSecretFiles(repoPath);
        if (files.Count == 0)
        {
            AnsiConsole.MarkupLine("[grey]No secret files found.[/]");
            return;
        }

        var tree = new Tree($"[cyan1]Found {files.Count} secret file(s)[/]");
        foreach (var f in files)
        {
            var size = new FileInfo(f.FullPath).Length;
            var sizeStr = size < 1024 ? $"{size} B" : $"{size / 1024.0:F1} KB";
            tree.AddNode($"[white]{Markup.Escape(f.RelativePath)}[/] [grey]({sizeStr})[/]");
        }

        AnsiConsole.Write(tree);
        AnsiConsole.WriteLine();

        var selected = prompter.MultiSelect(
            "Select files to upload (none selected by default)",
            files,
            f => f.RelativePath,
            false);

        if (selected.Count == 0)
        {
            AnsiConsole.MarkupLine("[grey]Skipped secret file upload.[/]");
            return;
        }

        var client = clientFactory.Create();

        foreach (var file in selected)
        {
            try
            {
                var fileBytes = await File.ReadAllBytesAsync(file.FullPath, ct);

                await AnsiConsole.Status()
                    .Spinner(Spinner.Known.Dots)
                    .StartAsync($"Uploading {file.RelativePath}...", async _ =>
                        await client.Projects[projectId].Secrets.PostAsync(new SecretNs.SecretsPostRequestBody
                        {
                            File = fileBytes,
                            Description = file.FileName,
                            EnvironmentType = SecretNs.SecretsPostRequestBody_environmentType.DEVELOPMENT
                        }, cancellationToken: ct));

                results.SecretFilesUploaded++;
                output.PrintSuccess($"Uploaded {file.RelativePath}");
            }
            catch (Exception ex)
            {
                output.PrintError($"Failed to upload {file.RelativePath}: {ex.Message}");
            }
        }
    }

    private static void ShowSummary(ScanResults results)
    {
        var table = new Table()
            .Border(ConsoleTheme.Border)
            .BorderStyle(new Style(ConsoleTheme.Brand))
            .Title("[bold cyan1]Scan Complete[/]");

        table.AddColumn("[cyan1]Metric[/]");
        table.AddColumn("[cyan1]Result[/]");

        table.AddRow("Dependencies analyzed",
            ColorCount(results.TotalDependencies, results.FilesAnalyzed > 0));
        table.AddRow("Files analyzed",
            ColorCount(results.FilesAnalyzed, results.FilesAnalyzed > 0));
        table.AddRow("Vulnerabilities found",
            results.TotalVulnerabilities > 0
                ? $"[red]{results.TotalVulnerabilities}[/]"
                : "[green]0[/]");
        table.AddRow("Env variables pushed",
            ColorCount(results.EnvVariablesPushed, results.EnvVariablesPushed > 0));
        table.AddRow("Secret leaks detected",
            results.SecretLeaksFound > 0
                ? $"[red]{results.SecretLeaksFound}[/]"
                : "[green]0[/]");
        table.AddRow("Secret files uploaded",
            ColorCount(results.SecretFilesUploaded, results.SecretFilesUploaded > 0));

        AnsiConsole.Write(table);
    }

    private static string ColorCount(int count, bool positive)
    {
        return positive ? $"[green]{count}[/]" : $"[grey]{count}[/]";
    }

    private static string DetectEnvFormat(string fileName)
    {
        if (fileName.EndsWith(".json", StringComparison.OrdinalIgnoreCase))
        {
            return "appsettings.json";
        }

        if (fileName.EndsWith(".yaml", StringComparison.OrdinalIgnoreCase) ||
            fileName.EndsWith(".yml", StringComparison.OrdinalIgnoreCase))
        {
            return "secrets.yaml";
        }

        if (fileName.EndsWith(".toml", StringComparison.OrdinalIgnoreCase))
        {
            return "config.toml";
        }

        return "env";
    }

    private sealed class ScanResults
    {
        public int FilesAnalyzed { get; set; }
        public int TotalDependencies { get; set; }
        public int TotalVulnerabilities { get; set; }
        public List<(string Path, double Score)> HealthScores { get; } = [];
        public int EnvVariablesPushed { get; set; }
        public int SecretLeaksFound { get; set; }
        public int SecretFilesUploaded { get; set; }
    }
}
