using DepVault.Cli.Config;
using DepVault.Cli.Crypto;
using Spectre.Console;

namespace DepVault.Cli.Output;

/// <summary>Injectable renderer for banner, status line, and section rules.</summary>
public sealed class ConsoleRenderer(
    VaultState vaultState,
    ICredentialStore credentialStore,
    IConfigService configService)
{
    private static readonly string[] DepLines =
    [
        "██████╗ ███████╗██████╗ ",
        "██╔══██╗██╔════╝██╔══██╗",
        "██║  ██║█████╗  ██████╔╝",
        "██║  ██║██╔══╝  ██╔═══╝ ",
        "██████╔╝███████╗██║     ",
        "╚═════╝ ╚══════╝╚═╝     "
    ];

    private static readonly string[] VaultLines =
    [
        "██╗   ██╗ █████╗ ██╗   ██╗██╗  ████████╗",
        "██║   ██║██╔══██╗██║   ██║██║  ╚══██╔══╝",
        "██║   ██║███████║██║   ██║██║     ██║   ",
        "╚██╗ ██╔╝██╔══██║██║   ██║██║     ██║   ",
        " ╚████╔╝ ██║  ██║╚██████╔╝███████╗██║   ",
        "  ╚═══╝  ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝   "
    ];

    /// <summary>Print the full ASCII banner with tagline, version, and status line.</summary>
    public void PrintBanner()
    {
        AnsiConsole.WriteLine();

        for (var i = 0; i < DepLines.Length; i++)
        {
            AnsiConsole.Markup($"  [bold white]{Markup.Escape(DepLines[i])}[/]");
            AnsiConsole.MarkupLine($"[bold {ConsoleTheme.BrandMarkup}]{Markup.Escape(VaultLines[i])}[/]");
        }

        var version = typeof(Program).Assembly.GetName().Version?.ToString(3);
        AnsiConsole.MarkupLine($"  [grey]Secure your stack. Analyze. Vault. Ship.[/]  [grey]v{version}[/]");
        AnsiConsole.MarkupLine($"  [grey]{new string('─', 65)}[/]");

        PrintStatusLine();
        AnsiConsole.WriteLine();
    }

    /// <summary>Print the status line: email · vault lock status · project name.</summary>
    public void PrintStatusLine()
    {
        var email = credentialStore.Load()?.Email;
        var config = configService.Load();
        var projectName = config.ActiveProjectName;
        var projectId = config.ActiveProjectId;

        if (email is null && projectId is null)
        {
            return;
        }

        var parts = new List<string>();

        if (email is not null)
        {
            parts.Add($"[cyan1]{Markup.Escape(email)}[/]");
        }

        parts.Add(vaultState.IsUnlocked
            ? "[green]Unlocked[/]"
            : "[yellow]Locked[/]");

        if (projectName is not null)
        {
            parts.Add($"[white]{Markup.Escape(projectName)}[/]");
        }
        else if (projectId is not null)
        {
            parts.Add($"[grey]{Markup.Escape(projectId)}[/]");
        }

        AnsiConsole.MarkupLine($"  {string.Join(" [grey]·[/] ", parts)}");
    }

    /// <summary>Print a titled section rule.</summary>
    public void PrintRule(string title)
    {
        var rule = new Rule($"[cyan1]{Markup.Escape(title)}[/]")
        {
            Justification = Justify.Left,
            Style = new Style(ConsoleTheme.Highlight)
        };
        AnsiConsole.Write(rule);
    }
}
