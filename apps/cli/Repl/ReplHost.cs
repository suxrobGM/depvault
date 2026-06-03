using System.CommandLine;
using DepVault.Cli.Crypto;
using DepVault.Cli.Output;
using Spectre.Console;

namespace DepVault.Cli.Repl;

/// <summary>Interactive REPL loop — entered when the CLI is invoked with no arguments.</summary>
public sealed class ReplHost(VaultState vaultState, ConsoleRenderer renderer)
{
    private static readonly TimeSpan AutoLockTimeout = TimeSpan.FromMinutes(30);

    /// <summary>Commands that only make sense in non-interactive/CI mode.</summary>
    private static readonly HashSet<string> HiddenCommands = ["ci"];

    public async Task<int> RunAsync(RootCommand rootCommand)
    {
        renderer.PrintBanner();
        PrintHelp(rootCommand);

        var lineEditor = new ReplLineEditor();

        while (true)
        {
            vaultState.CheckAutoLock(AutoLockTimeout);
            renderer.PrintStatusLine();
            renderer.PrintReplHints();

            var prompt = vaultState.IsUnlocked
                ? $"[{ConsoleTheme.BrandMarkup}]depvault[/][grey]>[/] "
                : "[grey]depvault>[/] ";

            var line = lineEditor.ReadLine(prompt);
            if (line is null)
            {
                break;
            }

            var input = line.Trim();
            if (string.IsNullOrEmpty(input))
            {
                continue;
            }

            // Strip leading / for convenience
            if (input.StartsWith('/'))
            {
                input = input[1..];
            }

            var parts = input.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            var command = parts[0].ToLowerInvariant();

            if (command is "exit" or "quit" or "q")
            {
                return 0;
            }

            if (command is "help" or "?")
            {
                PrintHelp(rootCommand);
            }
            else
            {
                try
                {
                    var parseResult = rootCommand.Parse(parts);

                    // Let exceptions (e.g. Esc → PromptCanceledException) reach the catch blocks below
                    // instead of System.CommandLine printing its own "Unhandled exception" stack trace.
                    parseResult.InvocationConfiguration.EnableDefaultExceptionHandler = false;

                    if (parseResult.Errors.Count > 0)
                    {
                        AnsiConsole.MarkupLine(
                            $"[yellow]Unknown command '{Markup.Escape(command)}'. Type help for commands.[/]");
                    }
                    else
                    {
                        await parseResult.InvokeAsync();
                    }
                }
                catch (PromptCanceledException)
                {
                    AnsiConsole.MarkupLine("[yellow]Cancelled.[/]");
                }
                catch (Exception ex)
                {
                    AnsiConsole.MarkupLine($"[red]Error: {Markup.Escape(ex.Message)}[/]");
                }
            }

            // Thin separator between commands; scrollback is preserved (no clear, no "press enter").
            AnsiConsole.Write(new Rule { Style = new Style(Color.Grey) });
        }

        return 0;
    }

    private static void PrintHelp(RootCommand rootCommand)
    {
        AnsiConsole.WriteLine();
        AnsiConsole.MarkupLine("[grey]Commands:[/]");
        foreach (var sub in rootCommand.Subcommands)
        {
            if (HiddenCommands.Contains(sub.Name))
            {
                continue;
            }

            AnsiConsole.MarkupLine($"  [{ConsoleTheme.BrandMarkup}]{sub.Name,-16}[/] [grey]{sub.Description}[/]");
        }

        AnsiConsole.MarkupLine($"  [{ConsoleTheme.BrandMarkup}]{"exit",-16}[/] [grey]Exit the CLI[/]");
        AnsiConsole.WriteLine();
    }
}
