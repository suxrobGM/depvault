using System.CommandLine;
using System.Diagnostics;
using DepVault.Cli.Auth;
using DepVault.Cli.Config;
using DepVault.Cli.Output;
using Spectre.Console;
using TokenNs = DepVault.Cli.ApiClient.Api.Auth.Device.Token;

namespace DepVault.Cli.Commands;

public sealed class AuthCommands(
    IApiClientFactory clientFactory,
    IAuthContext authContext,
    IConfigService configService,
    ICredentialStore credentialStore,
    IOutputFormatter output,
    IConsolePrompter prompter)
{
    private static readonly TimeSpan pollInterval = TimeSpan.FromSeconds(5);

    public Command CreateLoginCommand()
    {
        var serverOpt = new Option<string?>("--server") { Description = "API server URL" };

        var cmd = new Command("login", "Authenticate via browser")
        {
            serverOpt
        };

        cmd.SetAction(async (parseResult, cancellationToken) =>
        {
            if (authContext.IsCiMode())
            {
                output.PrintError("Cannot login in CI mode. Unset DEPVAULT_TOKEN to use interactive login.");
                return;
            }

            if (!prompter.IsInteractive)
            {
                output.PrintError("Browser login requires interactive mode. Use DEPVAULT_TOKEN for CI/CD.");
                return;
            }

            var server = parseResult.GetValue(serverOpt);
            if (!string.IsNullOrEmpty(server))
            {
                var config = configService.Load();
                config.Server = server;
                configService.Save(config);
            }

            try
            {
                var client = clientFactory.Create();

                var device = await client.Api.Auth.Device.PostAsync(cancellationToken: cancellationToken);
                if (device?.DeviceCode is null || device.UserCode is null || device.VerificationUrl is null)
                {
                    output.PrintError("Failed to request device code.");
                    return;
                }

                AnsiConsole.WriteLine();
                AnsiConsole.Write(new Panel(
                        new Rows(
                            new Markup($"[bold cyan1]{Markup.Escape(device.UserCode)}[/]"),
                            new Markup(""),
                            new Markup("[grey]Enter this code in your browser to sign in.[/]")))
                    .Header("[cyan1]Verification Code[/]")
                    .Border(BoxBorder.Rounded)
                    .BorderStyle(new Style(ConsoleTheme.Highlight))
                    .Padding(2, 1)
                    .Expand());
                AnsiConsole.WriteLine();

                OpenBrowser(device.VerificationUrl);
                AnsiConsole.MarkupLine("[grey]Opening browser...[/]");
                AnsiConsole.MarkupLine(
                    $"[grey]If it doesn't open, visit:[/] [cyan1 underline]{Markup.Escape(device.VerificationUrl)}[/]");
                AnsiConsole.WriteLine();

                var expiresIn = (int)(device.ExpiresIn ?? 900);
                var tokens = await AnsiConsole.Status()
                    .Spinner(Spinner.Known.Dots)
                    .StartAsync("Waiting for authorization...", async _ =>
                        await PollForTokensAsync(client, device.DeviceCode, expiresIn, cancellationToken));

                if (tokens is null)
                {
                    output.PrintError("Authorization timed out or was denied. Run 'depvault login' to try again.");
                    return;
                }

                credentialStore.Save(new StoredCredentials
                {
                    AccessToken = tokens.AccessToken ?? "",
                    RefreshToken = tokens.RefreshToken ?? "",
                    UserId = tokens.User?.Id,
                    Email = tokens.User?.Email
                });

                AnsiConsole.WriteLine();
                output.PrintSuccess($"Logged in as {tokens.User?.Email ?? "unknown"}");
            }
            catch (Exception ex)
            {
                output.PrintError($"Login failed: {ex.Message}");
            }
        });

        return cmd;
    }

    public Command CreateLogoutCommand()
    {
        var cmd = new Command("logout", "Clear stored credentials");
        cmd.SetAction(parseResult =>
        {
            credentialStore.Delete();
            output.PrintSuccess("Logged out.");
        });
        return cmd;
    }

    public Command CreateWhoamiCommand()
    {
        var cmd = new Command("whoami", "Show current user and auth method");
        cmd.SetAction(async (parseResult, cancellationToken) =>
        {
            var mode = authContext.GetMode();
            if (mode == AuthMode.None)
            {
                output.PrintError("Not authenticated. Run 'depvault login' first.");
                return;
            }

            if (mode == AuthMode.CiToken)
            {
                output.PrintKeyValue("Auth", "CI Token (DEPVAULT_TOKEN)");
                return;
            }

            try
            {
                var client = clientFactory.Create();
                var user = await client.Api.Users.Me.GetAsync(cancellationToken: cancellationToken);
                output.PrintKeyValue("Email", user?.Email);
                output.PrintKeyValue("Name", $"{user?.FirstName} {user?.LastName}".Trim());
                output.PrintKeyValue("Auth", "JWT (stored credentials)");
            }
            catch (Exception ex)
            {
                output.PrintError($"Failed to fetch user info: {ex.Message}");
            }
        });
        return cmd;
    }

    private static async Task<TokenNs.TokenPostResponse?> PollForTokensAsync(
        ApiClient.ApiClient client, string deviceCode, int expiresIn, CancellationToken ct)
    {
        var deadline = DateTime.UtcNow.AddSeconds(expiresIn);

        while (DateTime.UtcNow < deadline)
        {
            ct.ThrowIfCancellationRequested();
            await Task.Delay(pollInterval, ct);

            try
            {
                var result = await client.Api.Auth.Device.Token.PostAsync(
                    new TokenNs.TokenPostRequestBody { DeviceCode = deviceCode },
                    cancellationToken: ct);

                if (result?.Status == TokenNs.TokenPostResponse_status.Verified && result.AccessToken is not null)
                {
                    return result;
                }

                if (result?.Status == TokenNs.TokenPostResponse_status.Expired)
                {
                    return null;
                }
            }
            catch
            {
                // Network error during poll — retry silently
            }
        }

        return null;
    }

    private static void OpenBrowser(string url)
    {
        try
        {
            if (OperatingSystem.IsWindows())
            {
                Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
            }
            else if (OperatingSystem.IsMacOS())
            {
                Process.Start("open", url);
            }
            else
            {
                Process.Start("xdg-open", url);
            }
        }
        catch
        {
            // Browser open is best-effort; URL is printed as fallback
        }
    }
}
