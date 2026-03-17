using System.Runtime.ExceptionServices;
using Microsoft.Kiota.Abstractions;
using Spectre.Console;

namespace DepVault.Cli.Utils;

/// <summary>
/// Detects plan limit errors from API responses and renders appropriate CLI output.
/// Plan limit errors are 403 responses with messages containing "limit reached".
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

    /// <summary>
    /// Renders a plan limit error with upgrade guidance, an auth error with login guidance,
    /// or a generic error message.
    /// </summary>
    /// <summary>
    /// Handles API errors with friendly output. Auth errors are re-thrown so they
    /// bubble up to the top-level handler instead of being swallowed in per-file loops.
    /// </summary>
    public static void HandleError(Exception ex, string fallbackMessage)
    {
        if (IsAuthError(ex))
        {
            ExceptionDispatchInfo.Capture(ex).Throw();
        }

        if (IsPlanLimitError(ex))
        {
            PrintPlanLimitError(ex.Message);
            return;
        }

        AnsiConsole.MarkupLine($"[red]Error: {Markup.Escape(fallbackMessage)}: {Markup.Escape(ex.Message)}[/]");
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

    private static void PrintPlanLimitError(string message)
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
