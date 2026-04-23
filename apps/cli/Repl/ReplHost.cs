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

        var firstIteration = true;

        while (true)
        {
            vaultState.CheckAutoLock(AutoLockTimeout);

            // Clear and reprint banner before each prompt (skip the first time — banner already shown)
            if (!firstIteration)
            {
                AnsiConsole.Clear();
                renderer.PrintBanner();
            }

            firstIteration = false;

            var prompt = vaultState.IsUnlocked
                ? $"[{ConsoleTheme.BrandMarkup}]depvault[/][grey]>[/] "
                : "[grey]depvault>[/] ";

            string input;
            try
            {
                input = AnsiConsole.Prompt(new TextPrompt<string>(prompt).AllowEmpty());
            }
            catch (InvalidOperationException)
            {
                break;
            }

            input = input.Trim();
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
                // Delegate to System.CommandLine
                try
                {
                    var parseResult = rootCommand.Parse(parts);
                    await parseResult.InvokeAsync();
                }
                catch (Exception ex)
                {
                    AnsiConsole.MarkupLine($"[red]Error: {Markup.Escape(ex.Message)}[/]");
                }
            }

            // Pause so user can read output before the screen clears
            AnsiConsole.WriteLine();
            AnsiConsole.MarkupLine("[grey]Press Enter to continue...[/]");
            Console.ReadLine();
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
