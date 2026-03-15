using DepVault.Cli.Auth;
using DepVault.Cli.Output;
using Spectre.Console;
using SecretListNs = DepVault.Cli.ApiClient.Projects.Item.Secrets;
using VaultGroupsModel = DepVault.Cli.ApiClient.Projects.Item.VaultGroups.VaultGroups;

namespace DepVault.Cli.Commands.Pull;

/// <summary>Lists and downloads secret files for selected vault groups.</summary>
public sealed class SecretsPuller(
    IApiClientFactory clientFactory,
    IOutputFormatter output)
{
    /// <summary>Downloads secret files for the selected groups. Returns number of files written.</summary>
    public async Task<int> PullAsync(
        string projectId, List<VaultGroupsModel> groups,
        string envType, string outputDir, CancellationToken ct)
    {
        var client = clientFactory.Create();
        var selectedGroupIds = groups.Select(g => g.Id).ToHashSet();

        SecretListNs.SecretsGetResponse? files;

        try
        {
            files = await AnsiConsole.Status()
                .Spinner(Spinner.Known.Dots)
                .StartAsync("Fetching secret files...", async _ =>
                    await client.Projects[projectId].Secrets.GetAsync(config =>
                    {
                        config.QueryParameters.EnvironmentType =
                            CommandHelpers.ParseEnum(envType, SecretListNs.GetEnvironmentTypeQueryParameterType.DEVELOPMENT);
                        config.QueryParameters.Page = 1;
                        config.QueryParameters.Limit = 100;
                    }, ct));
        }
        catch (Exception ex)
        {
            output.PrintError($"Failed to list secret files: {ex.Message}");
            return 0;
        }

        var items = files?.Items?
            .Where(f => selectedGroupIds.Contains(f.VaultGroupId))
            .ToList();

        if (items is null || items.Count == 0)
        {
            AnsiConsole.MarkupLine("[grey]No secret files found.[/]");
            return 0;
        }

        var filesWritten = 0;

        foreach (var file in items)
        {
            try
            {
                var group = groups.FirstOrDefault(g => g.Id == file.VaultGroupId);
                var secretsDir = ResolveSecretsDir(group, outputDir);
                Directory.CreateDirectory(secretsDir);

                var filePath = Path.Combine(secretsDir, file.Name ?? $"secret-{file.Id}");

                await using var stream = await client.Projects[projectId].Secrets[file.Id!].Download.GetAsync(cancellationToken: ct);
                if (stream is null)
                {
                    output.PrintError($"Failed to download {file.Name}: empty response");
                    continue;
                }

                await using var fileStream = File.Create(filePath);
                await stream.CopyToAsync(fileStream, ct);

                output.PrintSuccess($"  {Path.GetRelativePath(outputDir, filePath)}");
                filesWritten++;
            }
            catch (Exception ex)
            {
                output.PrintError($"Failed to download {file.Name}: {ex.Message}");
            }
        }

        return filesWritten;
    }

    private static string ResolveSecretsDir(VaultGroupsModel? group, string outputDir)
    {
        var dirPath = group?.DirectoryPath;

        if (!string.IsNullOrEmpty(dirPath))
        {
            return Path.Combine(outputDir, dirPath, ".secrets");
        }

        return Path.Combine(outputDir, ".secrets");
    }
}
