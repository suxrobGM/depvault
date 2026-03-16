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
        return ex is ApiException { ResponseStatusCode: 403 }
            && ex.Message.Contains(limitReachedPattern, StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Renders a plan limit error with upgrade guidance, or a generic error if not a plan limit.
    /// Returns true if the error was handled (caller can skip further error handling).
    /// </summary>
    public static void HandleError(Exception ex, string fallbackMessage)
    {
        if (IsPlanLimitError(ex))
        {
            PrintPlanLimitError(ex.Message);
            return;
        }

        AnsiConsole.MarkupLine($"[red]Error: {Markup.Escape(fallbackMessage)}: {Markup.Escape(ex.Message)}[/]");
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
