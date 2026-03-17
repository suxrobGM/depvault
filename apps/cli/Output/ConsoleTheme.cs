using Spectre.Console;

namespace DepVault.Cli.Output;

internal static class ConsoleTheme
{
    public static readonly Color Success = Color.Green;
    public static readonly Color Error = Color.Red;
    public static readonly Color Warning = Color.Yellow;
    public static readonly Color Info = Color.Blue;
    public static readonly Color Highlight = Color.Cyan1;
    public static readonly Color Muted = Color.Grey;
    public static readonly Color Brand = new(16, 185, 129); // #10B981 emerald

    public static readonly TableBorder Border = TableBorder.Rounded;

    public static void PrintBanner(string? activeProjectName = null, string? activeProjectId = null)
    {
        var figlet = new FigletText("DepVault")
            .Color(Brand);

        var version = typeof(Program).Assembly.GetName().Version?.ToString(3);

        AnsiConsole.Write(figlet);
        AnsiConsole.MarkupLine("[grey]Secure your stack. Analyze. Vault. Ship.[/]");
        AnsiConsole.MarkupLine($"[grey]v{version}[/]");

        if (activeProjectName is not null && activeProjectId is not null)
        {
            AnsiConsole.MarkupLine(
                $"[cyan1]Active project:[/] {Markup.Escape(activeProjectName)} [grey]({Markup.Escape(activeProjectId)})[/]");
        }
        else if (activeProjectId is not null)
        {
            AnsiConsole.MarkupLine($"[cyan1]Active project:[/] {Markup.Escape(activeProjectId)}");
        }
        else
        {
            AnsiConsole.MarkupLine("[grey]No active project. Use 'depvault project' to select one.[/]");
        }

        AnsiConsole.WriteLine();
    }

    public static void PrintRule(string title)
    {
        var rule = new Rule($"[cyan1]{Markup.Escape(title)}[/]")
        {
            Justification = Justify.Left,
            Style = new Style(Highlight)
        };
        AnsiConsole.Write(rule);
    }
}
