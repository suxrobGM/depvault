using DepVault.Cli.Auth;
using DepVault.Cli.Crypto;
using DepVault.Cli.Output;
using DepVault.Cli.Utils;
using Spectre.Console;
using ExportEntries = DepVault.Cli.ApiClient.Api.Projects.Item.Environments.Export.ExportGetResponse_entries;
using ExportEnvType = DepVault.Cli.ApiClient.Api.Projects.Item.Environments.Export.GetEnvironmentTypeQueryParameterType;
using VaultGroupsModel = DepVault.Cli.ApiClient.Api.Projects.Item.VaultGroups.VaultGroups;

namespace DepVault.Cli.Commands.Pull;

/// <summary>Exports env vars per vault group, decrypts client-side, and writes .env files to disk.</summary>
public sealed class EnvPuller(
    IApiClientFactory clientFactory,
    DekResolver dekResolver,
    IOutputFormatter output)
{
    /// <summary>Pulls env vars for each group, decrypts, and writes files. Returns number of files written.</summary>
    public async Task<int> PullAsync(
        string projectId, List<VaultGroupsModel> groups,
        string envType, string format, string outputDir, CancellationToken ct)
    {
        var password = dekResolver.CollectVaultPassword();
        var dek = await AnsiConsole.Status()
            .Spinner(Spinner.Known.Dots)
            .StartAsync("Resolving encryption key...", async _ =>
                await dekResolver.ResolveAsync(projectId, password, ct));

        if (dek is null)
        {
            output.PrintError("Failed to resolve encryption key.");
            return 0;
        }

        var client = clientFactory.Create();
        var filesWritten = 0;

        foreach (var group in groups)
        {
            try
            {
                var entries = await AnsiConsole.Status()
                    .Spinner(Spinner.Known.Dots)
                    .StartAsync($"Pulling env vars for {group.Name}...", async _ =>
                        await FetchEncryptedEntriesAsync(client, projectId, group.Id!, envType, ct));

                if (entries is null || entries.Count == 0)
                {
                    AnsiConsole.MarkupLine($"[grey]No variables in {Markup.Escape(group.Name ?? "Unknown")}[/]");
                    continue;
                }

                var content = DecryptAndSerialize(entries, dek, format);
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

    private static async Task<List<ExportEntries>?> FetchEncryptedEntriesAsync(
        ApiClient.ApiClient client, string projectId, string vaultGroupId,
        string envType, CancellationToken ct)
    {
        var result = await client.Api.Projects[projectId].Environments.Export
            .GetAsync(config =>
            {
                config.QueryParameters.VaultGroupId = vaultGroupId;
                config.QueryParameters.EnvironmentType =
                    CommandUtils.ParseEnum(envType, ExportEnvType.DEVELOPMENT);
            }, ct);

        return result?.Entries;
    }

    private static string DecryptAndSerialize(List<ExportEntries> entries, byte[] dek, string format)
    {
        var pairs = new List<ParsedEnvEntry>();

        foreach (var entry in entries)
        {
            var value = VaultCrypto.Decrypt(
                entry.EncryptedValue ?? "", entry.Iv ?? "", entry.AuthTag ?? "", dek);

            string? comment = null;
            if (!string.IsNullOrEmpty(entry.EncryptedComment) &&
                !string.IsNullOrEmpty(entry.CommentIv) &&
                !string.IsNullOrEmpty(entry.CommentAuthTag))
            {
                comment = VaultCrypto.Decrypt(entry.EncryptedComment, entry.CommentIv, entry.CommentAuthTag, dek);
            }

            pairs.Add(new ParsedEnvEntry(entry.Key ?? "", value, comment));
        }

        return EnvFormatUtils.Serialize(pairs, format);
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
