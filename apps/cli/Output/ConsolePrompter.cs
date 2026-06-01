using Spectre.Console;

namespace DepVault.Cli.Output;

/// <summary>
/// Console-based prompter using Spectre.Console. Selection prompts support Esc-to-cancel
/// (<see cref="PromptCanceledException"/>).
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
        if (!IsInteractive)
        {
            return defaultValue;
        }

        return AnsiConsole.Confirm(prompt, defaultValue);
    }

    public T Select<T>(string title, IEnumerable<T> choices, Func<T, string> displaySelector) where T : notnull
    {
        var cancelled = false;
        var prompt = new SelectionPrompt<T>()
            .Title(title)
            .UseConverter(displaySelector)
            .HighlightStyle(new Style(ConsoleTheme.Highlight))
            .AddChoices(choices);

        // Pressing Esc returns this value; we flag it and translate to a cancellation afterward.
        prompt.CancelResult = () =>
        {
            cancelled = true;
            return default!;
        };

        var result = AnsiConsole.Prompt(prompt);
        if (cancelled)
        {
            throw new PromptCanceledException();
        }
        return result;
    }

    public List<T> MultiSelect<T>(string title, IEnumerable<T> choices, Func<T, string> displaySelector,
        bool allSelected = true) where T : notnull
    {
        var choiceList = choices.ToList();
        if (choiceList.Count == 0)
        {
            return [];
        }

        var cancelled = false;
        var prompt = new MultiSelectionPrompt<T>()
            .Title(title)
            .UseConverter(displaySelector)
            .Required(false)
            .HighlightStyle(new Style(ConsoleTheme.Highlight))
            .InstructionsText(
                "[grey](Press [cyan1]<space>[/] to toggle, [cyan1]<enter>[/] to confirm, [cyan1]<esc>[/] to cancel)[/]")
            .AddChoices(choiceList);

        prompt.CancelResult = () =>
        {
            cancelled = true;
            return [];
        };

        // Pre-select everything so "select all" is the default (deselect what you don't want).
        if (allSelected)
        {
            foreach (var choice in choiceList)
            {
                prompt.Select(choice);
            }
        }

        var result = AnsiConsole.Prompt(prompt);
        if (cancelled)
        {
            throw new PromptCanceledException();
        }
        return result;
    }
}
