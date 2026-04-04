using System.CommandLine;
using DepVault.Cli.Auth;
using DepVault.Cli.Crypto;
using DepVault.Cli.Output;
using DepVault.Cli.Utils;
using Spectre.Console;

namespace DepVault.Cli.Commands;

public sealed class VaultCommands(
    CommandContext ctx,
    IApiClientFactory clientFactory,
    IConsolePrompter prompter,
    VaultState vaultState)
{
    public Command CreateUnlockCommand()
    {
        var cmd = new Command("unlock", "Unlock the vault (derive and cache KEK)");

        cmd.SetAction(async (_, cancellationToken) =>
        {
            if (!ctx.RequireAuth())
            {
                return;
            }

            if (vaultState.IsUnlocked)
            {
                AnsiConsole.MarkupLine("[yellow]Vault is already unlocked.[/]");
                return;
            }

            var password = Environment.GetEnvironmentVariable("DEPVAULT_PASSWORD");

            if (string.IsNullOrEmpty(password))
            {
                if (!prompter.IsInteractive)
                {
                    AnsiConsole.MarkupLine("[red]DEPVAULT_PASSWORD is required in non-interactive mode.[/]");
                    return;
                }

                password = prompter.AskSecret("Enter vault password");
            }

            if (string.IsNullOrEmpty(password))
            {
                return;
            }

            await AnsiConsole.Status()
                .Spinner(Spinner.Known.Dots)
                .StartAsync("Deriving encryption key...", async _ =>
                {
                    var client = clientFactory.Create();
                    var status = await client.Api.Vault.Status.GetAsync(cancellationToken: cancellationToken);

                    if (status is null || string.IsNullOrEmpty(status.KekSalt))
                    {
                        AnsiConsole.MarkupLine("[red]Vault not initialized. Set up your vault in the web dashboard first.[/]");
                        return;
                    }

                    var salt = Convert.FromBase64String(status.KekSalt);
                    var iterations = status.KekIterations > 0 ? status.KekIterations.Value : 600_000;
                    var kek = VaultCrypto.DeriveKek(password, salt, iterations);

                    vaultState.Unlock(kek);
                });

            if (vaultState.IsUnlocked)
            {
                AnsiConsole.MarkupLine("[green]Vault unlocked.[/]");
            }
        });

        return cmd;
    }

    public Command CreateLockCommand()
    {
        var cmd = new Command("lock", "Lock the vault (clear KEK and DEK cache)");

        cmd.SetAction((_, _) =>
        {
            if (!vaultState.IsUnlocked)
            {
                AnsiConsole.MarkupLine("[yellow]Vault is already locked.[/]");
                return Task.CompletedTask;
            }

            vaultState.Lock();
            AnsiConsole.MarkupLine("[green]Vault locked. KEK and DEK cache cleared.[/]");
            return Task.CompletedTask;
        });

        return cmd;
    }
}
