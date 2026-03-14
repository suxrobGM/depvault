using System.CommandLine;
using DepVault.Cli.Auth;
using DepVault.Cli.Output;

namespace DepVault.Cli.Commands;

public sealed class CiCommands(
    IApiClientFactory clientFactory,
    IAuthContext authContext,
    IOutputFormatter output)
{
    public Command CreateCiCommand()
    {
        var cmd = new Command("ci", "CI/CD pipeline commands")
        {
            CreatePullCommand()
        };
        return cmd;
    }

    private Command CreatePullCommand()
    {
        var formatOpt = new Option<string>("--format") { Description = "Output format (env, json)", DefaultValueFactory = _ => "env" };
        var outputOpt = new Option<string?>("--output") { Description = "Output file path (defaults to stdout)" };

        var cmd = new Command("pull", "Fetch secrets using CI token (DEPVAULT_TOKEN)")
        {
            formatOpt,
            outputOpt
        };

        cmd.SetAction(async (parseResult, cancellationToken) =>
        {
            if (!authContext.IsCiMode())
            {
                output.PrintError($"CI pull requires {Constants.CiTokenEnvVar} environment variable.");
                return;
            }

            try
            {
                var client = clientFactory.Create();
                var result = await client.Ci.Secrets.GetAsync(cancellationToken: cancellationToken);

                if (result is null)
                {
                    output.PrintError("No secrets returned.");
                    return;
                }

                var format = parseResult.GetValue(formatOpt);

                if (format == "json")
                {
                    output.PrintJson(new
                    {
                        variables = result.Variables?.Select(v => new { key = v.Key, value = v.Value }),
                        files = result.Files?.Select(f => new { id = f.Id, name = f.Name, downloadUrl = f.DownloadUrl })
                    });
                    return;
                }

                var lines = result.Variables?.Select(v => $"{v.Key}={v.Value}") ?? [];
                var content = string.Join(Environment.NewLine, lines);
                output.WriteContent(content, parseResult.GetValue(outputOpt));
            }
            catch (Exception ex)
            {
                output.PrintError($"Failed to fetch secrets: {ex.Message}");
            }
        });

        return cmd;
    }
}
