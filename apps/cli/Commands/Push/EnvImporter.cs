using DepVault.Cli.Auth;
using DepVault.Cli.Commands.Scan;
using DepVault.Cli.Services;
using DepVault.Cli.Utils;
using Spectre.Console;
using ImportNs = DepVault.Cli.ApiClient.Api.Projects.Item.Environments.Import;

namespace DepVault.Cli.Commands.Push;

/// <summary>Result of an environment file import containing count and imported variable keys.</summary>
internal sealed record ImportResult(int Imported, HashSet<string> ImportedKeys);

/// <summary>
/// Pushes an environment file to the DepVault API and returns the imported variable count and keys.
/// </summary>
internal sealed class EnvImporter(IApiClientFactory clientFactory)
{
    public async Task<ImportResult> ImportAsync(
        string projectId, DiscoveredFile file, string vaultGroupId,
        string envType, CancellationToken ct)
    {
        var client = clientFactory.Create();
        var content = await File.ReadAllTextAsync(file.FullPath, ct);
        var format = EnvFileScanner.DetectEnvFormat(file.FileName);

        var result = await AnsiConsole.Status()
            .Spinner(Spinner.Known.Dots)
            .StartAsync($"Pushing {file.RelativePath}...", async _ =>
                await client.Api.Projects[projectId].Environments.Import.PostAsync(
                    new ImportNs.ImportPostRequestBody
                    {
                        Content = content,
                        VaultGroupId = vaultGroupId,
                        EnvironmentType = CommandUtils.ParseEnum(envType, ImportNs.ImportPostRequestBody_environmentType.DEVELOPMENT),
                        Format = CommandUtils.ParseEnum(format, ImportNs.ImportPostRequestBody_format.Env)
                    }, cancellationToken: ct));

        var keys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        if (result?.Variables is not null)
        {
            foreach (var v in result.Variables)
            {
                if (v.Key is not null)
                {
                    keys.Add(v.Key);
                }
            }
        }

        return new ImportResult((int)(result?.Imported ?? 0), keys);
    }
}
