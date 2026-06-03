using System.CommandLine;
using System.Text;
using Spectre.Console;

namespace DepVault.Cli.Repl;

/// <summary>
/// Minimal keystroke-based line reader for the REPL. Adds Tab autocompletion of command and
/// subcommand names (Spectre's <c>TextPrompt</c> cannot intercept Tab). Line editing is intentionally
/// basic: typing appends, Backspace deletes the last character, Enter submits.
/// </summary>
internal sealed class ReplLineEditor(RootCommand rootCommand, ISet<string> hiddenCommands)
{
    /// <summary>Pseudo-commands handled by the REPL loop itself, offered at the root level.</summary>
    private static readonly string[] ReplBuiltins = ["help", "exit"];

    /// <summary>
    /// Renders <paramref name="promptMarkup"/> and reads a line, supporting Tab completion.
    /// Returns null on EOF (e.g. redirected input), signalling the REPL to exit.
    /// </summary>
    public string? ReadLine(string promptMarkup)
    {
        AnsiConsole.Markup(promptMarkup);
        var buffer = new StringBuilder();

        while (true)
        {
            ConsoleKeyInfo key;
            try
            {
                key = Console.ReadKey(intercept: true);
            }
            catch (InvalidOperationException)
            {
                return null;
            }

            switch (key.Key)
            {
                case ConsoleKey.Enter:
                    Console.WriteLine();
                    return buffer.ToString();

                case ConsoleKey.Backspace:
                    if (buffer.Length > 0)
                    {
                        buffer.Length--;
                        Console.Write("\b \b");
                    }
                    break;

                case ConsoleKey.Tab:
                    Complete(buffer, promptMarkup);
                    break;

                default:
                    if (!char.IsControl(key.KeyChar) && key.KeyChar != '\0')
                    {
                        buffer.Append(key.KeyChar);
                        Console.Write(key.KeyChar);
                    }
                    break;
            }
        }
    }

    private void Complete(StringBuilder buffer, string promptMarkup)
    {
        var input = buffer.ToString();
        var endsWithSpace = input.Length > 0 && input[^1] == ' ';
        var parts = input.Split(' ', StringSplitOptions.RemoveEmptyEntries);

        // Tokens already complete (used to walk the command tree) vs. the partial token being typed.
        var completed = endsWithSpace ? parts : parts[..^1];
        var partial = endsWithSpace || parts.Length == 0 ? "" : parts[^1];

        var candidates = Candidates(completed)
            .Where(c => c.StartsWith(partial, StringComparison.OrdinalIgnoreCase))
            .OrderBy(c => c, StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (candidates.Count == 0)
        {
            return;
        }

        if (candidates.Count == 1)
        {
            ReplaceTrailing(buffer, partial, candidates[0] + " ");
            return;
        }

        var common = LongestCommonPrefix(candidates);
        if (common.Length > partial.Length)
        {
            ReplaceTrailing(buffer, partial, common);
        }

        // List the choices on a fresh line, then redraw the prompt with what's typed so far.
        Console.WriteLine();
        AnsiConsole.MarkupLine($"[grey]{string.Join("  ", candidates)}[/]");
        AnsiConsole.Markup(promptMarkup);
        Console.Write(buffer.ToString());
    }

    /// <summary>Replaces the trailing partial token in the buffer (and on screen) with new text.</summary>
    private static void ReplaceTrailing(StringBuilder buffer, string partial, string replacement)
    {
        for (var i = 0; i < partial.Length; i++)
        {
            Console.Write("\b \b");
        }

        buffer.Length -= partial.Length;
        buffer.Append(replacement);
        Console.Write(replacement);
    }

    /// <summary>
    /// Resolves the command whose children should be suggested by walking the tree along the already
    /// completed tokens, then returns its visible subcommand names (plus REPL builtins at the root).
    /// </summary>
    private IEnumerable<string> Candidates(string[] completed)
    {
        Command current = rootCommand;

        foreach (var token in completed)
        {
            var match = current.Subcommands.FirstOrDefault(
                c => string.Equals(c.Name, token, StringComparison.OrdinalIgnoreCase));
            if (match is null)
            {
                return [];
            }

            current = match;
        }

        var names = current.Subcommands
            .Select(c => c.Name)
            .Where(name => !hiddenCommands.Contains(name));

        return current == rootCommand ? names.Concat(ReplBuiltins) : names;
    }

    private static string LongestCommonPrefix(List<string> values)
    {
        var prefix = values[0];
        foreach (var value in values.Skip(1))
        {
            var max = Math.Min(prefix.Length, value.Length);
            var i = 0;
            while (i < max && char.ToLowerInvariant(prefix[i]) == char.ToLowerInvariant(value[i]))
            {
                i++;
            }

            prefix = prefix[..i];
            if (prefix.Length == 0)
            {
                break;
            }
        }

        return prefix;
    }
}
