using DepVault.Cli.ApiClient.Api.Projects.Item.VaultGroups;
using DepVault.Cli.Auth;
using DepVault.Cli.Output;
using Spectre.Console;

namespace DepVault.Cli.Commands.Env;

public sealed class VaultGroupResolver(
    IApiClientFactory clientFactory,
    IOutputFormatter output,
    IConsolePrompter prompter)
{
    public async Task<string?> ResolveAsync(string projectId, CancellationToken ct)
    {
        var client = clientFactory.Create();

        var groups = await AnsiConsole.Status()
            .Spinner(Spinner.Known.Dots)
            .StartAsync("Fetching vault groups...", async _ =>
                await client.Api.Projects[projectId].VaultGroups.GetAsync(cancellationToken: ct));

        const string createLabel = "+ Create new vault group";

        if (groups is not null && groups.Count > 0)
        {
            var choices = groups
                .Select(g => g.Name ?? g.Id ?? "Unknown")
                .Append(createLabel)
                .ToList();

            var selected = prompter.Select("Select vault group", choices, c => c);

            if (selected != createLabel)
            {
                var match = groups.FirstOrDefault(g => (g.Name ?? g.Id) == selected);
                return match?.Id;
            }
        }

        var name = prompter.Ask("Vault group name", "default");

        var created = await AnsiConsole.Status()
            .Spinner(Spinner.Known.Dots)
            .StartAsync("Creating vault group...", async _ =>
                await client.Api.Projects[projectId].VaultGroups.PostAsync(
                    new VaultGroupsPostRequestBody { Name = name }, cancellationToken: ct));

        if (created?.Id is null)
        {
            output.PrintError("Failed to create vault group.");
            return null;
        }

        output.PrintSuccess($"Created vault group '{name}'");
        return created.Id;
    }
}
