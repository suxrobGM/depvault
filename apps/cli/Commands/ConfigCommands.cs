using System.CommandLine;
using DepVault.Cli.Config;
using DepVault.Cli.Output;
using Spectre.Console;

namespace DepVault.Cli.Commands;

public sealed class ConfigCommands(IConfigService configService, IOutputFormatter output)
{
    public Command CreateConfigCommand()
    {
        var cmd = new Command("config", "Manage CLI configuration");

        cmd.SetAction(_ =>
        {
            var config = configService.Load();
            output.PrintTable(
                ["KEY", "VALUE"],
                [
                    ["server", config.Server],
                    ["project", config.ActiveProjectName ?? config.ActiveProjectId ?? "(none)"],
                    ["output", config.OutputFormat]
                ]);
            AnsiConsole.WriteLine();
            AnsiConsole.MarkupLine("[grey]Use[/] [cyan1]depvault config set <key> <value>[/] [grey]to update.[/]");
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
            if (configService.Set(key!, value!))
            {
                output.PrintSuccess($"Set {key} = {value}");
            }
            else
            {
                output.PrintError($"Unknown config key: {key}. Valid keys: server, project, output");
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
            var value = configService.Get(key!);
            if (value is not null)
            {
                Console.WriteLine(value);
            }
            else
            {
                output.PrintError($"Unknown config key: {key}");
            }
        });

        cmd.Add(setCmd);
        cmd.Add(getCmd);
        return cmd;
    }
}
