using DepVault.Cli.Auth;
using DepVault.Cli.Commands.Scan;
using DepVault.Cli.Crypto;
using DepVault.Cli.Services;
using DepVault.Cli.Utils;
using Spectre.Console;
using ImportBody = DepVault.Cli.ApiClient.Api.Projects.Item.Environments.Import.ImportPostRequestBody;
using ImportEntry = DepVault.Cli.ApiClient.Api.Projects.Item.Environments.Import.ImportPostRequestBody_entries;
using ImportEnvType = DepVault.Cli.ApiClient.Api.Projects.Item.Environments.Import.ImportPostRequestBody_environmentType;

namespace DepVault.Cli.Commands.Push;

/// <summary>Result of an environment file import containing count and imported variable keys.</summary>
internal sealed record ImportResult(int Imported, HashSet<string> ImportedKeys);

/// <summary>
/// Parses an environment file, encrypts each value client-side, and pushes encrypted entries to the API.
/// </summary>
internal sealed class EnvImporter(
    IApiClientFactory clientFactory,
    DekResolver dekResolver)
{
    private byte[]? cachedDek;

    /// <summary>Ensures the DEK is resolved once and cached for the session.</summary>
    public async Task<bool> EnsureDekAsync(string projectId, CancellationToken ct)
    {
        if (cachedDek is not null)
        {
            return true;
        }

        var password = dekResolver.CollectVaultPassword();
        cachedDek = await AnsiConsole.Status()
            .Spinner(Spinner.Known.Dots)
            .StartAsync("Resolving encryption key...", async _ =>
                await dekResolver.ResolveAsync(projectId, password, ct));

        return cachedDek is not null;
    }

    public async Task<ImportResult> ImportAsync(
        string projectId, DiscoveredFile file, string vaultGroupId,
        string envType, CancellationToken ct)
    {
        if (cachedDek is null)
        {
            var resolved = await EnsureDekAsync(projectId, ct);
            if (!resolved)
            {
                throw new InvalidOperationException("Failed to resolve encryption key.");
            }
        }

        var content = await File.ReadAllTextAsync(file.FullPath, ct);
        var format = EnvFileScanner.DetectEnvFormat(file.FileName);
        var pairs = EnvFormatUtils.Parse(content, format);

        var entries = new List<ImportEntry>();
        var keys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var index = 0;

        foreach (var entry in pairs)
        {
            var (ciphertext, iv, authTag) = VaultCrypto.Encrypt(entry.Value, cachedDek!);
            var importEntry = new ImportEntry
            {
                Key = entry.Key,
                EncryptedValue = ciphertext,
                Iv = iv,
                AuthTag = authTag,
                SortOrder = index
            };

            if (entry.Comment is not null)
            {
                var (commentCt, commentIv, commentTag) = VaultCrypto.Encrypt(entry.Comment, cachedDek!);
                importEntry.EncryptedComment = commentCt;
                importEntry.CommentIv = commentIv;
                importEntry.CommentAuthTag = commentTag;
            }

            entries.Add(importEntry);
            keys.Add(entry.Key);
            index++;
        }

        var result = await AnsiConsole.Status()
            .Spinner(Spinner.Known.Dots)
            .StartAsync($"Pushing {file.RelativePath}...", async _ =>
                await PostEncryptedEntriesAsync(projectId, entries, vaultGroupId, envType, ct));

        return new ImportResult(result ?? entries.Count, keys);
    }

    private async Task<int?> PostEncryptedEntriesAsync(
        string projectId, List<ImportEntry> entries,
        string vaultGroupId, string envType, CancellationToken ct)
    {
        var body = new ImportBody
        {
            Entries = entries,
            VaultGroupId = vaultGroupId,
            EnvironmentType = CommandUtils.ParseEnum(envType, ImportEnvType.DEVELOPMENT)
        };

        var client = clientFactory.Create();
        var response = await client.Api.Projects[projectId].Environments.Import
            .PostAsync(body, cancellationToken: ct);

        return (int?)response?.Imported;
    }
}
