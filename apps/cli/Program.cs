using System.CommandLine;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Kiota.Abstractions.Authentication;
using DepVault.Cli.Auth;
using DepVault.Cli.Commands;
using DepVault.Cli.Config;
using DepVault.Cli.Output;

var services = new ServiceCollection()
    .AddSingleton<IConfigService, ConfigService>()
    .AddSingleton<ICredentialStore, CredentialStore>()
    .AddSingleton<IAuthContext, AuthContext>()
    .AddSingleton<IAuthenticationProvider, TokenAuthProvider>()
    .AddSingleton<IApiClientFactory, ApiClientFactory>()
    .AddSingleton<IOutputFormatter, OutputFormatter>()
    .AddSingleton<AuthCommands>()
    .AddSingleton<ConfigCommands>()
    .AddSingleton<ProjectCommands>()
    .AddSingleton<EnvCommands>()
    .AddSingleton<AnalysisCommands>()
    .AddSingleton<ConvertCommands>()
    .AddSingleton<CiCommands>()
    .BuildServiceProvider();

var auth = services.GetRequiredService<AuthCommands>();
var config = services.GetRequiredService<ConfigCommands>();
var project = services.GetRequiredService<ProjectCommands>();
var env = services.GetRequiredService<EnvCommands>();
var analysis = services.GetRequiredService<AnalysisCommands>();
var convert = services.GetRequiredService<ConvertCommands>();
var ci = services.GetRequiredService<CiCommands>();

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
    ci.CreateCiCommand()
};

var versionCmd = new Command("version", "Show CLI version");
versionCmd.SetAction((parseResult) => Console.WriteLine("depvault-cli 0.1.0"));
rootCommand.Add(versionCmd);

return await rootCommand.Parse(args).InvokeAsync();
