using System.CommandLine;
using DepVault.Cli.Auth;
using DepVault.Cli.Commands;
using DepVault.Cli.Commands.Env;
using DepVault.Cli.Commands.Pull;
using DepVault.Cli.Commands.Push;
using DepVault.Cli.Commands.Scan;
using DepVault.Cli.Config;
using DepVault.Cli.Crypto;
using DepVault.Cli.Output;
using DepVault.Cli.Repl;
using DepVault.Cli.Services;
using DepVault.Cli.Utils;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Kiota.Abstractions.Authentication;

namespace DepVault.Cli;

internal static class Startup
{
    public static ServiceProvider CreateServices()
    {
        return new ServiceCollection()
            // Core
            .AddSingleton<IConfigService, ConfigService>()
            .AddSingleton<ICredentialStore, CredentialStore>()
            .AddSingleton<IAuthenticationProvider, TokenAuthProvider>()
            .AddSingleton<IApiClientFactory, ApiClientFactory>()
            .AddSingleton<IOutputFormatter, OutputFormatter>()
            .AddSingleton<IConsolePrompter, ConsolePrompter>()
            .AddSingleton<IFileScanner, FileScanner>()
            .AddSingleton<ISecretDetector, SecretDetector>()
            .AddSingleton<IGitHubReleaseClient, GitHubReleaseClient>()
            .AddSingleton<IVersionChecker, VersionChecker>()
            .AddSingleton<IUpdateService, UpdateService>()
            .AddSingleton<ConsoleRenderer>()
            .AddSingleton<CommandContext>()
            .AddSingleton<VaultState>()
            .AddSingleton<DekResolver>()
            .AddSingleton<AnalysisClient>()
            // Scan steps
            .AddSingleton<ProjectResolver>()
            .AddSingleton<DependencyScanner>()
            .AddSingleton<EnvFileScanner>()
            .AddSingleton<SecretLeakScanner>()
            .AddSingleton<SecretFileScanner>()
            // Shared resolvers
            .AddSingleton<VaultResolver>()
            .AddSingleton<VaultSelector>()
            .AddSingleton<DirectoryVaultMapper>()
            .AddSingleton<EnvPuller>()
            .AddSingleton<SecretsPuller>()
            .AddSingleton<EnvImporter>()
            .AddSingleton<StaleVariableCleaner>()
            // Commands
            .AddSingleton<AuthCommands>()
            .AddSingleton<ConfigCommands>()
            .AddSingleton<ProjectCommands>()
            .AddSingleton<EnvCommands>()
            .AddSingleton<AnalysisCommands>()
            .AddSingleton<CiCommands>()
            .AddSingleton<PullCommands>()
            .AddSingleton<PushCommands>()
            .AddSingleton<SecretsCommands>()
            .AddSingleton<ScanCommands>()
            .AddSingleton<UpdateCommands>()
            .AddSingleton<VaultCommands>()
            .AddSingleton<RootHandler>()
            // REPL
            .AddSingleton<ReplHost>()
            .BuildServiceProvider();
    }

    public static RootCommand CreateRootCommand(ServiceProvider services)
    {
        var auth = services.GetRequiredService<AuthCommands>();
        var config = services.GetRequiredService<ConfigCommands>();
        var project = services.GetRequiredService<ProjectCommands>();
        var env = services.GetRequiredService<EnvCommands>();
        var analysis = services.GetRequiredService<AnalysisCommands>();
        var ci = services.GetRequiredService<CiCommands>();
        var pull = services.GetRequiredService<PullCommands>();
        var push = services.GetRequiredService<PushCommands>();
        var secrets = services.GetRequiredService<SecretsCommands>();
        var scan = services.GetRequiredService<ScanCommands>();
        var update = services.GetRequiredService<UpdateCommands>();
        var vault = services.GetRequiredService<VaultCommands>();

        var rootCommand = new RootCommand("DepVault CLI — dependency analysis, env vault, and secret management")
        {
            auth.CreateLoginCommand(),
            auth.CreateLogoutCommand(),
            auth.CreateWhoamiCommand(),
            config.CreateConfigCommand(),
            project.CreateProjectCommand(),
            pull.CreatePullCommand(),
            push.CreatePushCommand(),
            env.CreateEnvCommand(),
            secrets.CreateSecretsCommand(),
            analysis.CreateAnalyzeCommand(),
            ci.CreateCiCommand(),
            scan.CreateScanCommand(),
            update.CreateUpdateCommand(),
            vault.CreateUnlockCommand(),
            vault.CreateLockCommand()
        };

        services.GetRequiredService<RootHandler>().Configure(rootCommand);

        var renderer = services.GetRequiredService<ConsoleRenderer>();
        var versionCmd = new Command("version", "Show CLI version");
        versionCmd.SetAction(_ => renderer.PrintBanner());
        rootCommand.Add(versionCmd);

        return rootCommand;
    }

    public static void CleanupStaleUpdate()
    {
        try
        {
            var oldBinary = Environment.ProcessPath + ".old";
            if (File.Exists(oldBinary))
            {
                File.Delete(oldBinary);
            }
        }
        catch { /* best-effort */ }
    }
}
