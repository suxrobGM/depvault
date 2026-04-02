using DepVault.Cli.Auth;
using DepVault.Cli.Config;
using DepVault.Cli.Output;
using DepVault.Cli.Utils;
using Microsoft.Kiota.Abstractions;
using Spectre.Console;

namespace DepVault.Cli.Crypto;

/// <summary>Resolves the Data Encryption Key (DEK) for client-side vault crypto.</summary>
public sealed class DekResolver(
    IApiClientFactory clientFactory,
    ICredentialStore credentialStore,
    IConsolePrompter prompter,
    CommandContext commandContext)
{
    /// <summary>
    /// Collects the vault password interactively if needed. Must be called outside of any
    /// Spectre dynamic display (Status/Progress) to avoid concurrent interactive operations.
    /// </summary>
    public string? CollectVaultPassword()
    {
        if (commandContext.IsCiMode())
        {
            return null;
        }

        var password = Environment.GetEnvironmentVariable("DEPVAULT_VAULT_PASSWORD");
        if (!string.IsNullOrEmpty(password))
        {
            return password;
        }

        if (!prompter.IsInteractive)
        {
            AnsiConsole.MarkupLine("[red]DEPVAULT_VAULT_PASSWORD is required in non-interactive mode.[/]");
            return null;
        }

        return prompter.AskSecret("Enter vault password");
    }

    /// <summary>Resolves the DEK bytes by unwrapping from CI token or vault password.</summary>
    public async Task<byte[]?> ResolveAsync(string projectId, string? vaultPassword, CancellationToken ct)
    {
        return commandContext.IsCiMode()
            ? await ResolveCiDekAsync(ct)
            : await ResolveJwtDekAsync(projectId, vaultPassword, ct);
    }

    private async Task<byte[]?> ResolveCiDekAsync(CancellationToken ct)
    {
        var rawToken = Environment.GetEnvironmentVariable(Constants.CiTokenEnvVar)!;
        var client = clientFactory.Create();

        var ciSecrets = await client.Api.Ci.Secrets.GetAsync(cancellationToken: ct);

        if (ciSecrets is null)
        {
            AnsiConsole.MarkupLine("[red]Failed to fetch CI secrets metadata.[/]");
            return null;
        }

        var ciWrapKey = VaultCrypto.DeriveCiWrapKey(rawToken);
        return VaultCrypto.UnwrapKey(
            ciSecrets.WrappedDek ?? "", ciSecrets.WrappedDekIv ?? "",
            ciSecrets.WrappedDekTag ?? "", ciWrapKey);
    }

    private async Task<byte[]?> ResolveJwtDekAsync(string projectId, string? password, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(password))
        {
            AnsiConsole.MarkupLine("[red]Vault password is required.[/]");
            return null;
        }

        var token = credentialStore.Load()?.AccessToken;
        if (string.IsNullOrEmpty(token))
        {
            AnsiConsole.MarkupLine("[red]Not authenticated. Run 'depvault login' first.[/]");
            return null;
        }

        var client = clientFactory.Create();

        var vaultStatus = await client.Api.Vault.Status.GetAsync(cancellationToken: ct);

        if (vaultStatus is null || string.IsNullOrEmpty(vaultStatus.KekSalt))
        {
            AnsiConsole.MarkupLine("[red]Failed to fetch vault status. Ensure vault is initialized.[/]");
            return null;
        }

        var salt = Convert.FromBase64String(vaultStatus.KekSalt);
        var iterations = vaultStatus.KekIterations > 0 ? vaultStatus.KekIterations.Value : 600_000;
        var kek = VaultCrypto.DeriveKek(password, salt, iterations);

        try
        {
            var keyGrant = await client.Api.Projects[projectId].Keygrants.My
                .GetAsync(cancellationToken: ct);

            if (keyGrant is null || string.IsNullOrEmpty(keyGrant.WrappedDek))
            {
                PrintKeyGrantError();
                return null;
            }

            return VaultCrypto.UnwrapKey(
                keyGrant.WrappedDek, keyGrant.WrappedDekIv ?? "", keyGrant.WrappedDekTag ?? "", kek);
        }
        catch (ApiException ex) when (ex.ResponseStatusCode is 404)
        {
            PrintKeyGrantError();
            return null;
        }
    }

    private static void PrintKeyGrantError()
    {
        AnsiConsole.WriteLine();
        AnsiConsole.Write(new Panel(
                new Rows(
                    new Markup("[red]No encryption key grant found for this project.[/]"),
                    new Markup(""),
                    new Markup("[grey]Key grants are created when you first open a project's vault[/]"),
                    new Markup("[grey]in the web dashboard. To fix this:[/]"),
                    new Markup(""),
                    new Markup("  [cyan1]1.[/] [grey]Open the DepVault web dashboard[/]"),
                    new Markup("  [cyan1]2.[/] [grey]Navigate to this project → [bold]Vault[/] tab[/]"),
                    new Markup("  [cyan1]3.[/] [grey]Unlock the vault with your password[/]"),
                    new Markup("  [cyan1]4.[/] [grey]Run this CLI command again[/]"),
                    new Markup(""),
                    new Markup("[grey]If you are a team member, ask the project owner to grant[/]"),
                    new Markup("[grey]you access from the [bold]Team[/] settings page.[/]")))
            .Header("[red]Key Grant Missing[/]")
            .Border(BoxBorder.Rounded)
            .BorderStyle(new Style(Color.Red))
            .Padding(1, 0));
        AnsiConsole.WriteLine();
    }
}
