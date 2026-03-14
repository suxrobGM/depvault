using Spectre.Console;

namespace DepVault.Cli.Output;

public interface IConsolePrompter
{
    bool IsInteractive { get; }
    string Ask(string prompt, string? defaultValue = null);
    string AskSecret(string prompt);
    bool Confirm(string prompt, bool defaultValue = true);
    T Select<T>(string title, IEnumerable<T> choices, Func<T, string> displaySelector) where T : notnull;

    List<T> MultiSelect<T>(string title, IEnumerable<T> choices, Func<T, string> displaySelector,
        bool allSelected = true) where T : notnull;
}

public sealed class ConsolePrompter : IConsolePrompter
{
    public bool IsInteractive =>
        !Console.IsInputRedirected
        && !Console.IsOutputRedirected
        && string.IsNullOrEmpty(Environment.GetEnvironmentVariable("DEPVAULT_TOKEN"))
        && string.IsNullOrEmpty(Environment.GetEnvironmentVariable("CI"));

    public string Ask(string prompt, string? defaultValue = null)
    {
        var textPrompt = new TextPrompt<string>($"[cyan1]{Markup.Escape(prompt)}[/]:");
        if (defaultValue is not null)
        {
            textPrompt.DefaultValue(defaultValue);
            textPrompt.ShowDefaultValue = true;
        }

        return AnsiConsole.Prompt(textPrompt);
    }

    public string AskSecret(string prompt)
    {
        return AnsiConsole.Prompt(
            new TextPrompt<string>($"[cyan1]{Markup.Escape(prompt)}[/]:")
                .Secret());
    }

    public bool Confirm(string prompt, bool defaultValue = true)
    {
        return AnsiConsole.Confirm(prompt, defaultValue);
    }

    public T Select<T>(string title, IEnumerable<T> choices, Func<T, string> displaySelector) where T : notnull
    {
        return AnsiConsole.Prompt(
            new SelectionPrompt<T>()
                .Title(title)
                .UseConverter(displaySelector)
                .HighlightStyle(new Style(ConsoleTheme.Highlight))
                .AddChoices(choices));
    }

    public List<T> MultiSelect<T>(string title, IEnumerable<T> choices, Func<T, string> displaySelector,
        bool allSelected = true) where T : notnull
    {
        var prompt = new MultiSelectionPrompt<T>()
            .Title(title)
            .UseConverter(displaySelector)
            .HighlightStyle(new Style(ConsoleTheme.Highlight))
            .InstructionsText("[grey](Press [cyan1]<space>[/] to toggle, [cyan1]<enter>[/] to confirm)[/]")
            .AddChoices(choices);

        if (allSelected)
        {
            foreach (var choice in choices)
            {
                prompt.Select(choice);
            }
        }

        return AnsiConsole.Prompt(prompt);
    }
}
