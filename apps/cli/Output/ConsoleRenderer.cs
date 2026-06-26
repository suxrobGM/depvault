using DepVault.Cli.Config;
using DepVault.Cli.Crypto;
using DepVault.Cli.Services;
using Spectre.Console;

namespace DepVault.Cli.Output;

/// <summary>Injectable renderer for banner, status line, and section rules.</summary>
public sealed class ConsoleRenderer(
    VaultState vaultState,
    RememberedUnlockService rememberedUnlockService,
    ICredentialStore credentialStore,
    IConfigService configService,
    IRepositoryLocator repositoryLocator)
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
        AnsiConsole.WriteLine();
    }

    /// <summary>
    /// Clears the terminal screen. No-ops when output is redirected or no console buffer is attached
    /// (piped/CI), where the underlying clear would throw <see cref="IOException"/>.
    /// </summary>
    public void Clear()
    {
        if (Console.IsOutputRedirected)
        {
            return;
        }

        try
        {
            AnsiConsole.Clear();
        }
        catch (IOException)
        {
            // No usable console buffer — nothing to clear.
        }
    }

    /// <summary>Print the status line: cwd · repo · email · vault lock status · project name.</summary>
    public void PrintStatusLine()
    {
        var email = credentialStore.Load()?.Email;
        var config = configService.Load();
        var projectName = config.ActiveProjectName;
        var projectId = config.ActiveProjectId;

        var parts = new List<string>();

        var cwd = CollapseHome(Directory.GetCurrentDirectory());
        if (!string.IsNullOrEmpty(cwd))
        {
            parts.Add($"[grey]{Markup.Escape(cwd)}[/]");
        }

        var repoName = repositoryLocator.GetRepoName();
        if (!string.IsNullOrEmpty(repoName))
        {
            parts.Add($"[white]{Markup.Escape(repoName)}[/]");
        }

        if (email is not null)
        {
            parts.Add($"[cyan1]{Markup.Escape(email)}[/]");
        }

        if (vaultState.IsUnlocked)
        {
            parts.Add("[green]Unlocked[/]");
        }
        else
        {
            parts.Add(rememberedUnlockService.HasSession()
                ? "[yellow]Locked (remembered)[/]"
                : "[yellow]Locked[/]");
        }

        if (projectName is not null)
        {
            parts.Add($"[white]{Markup.Escape(projectName)}[/]");
        }
        else if (projectId is not null)
        {
            parts.Add($"[grey]{Markup.Escape(projectId)}[/]");
        }

        if (parts.Count == 0)
        {
            return;
        }

        AnsiConsole.MarkupLine($"  {string.Join(" [grey]·[/] ", parts)}");
    }

    /// <summary>Collapses the user's home directory prefix to <c>~</c> for a compact path display.</summary>
    private static string? CollapseHome(string? path)
    {
        if (string.IsNullOrEmpty(path))
        {
            return path;
        }

        var home = Environment.GetEnvironmentVariable("HOME");
        if (string.IsNullOrEmpty(home))
        {
            home = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
        }

        return !string.IsNullOrEmpty(home) && path.StartsWith(home, StringComparison.Ordinal)
            ? "~" + path[home.Length..]
            : path;
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

    /// <summary>Print the REPL key-hint bar shown beneath the status line.</summary>
    public void PrintReplHints()
    {
        AnsiConsole.MarkupLine("  [grey]Enter run · Esc clear · help · exit[/]");
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
