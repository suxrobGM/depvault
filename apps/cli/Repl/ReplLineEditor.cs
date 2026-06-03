using System.Text;
using Spectre.Console;

namespace DepVault.Cli.Repl;

/// <summary>
/// Minimal keystroke-based line reader for the REPL. Line editing is intentionally basic: typing
/// appends, Backspace deletes the last character, Esc clears the line, Enter submits.
/// </summary>
internal sealed class ReplLineEditor
{
    /// <summary>
    /// Renders <paramref name="promptMarkup"/> and reads a line. Returns null on EOF (e.g. redirected
    /// input), signalling the REPL to exit.
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

                case ConsoleKey.Escape:
                    for (var i = 0; i < buffer.Length; i++)
                    {
                        Console.Write("\b \b");
                    }

                    buffer.Clear();
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
}
