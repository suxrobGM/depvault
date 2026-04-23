using DepVault.Cli.Auth;
using DepVault.Cli.Crypto;
using DepVault.Cli.EnvFiles;
using DepVault.Cli.Output;
using Spectre.Console;
using ExportEntries = DepVault.Cli.ApiClient.Api.Projects.Item.Vaults.Item.Export.ExportGetResponse_entries;
using VaultModel = DepVault.Cli.ApiClient.Api.Projects.Item.Vaults.Vaults;

namespace DepVault.Cli.Commands.Pull;

/// <summary>Exports env vars per vault, decrypts client-side, and writes .env files to disk.</summary>
public sealed class EnvPuller(
    IApiClientFactory clientFactory,
    IOutputFormatter output)
{
    /// <summary>Pulls env vars for each vault, decrypts, and writes files. Returns number of files written.</summary>
    public async Task<int> PullAsync(
        string projectId, List<VaultModel> vaults,
        EnvFileFormat format, string outputDir, byte[] dek, CancellationToken ct)
    {
        var client = clientFactory.Create();
        var filesWritten = 0;

        foreach (var vault in vaults)
        {
            try
            {
                var entries = await AnsiConsole.Status()
                    .Spinner(Spinner.Known.Dots)
                    .StartAsync($"Pulling env vars for {vault.Name}...", async _ =>
                        await FetchEncryptedEntriesAsync(client, projectId, vault.Id!, ct));

                if (entries is null || entries.Count == 0)
                {
                    AnsiConsole.MarkupLine($"[grey]No variables in {Markup.Escape(vault.Name ?? "Unknown")}[/]");
                    continue;
                }

                var content = DecryptAndSerialize(entries, dek, format);
                if (string.IsNullOrEmpty(content))
                {
                    AnsiConsole.MarkupLine($"[grey]No variables in {Markup.Escape(vault.Name ?? "Unknown")}[/]");
                    continue;
                }

                var filePath = ResolveEnvFilePath(vault, vaults.Count, outputDir);
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
                output.PrintError($"Failed to pull env vars for {vault.Name}: {ex.Message}");
            }
        }

        return filesWritten;
    }

    private static async Task<List<ExportEntries>?> FetchEncryptedEntriesAsync(
        ApiClient.ApiClient client, string projectId, string vaultId, CancellationToken ct)
    {
        var result = await client.Api.Projects[projectId].Vaults[vaultId].Export.GetAsync(cancellationToken: ct);
        return result?.Entries;
    }

    private static string DecryptAndSerialize(List<ExportEntries> entries, byte[] dek, EnvFileFormat format)
    {
        var pairs = new List<ParsedEnvEntry>();

        foreach (var entry in entries)
        {
            // Skip blank (cloned-but-unfilled) entries — empty ciphertext can't be decrypted.
            if (string.IsNullOrEmpty(entry.EncryptedValue))
            {
                continue;
            }

            var value = VaultCrypto.Decrypt(
                entry.EncryptedValue, entry.Iv ?? "", entry.AuthTag ?? "", dek);

            string? wireComment = null;
            if (!string.IsNullOrEmpty(entry.EncryptedComment) &&
                !string.IsNullOrEmpty(entry.CommentIv) &&
                !string.IsNullOrEmpty(entry.CommentAuthTag))
            {
                wireComment = VaultCrypto.Decrypt(
                    entry.EncryptedComment, entry.CommentIv, entry.CommentAuthTag, dek);
            }

            var (leading, trailing) = CommentCodec.Decode(wireComment);
            pairs.Add(new ParsedEnvEntry(entry.Key ?? "", value, leading, trailing));
        }

        return EnvFormat.Serialize(pairs, format);
    }

    internal static string ResolveEnvFilePath(VaultModel vault, int totalVaults, string outputDir)
    {
        var dirPath = vault.DirectoryPath;

        if (!string.IsNullOrEmpty(dirPath))
        {
            return Path.Combine(outputDir, dirPath, ".env");
        }

        if (totalVaults == 1)
        {
            return Path.Combine(outputDir, ".env");
        }

        var safeName = SanitizeVaultName(vault.Name ?? "default");
        return Path.Combine(outputDir, $".env.{safeName}");
    }

    internal static string SanitizeVaultName(string name)
    {
        var sanitized = name.ToLowerInvariant()
            .Replace(' ', '-')
            .Replace('/', '-')
            .Replace('\\', '-');

        return new string(sanitized.Where(c => char.IsLetterOrDigit(c) || c is '-' or '_').ToArray());
    }
}
