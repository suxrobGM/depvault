using System.Diagnostics;
using DepVault.Cli.ApiClient.Projects;
using DepVault.Cli.Auth;
using DepVault.Cli.Config;
using DepVault.Cli.Output;
using Spectre.Console;

namespace DepVault.Cli.Commands.Scan;

internal sealed class ProjectResolver(
    IApiClientFactory clientFactory,
    IConfigService configService,
    IOutputFormatter output,
    IConsolePrompter prompter)
{
    public async Task<string?> ResolveAsync(string? explicitId, string repoPath, CancellationToken ct)
    {
        if (!string.IsNullOrEmpty(explicitId))
        {
            return explicitId;
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
            return await CreateProjectAsync(client, config, repoPath, ct);
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

    private async Task<string?> CreateProjectAsync(
        ApiClient.ApiClient client, AppConfigData config, string repoPath, CancellationToken ct)
    {
        var defaultName = new DirectoryInfo(repoPath).Name;
        var name = prompter.Ask("Project name", defaultName);
        var repoUrl = DetectGitRemoteUrl(repoPath);

        var created = await AnsiConsole.Status()
            .Spinner(Spinner.Known.Dots)
            .StartAsync("Creating project...", async _ =>
                await client.Projects.PostAsync(
                    new ProjectsPostRequestBody { Name = name, RepositoryUrl = repoUrl },
                    cancellationToken: ct));

        if (created?.Id is null)
        {
            output.PrintError("Failed to create project.");
            return null;
        }

        config.ActiveProjectId = created.Id;
        configService.Save(config);
        output.PrintSuccess($"Created project '{name}'");

        if (!string.IsNullOrEmpty(repoUrl))
        {
            AnsiConsole.MarkupLine($"[grey]Repository: {Markup.Escape(repoUrl)}[/]");
        }

        return created.Id;
    }

    private static string? DetectGitRemoteUrl(string repoPath)
    {
        try
        {
            var process = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = "git",
                    ArgumentList = { "remote", "get-url", "origin" },
                    WorkingDirectory = repoPath,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                }
            };

            process.Start();
            var url = process.StandardOutput.ReadToEnd().Trim();
            process.WaitForExit(3000);

            return process.ExitCode == 0 && !string.IsNullOrEmpty(url) ? url : null;
        }
        catch
        {
            return null;
        }
    }
}
