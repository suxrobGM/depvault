using Microsoft.Kiota.Abstractions;
using Spectre.Console;

namespace DepVault.Cli.Utils;

/// <summary>
/// Classifies API exceptions (auth / plan-limit) and renders their rich panels. Used by
/// <c>Program.cs</c> at the top level (before/around the DI container) and composed by the injectable
/// <c>IErrorHandler</c> for in-command error handling.
/// </summary>
public static class ApiErrorHandler
{
    private const string limitReachedPattern = "limit reached";

    /// <summary>
    /// Returns true if the exception is a plan limit error (403 with "limit reached" message).
    /// </summary>
    public static bool IsPlanLimitError(Exception ex)
    {
        return (ex is ApiException { ResponseStatusCode: 403 }
                || ex.GetType().Name.Contains("403Error", StringComparison.Ordinal))
               && ex.Message.Contains(limitReachedPattern, StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Returns true if the exception is an authentication error (401).
    /// Kiota generates *401Error types that inherit ApiException but don't always set ResponseStatusCode.
    /// </summary>
    public static bool IsAuthError(Exception ex)
    {
        return ex is ApiException { ResponseStatusCode: 401 }
               || ex.GetType().Name.Contains("401Error", StringComparison.Ordinal);
    }

    internal static void PrintAuthError()
    {
        AnsiConsole.WriteLine();
        AnsiConsole.Write(new Panel(
                new Rows(
                    new Markup("[red]Your session has expired or your token is invalid.[/]"),
                    new Markup(""),
                    new Markup("[grey]Run[/] [cyan1]depvault login[/] [grey]to re-authenticate.[/]")))
            .Header("[red]Authentication Error[/]")
            .Border(BoxBorder.Rounded)
            .BorderStyle(new Style(Color.Red))
            .Padding(1, 0));
        AnsiConsole.WriteLine();
    }

    internal static void PrintPlanLimitError(string message)
    {
        AnsiConsole.WriteLine();
        AnsiConsole.Write(new Panel(
                new Rows(
                    new Markup($"[yellow]{Markup.Escape(message)}[/]"),
                    new Markup(""),
                    new Markup("[grey]Upgrade your plan at[/] [cyan1 underline]depvault.com/settings/billing[/]")))
            .Header("[yellow]Plan Limit Reached[/]")
            .Border(BoxBorder.Rounded)
            .BorderStyle(new Style(Color.Yellow))
            .Padding(1, 0));
        AnsiConsole.WriteLine();
    }
}
