using DepVault.Cli.Auth;
using DepVault.Cli.Output;
using Spectre.Console;
using ExportNs = DepVault.Cli.ApiClient.Projects.Item.Environments.Export;
using VaultGroupsModel = DepVault.Cli.ApiClient.Projects.Item.VaultGroups.VaultGroups;

namespace DepVault.Cli.Commands.Pull;

/// <summary>Exports env vars per vault group and writes .env files to disk.</summary>
public sealed class EnvPuller(
    IApiClientFactory clientFactory,
    IOutputFormatter output)
{
    /// <summary>Pulls env vars for each group and writes files. Returns number of files written.</summary>
    public async Task<int> PullAsync(
        string projectId, List<VaultGroupsModel> groups,
        string envType, string format, string outputDir, CancellationToken ct)
    {
        var client = clientFactory.Create();
        var filesWritten = 0;

        foreach (var group in groups)
        {
            try
            {
                var result = await AnsiConsole.Status()
                    .Spinner(Spinner.Known.Dots)
                    .StartAsync($"Pulling env vars for {group.Name}...", async _ =>
                        await client.Projects[projectId].Environments.Export.GetAsync(config =>
                        {
                            config.QueryParameters.VaultGroupId = group.Id;
                            config.QueryParameters.EnvironmentType =
                                CommandHelpers.ParseEnum(envType, ExportNs.GetEnvironmentTypeQueryParameterType.DEVELOPMENT);
                            config.QueryParameters.Format =
                                CommandHelpers.ParseEnum(format, ExportNs.GetFormatQueryParameterType.Env);
                        }, ct));

                var content = result?.Content;
                if (string.IsNullOrEmpty(content))
                {
                    AnsiConsole.MarkupLine($"[grey]No variables in {Markup.Escape(group.Name ?? "Unknown")}[/]");
                    continue;
                }

                var filePath = ResolveEnvFilePath(group, groups.Count, outputDir);
                var dir = Path.GetDirectoryName(filePath);
                if (!string.IsNullOrEmpty(dir))
                {
                    Directory.CreateDirectory(dir);
                }

                await File.WriteAllTextAsync(filePath, content, ct);
                output.PrintSuccess($"  {Path.GetRelativePath(outputDir, filePath)}");
                filesWritten++;
            }
            catch (Exception ex)
            {
                output.PrintError($"Failed to pull env vars for {group.Name}: {ex.Message}");
            }
        }

        return filesWritten;
    }

    internal static string ResolveEnvFilePath(VaultGroupsModel group, int totalGroups, string outputDir)
    {
        var dirPath = group.DirectoryPath;

        if (!string.IsNullOrEmpty(dirPath))
        {
            return Path.Combine(outputDir, dirPath, ".env");
        }

        if (totalGroups == 1)
        {
            return Path.Combine(outputDir, ".env");
        }

        var safeName = SanitizeGroupName(group.Name ?? "default");
        return Path.Combine(outputDir, $".env.{safeName}");
    }

    internal static string SanitizeGroupName(string name)
    {
        var sanitized = name.ToLowerInvariant()
            .Replace(' ', '-')
            .Replace('/', '-')
            .Replace('\\', '-');

        return new string(sanitized.Where(c => char.IsLetterOrDigit(c) || c is '-' or '_').ToArray());
    }
}
