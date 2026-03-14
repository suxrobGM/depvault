using System.CommandLine;
using DepVault.Cli.Auth;
using DepVault.Cli.Config;
using DepVault.Cli.Output;

namespace DepVault.Cli.Commands;

public sealed class AuthCommands(
    IApiClientFactory clientFactory,
    IAuthContext authContext,
    IConfigService configService,
    ICredentialStore credentialStore,
    IOutputFormatter output)
{
    public Command CreateLoginCommand()
    {
        var emailOpt = new Option<string?>("--email") { Description = "Account email" };
        var passwordOpt = new Option<string?>("--password") { Description = "Account password" };
        var serverOpt = new Option<string?>("--server") { Description = "API server URL" };

        var cmd = new Command("login", "Authenticate with the DepVault API")
        {
            emailOpt,
            passwordOpt,
            serverOpt
        };

        cmd.SetAction(async (parseResult, cancellationToken) =>
        {
            if (authContext.IsCiMode())
            {
                output.PrintError("Cannot login in CI mode. Unset DEPVAULT_TOKEN to use interactive login.");
                return;
            }

            var server = parseResult.GetValue(serverOpt);
            if (!string.IsNullOrEmpty(server))
            {
                var config = configService.Load();
                config.Server = server;
                configService.Save(config);
            }

            var email = parseResult.GetValue(emailOpt) ?? Prompt("Email: ");
            var password = parseResult.GetValue(passwordOpt) ?? PromptSecret("Password: ");

            if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(password))
            {
                output.PrintError("Email and password are required.");
                return;
            }

            try
            {
                var client = clientFactory.Create();
                var result = await client.Auth.Login.PostAsync(new()
                {
                    Email = email,
                    Password = password
                }, cancellationToken: cancellationToken);

                if (result?.AccessToken is null)
                {
                    output.PrintError("Login failed. Check your credentials.");
                    return;
                }

                credentialStore.Save(new StoredCredentials
                {
                    AccessToken = result.AccessToken,
                    RefreshToken = result.RefreshToken ?? "",
                    UserId = result.User?.Id,
                    Email = result.User?.Email
                });

                output.PrintSuccess($"Logged in as {result.User?.Email ?? email}");
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
        cmd.SetAction((parseResult) =>
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
                Console.WriteLine("Auth: CI Token (DEPVAULT_TOKEN)");
                return;
            }

            try
            {
                var client = clientFactory.Create();
                var user = await client.Users.Me.GetAsync(cancellationToken: cancellationToken);
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

    private static string? Prompt(string label)
    {
        Console.Write(label);
        return Console.ReadLine()?.Trim();
    }

    private static string PromptSecret(string label)
    {
        Console.Write(label);
        var password = "";
        while (true)
        {
            var key = Console.ReadKey(intercept: true);
            if (key.Key == ConsoleKey.Enter)
            {
                break;
            }

            if (key.Key == ConsoleKey.Backspace && password.Length > 0)
            {
                password = password[..^1];
                Console.Write("\b \b");
            }
            else if (!char.IsControl(key.KeyChar))
            {
                password += key.KeyChar;
                Console.Write('*');
            }
        }
        Console.WriteLine();
        return password;
    }
}
