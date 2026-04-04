using Spectre.Console;

namespace DepVault.Cli.Output;

/// <summary>
/// Console-based prompter using Spectre.Console.
/// </summary>
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
        && string.IsNullOrEmpty(Environment.GetEnvironmentVariable("DEPVAULT_TOKEN"));

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
        var choiceList = choices.ToList();

        if (!allSelected && choiceList.Count > 1)
        {
            return MultiSelectWithSelectAll(title, choiceList, displaySelector);
        }

        var prompt = new MultiSelectionPrompt<T>()
            .Title(title)
            .UseConverter(displaySelector)
            .Required(false)
            .HighlightStyle(new Style(ConsoleTheme.Highlight))
            .InstructionsText("[grey](Press [cyan1]<space>[/] to toggle, [cyan1]<enter>[/] to confirm)[/]")
            .AddChoices(choiceList);

        if (allSelected)
        {
            foreach (var choice in choiceList)
            {
                prompt.Select(choice);
            }
        }

        return AnsiConsole.Prompt(prompt);
    }

    private static List<T> MultiSelectWithSelectAll<T>(
        string title, List<T> choices, Func<T, string> displaySelector) where T : notnull
    {
        var selectAll = new SelectAllItem<T>();
        var items = new List<SelectAllItem<T>> { selectAll };
        items.AddRange(choices.Select(c => new SelectAllItem<T>(c)));

        var selected = AnsiConsole.Prompt(
            new MultiSelectionPrompt<SelectAllItem<T>>()
                .Title(title)
                .UseConverter(item => item.IsSelectAll ? "[cyan1]* Select all[/]" : displaySelector(item.Value!))
                .Required(false)
                .HighlightStyle(new Style(ConsoleTheme.Highlight))
                .InstructionsText("[grey](Press [cyan1]<space>[/] to toggle, [cyan1]<enter>[/] to confirm)[/]")
                .AddChoices(items));

        if (selected.Any(s => s.IsSelectAll))
        {
            return choices;
        }

        return selected.Where(s => !s.IsSelectAll).Select(s => s.Value!).ToList();
    }

    private sealed class SelectAllItem<T>(T? value = default)
    {
        public T? Value => value;
        public bool IsSelectAll => value is null;
    }
}
