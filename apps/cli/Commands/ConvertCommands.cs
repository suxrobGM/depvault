using System.CommandLine;
using DepVault.Cli.ApiClient.ConvertNamespace;
using DepVault.Cli.Auth;
using DepVault.Cli.Output;

namespace DepVault.Cli.Commands;

public sealed class ConvertCommands(
    IApiClientFactory clientFactory,
    IAuthContext authContext,
    IOutputFormatter output)
{
    public Command CreateConvertCommand()
    {
        var fileOpt = new Option<string>("--file") { Description = "Input file path", Required = true };
        var fromOpt = new Option<string>("--from") { Description = "Source format", Required = true };
        var toOpt = new Option<string>("--to") { Description = "Target format", Required = true };
        var outputOpt = new Option<string?>("--output") { Description = "Output file path (defaults to stdout)" };

        var cmd = new Command("convert", "Convert between config formats")
        {
            fileOpt,
            fromOpt,
            toOpt,
            outputOpt
        };

        cmd.SetAction(async (parseResult, cancellationToken) =>
        {
            if (!authContext.RequireAuth())
            {
                return;
            }

            var filePath = parseResult.GetValue(fileOpt)!;
            if (!CommandHelpers.RequireFile(filePath, output))
            {
                return;
            }

            try
            {
                var content = File.ReadAllText(filePath);
                var client = clientFactory.Create();

                var result = await client.Convert.PostAsync(new ConvertPostRequestBody
                {
                    Content = content,
                    FromFormat = CommandHelpers.ParseEnum(parseResult.GetValue(fromOpt)!,
                        ConvertPostRequestBody_fromFormat.Env),
                    ToFormat = CommandHelpers.ParseEnum(parseResult.GetValue(toOpt)!,
                        ConvertPostRequestBody_toFormat.Env)
                }, cancellationToken: cancellationToken);

                output.WriteContent(result?.Content ?? "", parseResult.GetValue(outputOpt));
            }
            catch (Exception ex)
            {
                output.PrintError($"Conversion failed: {ex.Message}");
            }
        });

        return cmd;
    }
}
