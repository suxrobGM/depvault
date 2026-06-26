using System.CommandLine;
using DepVault.Cli.Auth;
using DepVault.Cli.Crypto;
using Spectre.Console;

namespace DepVault.Cli.Commands;

public sealed class VaultCommands(
    AuthContext ctx,
    VaultState vaultState,
    RememberedUnlockService rememberedUnlockService,
    VaultUnlockService vaultUnlockService)
{
    public Command CreateUnlockCommand()
    {
        var rememberOpt = new Option<bool>("--remember")
        { Description = "Persist the unlock so the password isn't needed next invocation" };
        var noRememberOpt = new Option<bool>("--no-remember")
        { Description = "Unlock for this session only; do not offer to persist" };
        var ttlOpt = new Option<string?>("--ttl", "--remember-for")
        { Description = "How long to stay unlocked, e.g. 8h, 7d (default 7d, max 30d)" };

        var cmd = new Command("unlock", "Unlock the vault (derive and cache KEK)")
        {
            rememberOpt, noRememberOpt, ttlOpt
        };

        cmd.SetAction(async (parseResult, cancellationToken) =>
        {
            if (!ctx.RequireAuth())
            {
                return;
            }

            var remember = parseResult.GetValue(rememberOpt);
            var noRemember = parseResult.GetValue(noRememberOpt);
            var ttlValue = parseResult.GetValue(ttlOpt);

            if (remember && noRemember)
            {
                AnsiConsole.MarkupLine(
                    "[yellow]--remember and --no-remember conflict; honoring --no-remember.[/]");
                remember = false;
            }

            // Resolves the TTL only when it will be used, so `--no-remember --ttl <bad>` does not emit a
            // spurious warning for a flag with no effect.
            TimeSpan ResolveTtlOrDefault() => rememberedUnlockService.ResolveTtlOrDefault(ttlValue);

            void SaveRemembered()
            {
                var expiresAt = rememberedUnlockService.SaveCurrentUnlock(ResolveTtlOrDefault());
                AnsiConsole.MarkupLine(
                    $"[green]Remembered on this machine until {expiresAt.LocalDateTime:g}.[/]");
            }

            // A remembered unlock can be (re)persisted even when this process is already unlocked.
            if (vaultState.IsUnlocked)
            {
                if (remember)
                {
                    SaveRemembered();
                }
                else
                {
                    AnsiConsole.MarkupLine("[yellow]Vault is already unlocked.[/]");
                }

                return;
            }

            var passwordInput = vaultUnlockService.CollectVaultPassword();
            if (string.IsNullOrEmpty(passwordInput.Password) && !rememberedUnlockService.HasSession())
            {
                return;
            }

            var unlockResult = new VaultUnlockResult(null, DroppedStaleSession: false);
            await AnsiConsole.Status()
                .Spinner(Spinner.Known.Dots)
                .StartAsync("Deriving encryption key...", async _ =>
                {
                    unlockResult = await vaultUnlockService.ResolveKekAsync(
                        passwordInput.Password,
                        cancellationToken,
                        "Vault not initialized. Set up your vault in the web dashboard first.");
                });

            if (unlockResult.Kek is null
                && unlockResult.DroppedStaleSession
                && string.IsNullOrEmpty(passwordInput.Password)
                && ctx.Prompter.IsInteractive
                && !rememberedUnlockService.HasSession())
            {
                var password = ctx.Prompter.AskSecret("Enter vault password");
                if (!string.IsNullOrEmpty(password))
                {
                    await AnsiConsole.Status()
                        .Spinner(Spinner.Known.Dots)
                        .StartAsync("Deriving encryption key...", async _ =>
                        {
                            unlockResult = await vaultUnlockService.ResolveKekAsync(
                                password,
                                cancellationToken,
                                "Vault not initialized. Set up your vault in the web dashboard first.");
                        });
                }
            }

            if (unlockResult.Kek is null)
            {
                return;
            }

            AnsiConsole.MarkupLine("[green]Vault unlocked.[/]");

            if (noRemember)
            {
                return;
            }

            if (remember)
            {
                SaveRemembered();
            }
            else
            {
                rememberedUnlockService.MaybeOfferRememberUnlock(ResolveTtlOrDefault());
            }
        });

        return cmd;
    }

    public Command CreateLockCommand()
    {
        var cmd = new Command("lock", "Lock the vault (clear KEK and DEK cache)");

        cmd.SetAction((_, _) =>
        {
            // A remembered unlock can exist on disk even when this process is locked — always clear it.
            var wasUnlocked = vaultState.IsUnlocked;
            var hadSession = rememberedUnlockService.HasSession();

            vaultState.Lock();
            rememberedUnlockService.Clear();

            AnsiConsole.MarkupLine(wasUnlocked || hadSession
                ? "[green]Vault locked. KEK and DEK cache cleared.[/]"
                : "[yellow]Vault is already locked.[/]");
            return Task.CompletedTask;
        });

        return cmd;
    }
}
