using System.CommandLine;
using DepVault.Cli.Auth;
using DepVault.Cli.Config;
using DepVault.Cli.Services;
using Spectre.Console;

namespace DepVault.Cli.Commands;

public sealed class ConfigCommands(AuthContext ctx, IProjectPicker projectPicker)
{
    public Command CreateConfigCommand()
    {
        var cmd = new Command("config", "Manage CLI configuration");

        cmd.SetAction(async (_, ct) =>
        {
            var config = ctx.Config.Load();
            ctx.Output.PrintTable(
                ["KEY", "VALUE"],
                [
                    ["server", config.Server],
                    ["project", config.ActiveProjectName ?? config.ActiveProjectId ?? "(none)"],
                    ["output", config.OutputFormat]
                ]);

            if (!ctx.Prompter.IsInteractive)
            {
                AnsiConsole.WriteLine();
                AnsiConsole.MarkupLine("[grey]Use[/] [cyan1]depvault config set <key> <value>[/] [grey]to update.[/]");
                return;
            }

            AnsiConsole.WriteLine();
            var setting = ctx.Prompter.Select(
                "Change a setting",
                ["server", "output", "project", "cancel"],
                key => key);

            switch (setting)
            {
                case "server":
                    var url = ctx.Prompter.Ask("Server URL", config.Server);
                    ctx.Config.Set("server", url);
                    ctx.Output.PrintSuccess($"Set server = {url}");
                    break;

                case "output":
                    var format = ctx.Prompter.Select("Output format", ["table", "json"], value => value);
                    ctx.Config.Set("output", format);
                    ctx.Output.PrintSuccess($"Set output = {format}");
                    break;

                case "project":
                    await ChangeProjectAsync(config, ct);
                    break;
            }
        });

        var keyArg = new Argument<string>("key") { Description = "Config key (server, project, output)" };
        var valueArg = new Argument<string>("value") { Description = "Config value" };

        var setCmd = new Command("set", "Set a config value")
        {
            keyArg,
            valueArg
        };
        setCmd.SetAction(parseResult =>
        {
            var key = parseResult.GetValue(keyArg);
            var value = parseResult.GetValue(valueArg);
            if (ctx.Config.Set(key!, value!))
            {
                ctx.Output.PrintSuccess($"Set {key} = {value}");
            }
            else
            {
                ctx.Output.PrintError($"Unknown config key: {key}. Valid keys: server, project, output");
            }
        });

        var getKeyArg = new Argument<string>("key") { Description = "Config key (server, project, output)" };
        var getCmd = new Command("get", "Get a config value")
        {
            getKeyArg
        };
        getCmd.SetAction(parseResult =>
        {
            var key = parseResult.GetValue(getKeyArg);
            var value = ctx.Config.Get(key!);
            if (value is not null)
            {
                Console.WriteLine(value);
            }
            else
            {
                ctx.Output.PrintError($"Unknown config key: {key}");
            }
        });

        cmd.Add(setCmd);
        cmd.Add(getCmd);
        return cmd;
    }

    private async Task ChangeProjectAsync(AppConfigData config, CancellationToken ct)
    {
        if (!ctx.RequireAuth())
        {
            return;
        }

        var pick = await projectPicker.PickActiveAsync(includeCreateNew: false, ct);
        if (pick is ProjectSelected selected)
        {
            config.ActiveProjectId = selected.Id;
            config.ActiveProjectName = selected.Name;
            ctx.Config.Save(config);
            ctx.Output.PrintSuccess($"Active project set to {selected.Name} ({selected.Id})");
        }
        else if (pick is null)
        {
            ctx.Output.PrintError("No projects found. Create one with 'project create <name>'.");
        }
    }
}
