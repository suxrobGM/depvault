using DepVault.Cli;
using DepVault.Cli.Services;
using DepVault.Cli.Utils;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Kiota.Abstractions;

Startup.CleanupStaleUpdate();

var services = Startup.CreateServices();
var rootCommand = Startup.CreateRootCommand(services);

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
