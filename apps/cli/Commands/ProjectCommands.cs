using System.CommandLine;
using DepVault.Cli.Auth;
using DepVault.Cli.Output;
using DepVault.Cli.Services;
using CreateProjectBody = DepVault.Cli.ApiClient.Api.Projects.ProjectsPostRequestBody;

namespace DepVault.Cli.Commands;

public sealed class ProjectCommands(
    IApiClientFactory clientFactory,
    AuthContext ctx,
    IProjectContextResolver projectContextResolver,
    IProjectPicker projectPicker,
    ConsoleRenderer renderer)
{
    public Command CreateProjectCommand()
    {
        var cmd = new Command("project", "Manage projects")
        {
            CreateNewCommand(),
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
                var pick = await projectPicker.PickActiveAsync(includeCreateNew: true, cancellationToken);

                if (pick is ProjectCreateNew)
                {
                    var name = ctx.Prompter.Ask("Project name");
                    await CreateProjectAsync(clientFactory.Create(), name, null, null, true, cancellationToken);
                    return;
                }

                if (pick is ProjectSelected selected)
                {
                    var appConfig = ctx.Config.Load();
                    appConfig.ActiveProjectId = selected.Id;
                    appConfig.ActiveProjectName = selected.Name;
                    ctx.Config.Save(appConfig);
                    ctx.Output.PrintSuccess($"Active project set to {selected.Name} ({selected.Id})");
                }
            }
            catch (PromptCanceledException)
            {
                throw;
            }
            catch (Exception ex)
            {
                ctx.Output.PrintError($"Failed to load projects: {ex.Message}");
            }
        });

        return cmd;
    }

    private Command CreateNewCommand()
    {
        var nameArg = new Argument<string>("name") { Description = "Project name" };
        var descOpt = new Option<string?>("--description", "-d") { Description = "Project description" };
        var repoOpt = new Option<string?>("--repo") { Description = "Repository URL" };
        var setActiveOpt = new Option<bool>("--set-active") { Description = "Set as active project after creation", DefaultValueFactory = _ => true };

        var cmd = new Command("create", "Create a new project")
        {
            nameArg, descOpt, repoOpt, setActiveOpt
        };

        cmd.SetAction(async (parseResult, cancellationToken) =>
        {
            if (!ctx.RequireAuth())
            {
                return;
            }

            var client = clientFactory.Create();
            await CreateProjectAsync(
                client,
                parseResult.GetValue(nameArg),
                parseResult.GetValue(descOpt),
                parseResult.GetValue(repoOpt),
                parseResult.GetValue(setActiveOpt),
                cancellationToken);
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
                var result = await client.Api.Projects.GetAsync(config =>
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
            if (!ctx.RequireAuth())
            {
                return;
            }

            var resolution = await projectContextResolver.ResolveAsync(
                parseResult.GetValue(projectOpt),
                ResolutionPolicy.AllowAutoDetect | ResolutionPolicy.AllowInteractive,
                cancellationToken);
            if (resolution is null)
            {
                return;
            }

            renderer.PrintStatusLine();
            var client = clientFactory.Create();

            try
            {
                var project = await client.Api.Projects[resolution.ProjectId]
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

    private async Task CreateProjectAsync(
        ApiClient.ApiClient apiClient, string? name, string? description,
        string? repoUrl, bool setActive, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            ctx.Output.PrintError("Project name is required.");
            return;
        }

        try
        {
            var result = await apiClient.Api.Projects.PostAsync(new CreateProjectBody
            {
                Name = name,
                Description = description,
                RepositoryUrl = repoUrl
            }, cancellationToken: ct);

            if (result?.Id is null)
            {
                ctx.Output.PrintError("Failed to create project.");
                return;
            }

            ctx.Output.PrintSuccess($"Created project '{result.Name}' ({result.Id})");

            if (setActive)
            {
                var config = ctx.Config.Load();
                config.ActiveProjectId = result.Id;
                config.ActiveProjectName = result.Name;
                ctx.Config.Save(config);
                ctx.Output.PrintSuccess("Set as active project.");
            }
        }
        catch (Exception ex)
        {
            ctx.Output.PrintError($"Failed to create project: {ex.Message}");
        }
    }
}
