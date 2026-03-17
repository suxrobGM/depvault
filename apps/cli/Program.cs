using System.CommandLine;
using DepVault.Cli.Auth;
using DepVault.Cli.Commands;
using DepVault.Cli.Commands.Env;
using DepVault.Cli.Commands.Pull;
using DepVault.Cli.Commands.Push;
using DepVault.Cli.Commands.Scan;
using DepVault.Cli.Config;
using DepVault.Cli.Output;
using DepVault.Cli.Services;
using DepVault.Cli.Utils;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Kiota.Abstractions;
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
    .AddSingleton<VaultGroupSelector>()
    .AddSingleton<DirectoryVaultGroupMapper>()
    .AddSingleton<EnvPuller>()
    .AddSingleton<SecretsPuller>()
    .AddSingleton<FileEnvironmentAssigner>()
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
    .AddSingleton<RootHandler>()
    .BuildServiceProvider();

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
var rootHandler = services.GetRequiredService<RootHandler>();
var versionChecker = services.GetRequiredService<IVersionChecker>();

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
    update.CreateUpdateCommand()
};

rootHandler.Configure(rootCommand);

var versionCmd = new Command("version", "Show CLI version");
versionCmd.SetAction(_ => ConsoleTheme.PrintBanner());
rootCommand.Add(versionCmd);

var parseResult = rootCommand.Parse(args);
parseResult.InvocationConfiguration.EnableDefaultExceptionHandler = false;

int exitCode;
try
{
    exitCode = await parseResult.InvokeAsync();
}
catch (Exception ex) when (ApiErrorHandler.IsAuthError(ex))
{
    ApiErrorHandler.PrintAuthError();
    return 1;
}
catch (ApiException ex)
{
    ApiErrorHandler.HandleError(ex, "API request failed");
    return 1;
}

// Print update hint after command execution (skip for update/version commands)
var firstArg = args.Length > 0 ? args[0] : null;
if (firstArg is not "update" and not "version")
{
    await versionChecker.PrintUpdateHintAsync();
}

return exitCode;
