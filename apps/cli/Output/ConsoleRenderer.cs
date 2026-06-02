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

    /// <summary>Renders the "key grant missing" guidance panel shown when a project has no SELF grant.</summary>
    public void PrintKeyGrantError()
    {
        AnsiConsole.WriteLine();
        AnsiConsole.Write(new Panel(
                new Rows(
                    new Markup("[red]No encryption key grant found for this project.[/]"),
                    new Markup(""),
                    new Markup("[grey]Key grants are created when you first open a project's vault[/]"),
                    new Markup("[grey]in the web dashboard. To fix this:[/]"),
                    new Markup(""),
                    new Markup("  [cyan1]1.[/] [grey]Open the DepVault web dashboard[/]"),
                    new Markup("  [cyan1]2.[/] [grey]Navigate to this project → [bold]Vault[/] tab[/]"),
                    new Markup("  [cyan1]3.[/] [grey]Unlock the vault with your password[/]"),
                    new Markup("  [cyan1]4.[/] [grey]Run this CLI command again[/]"),
                    new Markup(""),
                    new Markup("[grey]If you are a team member, ask the project owner to grant[/]"),
                    new Markup("[grey]you access from the [bold]Team[/] settings page.[/]")))
            .Header("[red]Key Grant Missing[/]")
            .Border(BoxBorder.Rounded)
            .BorderStyle(new Style(Color.Red))
            .Padding(1, 0));
        AnsiConsole.WriteLine();
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
