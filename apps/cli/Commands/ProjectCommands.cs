using System.CommandLine;
using DepVault.Cli.Auth;
using DepVault.Cli.Utils;

namespace DepVault.Cli.Commands;

public sealed class ProjectCommands(
    IApiClientFactory clientFactory,
    CommandContext ctx)
{
    public Command CreateProjectCommand()
    {
        var cmd = new Command("project", "Manage projects")
        {
            CreateListCommand(),
            CreateSelectCommand(),
            CreateInfoCommand()
        };

        cmd.SetAction(async (parseResult, cancellationToken) =>
        {
            if (!ctx.RequireAuth())
            {
                return;
            }

            if (!ctx.Prompter.IsInteractive)
            {
                ctx.Output.PrintError("Interactive mode required. Use 'depvault project list' or 'depvault project select <id>' instead.");
                return;
            }

            try
            {
                var apiClient = clientFactory.Create();
                var result = await apiClient.Api.Projects.GetAsProjectsGetResponseAsync(config =>
                {
                    config.QueryParameters.Page = 1;
                    config.QueryParameters.Limit = 100;
                }, cancellationToken);

                var items = result?.Items;
                if (items is null || items.Count == 0)
                {
                    ctx.Output.PrintError("No projects found. Create a project on the web dashboard first.");
                    return;
                }

                var appConfig = ctx.Config.Load();
                var selected = ctx.Prompter.Select(
                    "Select active project",
                    items,
                    p =>
                    {
                        var marker = p.Id == appConfig.ActiveProjectId ? " [green]*[/]" : "";
                        return $"{p.Name}{marker}";
                    });

                appConfig.ActiveProjectId = selected.Id;
                appConfig.ActiveProjectName = selected.Name;
                ctx.Config.Save(appConfig);
                ctx.Output.PrintSuccess($"Active project set to {selected.Name} ({selected.Id})");
            }
            catch (Exception ex)
            {
                ctx.Output.PrintError($"Failed to load projects: {ex.Message}");
            }
        });

        return cmd;
    }

    private Command CreateListCommand()
    {
        var outputOpt = new Option<string>("--output")
        { Description = "Output format (table, json)", DefaultValueFactory = _ => "table" };
        var cmd = new Command("list", "List your projects")
        {
            outputOpt
        };

        cmd.SetAction(async (parseResult, cancellationToken) =>
        {
            if (!ctx.RequireAuth())
            {
                return;
            }

            var outputFmt = parseResult.GetValue(outputOpt);

            try
            {
                var client = clientFactory.Create();
                var result = await client.Api.Projects.GetAsProjectsGetResponseAsync(config =>
                {
                    config.QueryParameters.Page = 1;
                    config.QueryParameters.Limit = 100;
                }, cancellationToken);
                var items = result?.Items;

                if (items is null || items.Count == 0)
                {
                    Console.WriteLine("No projects found.");
                    return;
                }

                if (outputFmt == "json")
                {
                    ctx.Output.PrintJson(items.Select(p => new { id = p.Id, name = p.Name }));
                    return;
                }

                var config = ctx.Config.Load();
                var headers = new[] { "ID", "NAME", "ACTIVE" };
                var rows = items.Select(p => new[]
                {
                    p.Id ?? "",
                    p.Name ?? "",
                    p.Id == config.ActiveProjectId ? "*" : ""
                }).ToList();

                ctx.Output.PrintTable(headers, rows);
            }
            catch (Exception ex)
            {
                ctx.Output.PrintError($"Failed to list projects: {ex.Message}");
            }
        });

        return cmd;
    }

    private Command CreateSelectCommand()
    {
        var idArg = new Argument<string>("id") { Description = "Project ID to set as active" };
        var cmd = new Command("select", "Set the active project")
        {
            idArg
        };

        cmd.SetAction(parseResult =>
        {
            var id = parseResult.GetValue(idArg);
            var config = ctx.Config.Load();
            config.ActiveProjectId = id;
            config.ActiveProjectName = null;
            ctx.Config.Save(config);
            ctx.Output.PrintSuccess($"Active project set to {id}");
        });

        return cmd;
    }

    private Command CreateInfoCommand()
    {
        var projectOpt = new Option<string?>("--project") { Description = "Project ID (defaults to active project)" };

        var cmd = new Command("info", "Show project details")
        {
            projectOpt
        };

        cmd.SetAction(async (parseResult, cancellationToken) =>
        {
            var pc = await ctx.RequireProjectContextAsync(parseResult, projectOpt, cancellationToken);
            if (pc is null)
            {
                return;
            }

            try
            {
                var project = await pc.Client.Api.Projects[pc.ProjectId]
                    .GetAsync(cancellationToken: cancellationToken);

                ctx.Output.PrintKeyValue("ID", project?.Id);
                ctx.Output.PrintKeyValue("Name", project?.Name);
                ctx.Output.PrintKeyValue("Created", project?.CreatedAt?.ToString("o"));
            }
            catch (Exception ex)
            {
                ctx.Output.PrintError($"Failed to get project info: {ex.Message}");
            }
        });

        return cmd;
    }
}
