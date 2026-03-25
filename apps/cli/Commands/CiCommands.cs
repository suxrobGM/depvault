using System.CommandLine;
using DepVault.Cli.Auth;
using DepVault.Cli.Crypto;
using DepVault.Cli.Utils;

namespace DepVault.Cli.Commands;

public sealed class CiCommands(IApiClientFactory clientFactory, CommandContext ctx)
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
        var formatOpt = new Option<string>("--format")
        { Description = "Output format (env, json)", DefaultValueFactory = _ => "env" };
        var outputOpt = new Option<string?>("--output") { Description = "Output file path (defaults to stdout)" };

        var cmd = new Command("pull", "Fetch secrets using CI token (DEPVAULT_TOKEN)")
        {
            formatOpt,
            outputOpt
        };

        cmd.SetAction(async (parseResult, cancellationToken) =>
        {
            if (!ctx.IsCiMode())
            {
                ctx.Output.PrintError($"CI pull requires {Constants.CiTokenEnvVar} environment variable.");
                return;
            }

            try
            {
                var client = clientFactory.Create();
                var result = await client.Api.Ci.Secrets
                    .GetAsSecretsGetResponseAsync(cancellationToken: cancellationToken);

                if (result is null)
                {
                    ctx.Output.PrintError("No secrets returned.");
                    return;
                }

                var rawToken = Environment.GetEnvironmentVariable(Constants.CiTokenEnvVar)!;
                var ciWrapKey = VaultCrypto.DeriveCiWrapKey(rawToken);
                var dek = VaultCrypto.UnwrapKey(
                    result.WrappedDek ?? "", result.WrappedDekIv ?? "",
                    result.WrappedDekTag ?? "", ciWrapKey);

                var format = parseResult.GetValue(formatOpt);

                if (format == "json")
                {
                    ctx.Output.PrintJson(new
                    {
                        variables = result.Variables?.Select(v => new
                        {
                            key = v.Key,
                            value = VaultCrypto.Decrypt(
                                v.EncryptedValue ?? "", v.Iv ?? "", v.AuthTag ?? "", dek)
                        }),
                        files = result.Files?.Select(f => new { id = f.Id, name = f.Name })
                    });
                    return;
                }

                var lines = result.Variables?.Select(v =>
                    $"{v.Key}={VaultCrypto.Decrypt(v.EncryptedValue ?? "", v.Iv ?? "", v.AuthTag ?? "", dek)}")
                    ?? [];
                var content = string.Join(Environment.NewLine, lines);
                ctx.Output.WriteContent(content, parseResult.GetValue(outputOpt));
            }
            catch (Exception ex)
            {
                ctx.Output.PrintError($"Failed to fetch secrets: {ex.Message}");
            }
        });

        return cmd;
    }
}
