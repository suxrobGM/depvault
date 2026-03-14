using System.CommandLine;
using DepVault.Cli.Auth;
using DepVault.Cli.Config;
using DepVault.Cli.Output;

namespace DepVault.Cli.Commands;

public sealed class ProjectCommands(
    IApiClientFactory clientFactory,
    IAuthContext authContext,
    IConfigService configService,
    IOutputFormatter output)
{
    public Command CreateProjectCommand()
    {
        var cmd = new Command("project", "Manage projects")
        {
            CreateListCommand(),
            CreateSelectCommand(),
            CreateInfoCommand()
        };
        return cmd;
    }

    private Command CreateListCommand()
    {
        var outputOpt = new Option<string>("--output") { Description = "Output format (table, json)", DefaultValueFactory = _ => "table" };
        var cmd = new Command("list", "List your projects")
        {
            outputOpt
        };

        cmd.SetAction(async (parseResult, cancellationToken) =>
        {
            if (!authContext.RequireAuth())
            {
                return;
            }

            var outputFmt = parseResult.GetValue(outputOpt);

            try
            {
                var client = clientFactory.Create();
                var result = await client.Projects.GetAsync(config => {
                    config.QueryParameters.Page = 1;
                    config.QueryParameters.Limit = 100;
                }, cancellationToken: cancellationToken);
                var items = result?.Items;

                if (items is null || items.Count == 0)
                {
                    Console.WriteLine("No projects found.");
                    return;
                }

                if (outputFmt == "json")
                {
                    output.PrintJson(items.Select(p => new { id = p.Id, name = p.Name }));
                    return;
                }

                var config = configService.Load();
                var headers = new[] { "ID", "NAME", "ACTIVE" };
                var rows = items.Select(p => new[]
                {
                    p.Id ?? "",
                    p.Name ?? "",
                    p.Id == config.ActiveProjectId ? "*" : ""
                }).ToList();

                output.PrintTable(headers, rows);
            }
            catch (Exception ex)
            {
                output.PrintError($"Failed to list projects: {ex.Message}");
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

        cmd.SetAction((parseResult) =>
        {
            var id = parseResult.GetValue(idArg);
            var config = configService.Load();
            config.ActiveProjectId = id;
            configService.Save(config);
            output.PrintSuccess($"Active project set to {id}");
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
            if (!authContext.RequireAuth())
            {
                return;
            }

            var id = CommandHelpers.RequireProjectId(parseResult, projectOpt, configService, output);
            if (id is null)
            {
                return;
            }

            try
            {
                var client = clientFactory.Create();
                var project = await client.Projects[id].GetAsync(cancellationToken: cancellationToken);

                output.PrintKeyValue("ID", project?.Id);
                output.PrintKeyValue("Name", project?.Name);
                output.PrintKeyValue("Created", project?.CreatedAt?.ToString("o"));
            }
            catch (Exception ex)
            {
                output.PrintError($"Failed to get project info: {ex.Message}");
            }
        });

        return cmd;
    }
}
