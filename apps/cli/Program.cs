using System.CommandLine;
using DepVault.Cli.Auth;
using DepVault.Cli.Commands;
using DepVault.Cli.Commands.Env;
using DepVault.Cli.Commands.Scan;
using DepVault.Cli.Config;
using DepVault.Cli.Output;
using DepVault.Cli.Services;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Kiota.Abstractions.Authentication;

var services = new ServiceCollection()
    // Core services
    .AddSingleton<IConfigService, ConfigService>()
    .AddSingleton<ICredentialStore, CredentialStore>()
    .AddSingleton<IAuthContext, AuthContext>()
    .AddSingleton<IAuthenticationProvider, TokenAuthProvider>()
    .AddSingleton<IApiClientFactory, ApiClientFactory>()
    .AddSingleton<IOutputFormatter, OutputFormatter>()
    .AddSingleton<IConsolePrompter, ConsolePrompter>()
    .AddSingleton<IFileScanner, FileScanner>()
    .AddSingleton<ISecretDetector, SecretDetector>()
    .AddSingleton<IGitHubReleaseClient, GitHubReleaseClient>()
    .AddSingleton<IVersionChecker, VersionChecker>()
    .AddSingleton<IUpdateService, UpdateService>()
    .AddSingleton<AnalysisClient>()
    // Scan steps
    .AddSingleton<ProjectResolver>()
    .AddSingleton<DependencyScanner>()
    .AddSingleton<EnvFileScanner>()
    .AddSingleton<SecretLeakScanner>()
    .AddSingleton<SecretFileScanner>()
    // Shared resolvers
    .AddSingleton<VaultGroupResolver>()
    // Commands
    .AddSingleton<AuthCommands>()
    .AddSingleton<ConfigCommands>()
    .AddSingleton<ProjectCommands>()
    .AddSingleton<EnvCommands>()
    .AddSingleton<AnalysisCommands>()
    .AddSingleton<ConvertCommands>()
    .AddSingleton<CiCommands>()
    .AddSingleton<ScanCommands>()
    .AddSingleton<UpdateCommands>()
    .BuildServiceProvider();

var auth = services.GetRequiredService<AuthCommands>();
var config = services.GetRequiredService<ConfigCommands>();
var project = services.GetRequiredService<ProjectCommands>();
var env = services.GetRequiredService<EnvCommands>();
var analysis = services.GetRequiredService<AnalysisCommands>();
var convert = services.GetRequiredService<ConvertCommands>();
var ci = services.GetRequiredService<CiCommands>();
var scan = services.GetRequiredService<ScanCommands>();
var update = services.GetRequiredService<UpdateCommands>();
var versionChecker = services.GetRequiredService<IVersionChecker>();

var rootCommand = new RootCommand("DepVault CLI — dependency analysis, env vault, and secret management")
{
    auth.CreateLoginCommand(),
    auth.CreateLogoutCommand(),
    auth.CreateWhoamiCommand(),
    config.CreateConfigCommand(),
    project.CreateProjectCommand(),
    env.CreateEnvCommand(),
    analysis.CreateAnalyzeCommand(),
    convert.CreateConvertCommand(),
    ci.CreateCiCommand(),
    scan.CreateScanCommand(),
    update.CreateUpdateCommand()
};

rootCommand.SetAction(_ =>
{
    ConsoleTheme.PrintBanner();
    Console.WriteLine(rootCommand.Description);
    Console.WriteLine();
    Console.WriteLine("Usage: depvault [command] [options]");
    Console.WriteLine();
    Console.WriteLine("Commands:");
    foreach (var sub in rootCommand.Subcommands)
    {
        Console.WriteLine($"  {sub.Name,-16} {sub.Description}");
    }
});

var versionCmd = new Command("version", "Show CLI version");
versionCmd.SetAction(_ => ConsoleTheme.PrintBanner());
rootCommand.Add(versionCmd);

var exitCode = await rootCommand.Parse(args).InvokeAsync();

// Print update hint after command execution (skip for update/version commands)
var firstArg = args.Length > 0 ? args[0] : null;
if (firstArg is not "update" and not "version")
{
    await versionChecker.PrintUpdateHintAsync();
}

return exitCode;
