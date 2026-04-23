using DepVault.Cli.ApiClient.Api.Projects.Item.Vaults;
using DepVault.Cli.Auth;
using DepVault.Cli.Output;
using Spectre.Console;

namespace DepVault.Cli.Commands.Env;

/// <summary>Interactively picks an existing vault or creates a new one.</summary>
public sealed class VaultResolver(
    IApiClientFactory clientFactory,
    IOutputFormatter output,
    IConsolePrompter prompter)
{
    public async Task<string?> ResolveAsync(string projectId, CancellationToken ct)
    {
        var client = clientFactory.Create();

        var vaults = await AnsiConsole.Status()
            .Spinner(Spinner.Known.Dots)
            .StartAsync("Fetching vaults...", async _ =>
                await client.Api.Projects[projectId].Vaults.GetAsync(cancellationToken: ct));

        const string createLabel = "+ Create new vault";

        if (vaults is not null && vaults.Count > 0)
        {
            var choices = vaults
                .Select(v => v.Name ?? v.Id ?? "Unknown")
                .Append(createLabel)
                .ToList();

            var selected = prompter.Select("Select vault", choices, c => c);

            if (selected != createLabel)
            {
                var match = vaults.FirstOrDefault(v => (v.Name ?? v.Id) == selected);
                return match?.Id;
            }
        }

        var name = prompter.Ask("Vault name", "default");

        var created = await AnsiConsole.Status()
            .Spinner(Spinner.Known.Dots)
            .StartAsync("Creating vault...", async _ =>
                await client.Api.Projects[projectId].Vaults.PostAsync(
                    new VaultsPostRequestBody { Name = name }, cancellationToken: ct));

        if (created?.Id is null)
        {
            output.PrintError("Failed to create vault.");
            return null;
        }

        output.PrintSuccess($"Created vault '{name}'");
        return created.Id;
    }
}
