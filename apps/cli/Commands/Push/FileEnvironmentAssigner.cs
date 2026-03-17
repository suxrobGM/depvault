using DepVault.Cli.Commands.Scan;
using DepVault.Cli.Output;
using DepVault.Cli.Services;
using DepVault.Cli.Utils;
using Spectre.Console;

namespace DepVault.Cli.Commands.Push;

/// <summary>Assigns environment types to discovered files via auto-detection and interactive prompts.</summary>
public sealed class FileEnvironmentAssigner(IConsolePrompter prompter)
{
    /// <summary>
    /// Returns files paired with their assigned environment type.
    /// Auto-detects from filenames, then optionally lets user adjust per file.
    /// </summary>
    public List<(DiscoveredFile File, string Environment)> AssignEnvironments(
        List<DiscoveredFile> files, string? explicitEnv)
    {
        if (!string.IsNullOrEmpty(explicitEnv))
        {
            return files.Select(f => (f, explicitEnv)).ToList();
        }

        var assignments = files.Select(f =>
            (File: f, Environment: EnvFileScanner.DetectEnvironmentType(f.FileName) ?? ""))
            .ToList();

        PrintAssignmentTable(assignments);

        var hasUnassigned = assignments.Any(a => a.Environment == "");
        if (hasUnassigned && prompter.IsInteractive)
        {
            assignments = PromptUnassigned(assignments);
        }
        else if (prompter.IsInteractive && prompter.Confirm("Adjust environment for any files?", false))
        {
            assignments = PromptPerFile(assignments);
        }

        // Final fallback: anything still unassigned defaults to DEVELOPMENT
        return assignments.Select(a =>
            (a.File, string.IsNullOrEmpty(a.Environment) ? "DEVELOPMENT" : a.Environment)).ToList();
    }

    private static void PrintAssignmentTable(List<(DiscoveredFile File, string Environment)> assignments)
    {
        var table = new Table()
            .Border(TableBorder.Rounded)
            .AddColumn("[cyan1]File[/]")
            .AddColumn("[cyan1]Type[/]")
            .AddColumn("[cyan1]Environment[/]");

        foreach (var (file, env) in assignments)
        {
            var typeLabel = file.Category == FileCategory.Environment ? "env" : "secret";
            var envLabel = string.IsNullOrEmpty(env) ? "[yellow]unset[/]" : $"[green]{env}[/]";
            table.AddRow(Markup.Escape(file.RelativePath), typeLabel, envLabel);
        }

        AnsiConsole.Write(table);
        AnsiConsole.WriteLine();
    }

    private List<(DiscoveredFile File, string Environment)> PromptUnassigned(
        List<(DiscoveredFile File, string Environment)> assignments)
    {
        return assignments.Select(a =>
        {
            if (!string.IsNullOrEmpty(a.Environment)) return a;

            var env = prompter.Select(
                $"Environment for [cyan1]{Markup.Escape(a.File.RelativePath)}[/]",
                CommandUtils.EnvironmentTypes, e => e);
            return (a.File, env);
        }).ToList();
    }

    private List<(DiscoveredFile File, string Environment)> PromptPerFile(
        List<(DiscoveredFile File, string Environment)> assignments)
    {
        return assignments.Select(a =>
        {
            var env = prompter.Select(
                $"Environment for [cyan1]{Markup.Escape(a.File.RelativePath)}[/] (current: {a.Environment})",
                CommandUtils.EnvironmentTypes, e => e);
            return (a.File, env);
        }).ToList();
    }
}
