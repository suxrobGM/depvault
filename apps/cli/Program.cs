using DepVault.Cli;
using DepVault.Cli.Repl;
using DepVault.Cli.Services;
using DepVault.Cli.Utils;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Kiota.Abstractions;

Startup.CleanupStaleUpdate();

var services = Startup.CreateServices();
var rootCommand = Startup.CreateRootCommand(services);

// No args + interactive terminal → REPL mode
if (args.Length == 0
    && !Console.IsInputRedirected
    && !Console.IsOutputRedirected
    && string.IsNullOrEmpty(Environment.GetEnvironmentVariable("DEPVAULT_TOKEN")))
{
    var repl = services.GetRequiredService<ReplHost>();
    return await repl.RunAsync(rootCommand);
}

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

var firstArg = args.Length > 0 ? args[0] : null;
if (firstArg is not "update" and not "version")
{
    await services.GetRequiredService<IVersionChecker>().PrintUpdateHintAsync();
}

return exitCode;
