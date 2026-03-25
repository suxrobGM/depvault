using System.Text.Json;
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

        cachedDek = await AnsiConsole.Status()
            .Spinner(Spinner.Known.Dots)
            .StartAsync("Resolving encryption key...", async _ =>
                await dekResolver.ResolveAsync(projectId, ct));

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
        var pairs = ParseKeyValuePairs(content, format);

        var entries = new List<ImportEntry>();
        var keys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var (key, value) in pairs)
        {
            var (ciphertext, iv, authTag) = VaultCrypto.Encrypt(value, cachedDek!);
            entries.Add(new ImportEntry
            {
                Key = key,
                EncryptedValue = ciphertext,
                Iv = iv,
                AuthTag = authTag
            });
            keys.Add(key);
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

    internal static List<KeyValuePair<string, string>> ParseKeyValuePairs(string content, string format)
    {
        if (format.Contains("json", StringComparison.OrdinalIgnoreCase))
        {
            return ParseJsonPairs(content);
        }

        return ParseEnvPairs(content);
    }

    private static List<KeyValuePair<string, string>> ParseEnvPairs(string content)
    {
        var pairs = new List<KeyValuePair<string, string>>();

        foreach (var rawLine in content.Split('\n'))
        {
            var line = rawLine.Trim();
            if (line.Length == 0 || line[0] == '#')
            {
                continue;
            }

            var eqIndex = line.IndexOf('=');
            if (eqIndex <= 0)
            {
                continue;
            }

            var key = line[..eqIndex].Trim();
            var value = line[(eqIndex + 1)..].Trim();

            // Strip surrounding quotes
            if (value.Length >= 2 &&
                ((value[0] == '"' && value[^1] == '"') ||
                 (value[0] == '\'' && value[^1] == '\'')))
            {
                value = value[1..^1];
            }

            pairs.Add(new KeyValuePair<string, string>(key, value));
        }

        return pairs;
    }

    private static List<KeyValuePair<string, string>> ParseJsonPairs(string content)
    {
        var pairs = new List<KeyValuePair<string, string>>();

        try
        {
            using var doc = JsonDocument.Parse(content);
            FlattenJsonElement(doc.RootElement, "", pairs);
        }
        catch (JsonException)
        {
            // Fall back to env parsing if JSON is invalid
            return ParseEnvPairs(content);
        }

        return pairs;
    }

    private static void FlattenJsonElement(
        JsonElement element, string prefix, List<KeyValuePair<string, string>> pairs)
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.Object:
                foreach (var prop in element.EnumerateObject())
                {
                    var key = string.IsNullOrEmpty(prefix) ? prop.Name : $"{prefix}__{prop.Name}";
                    FlattenJsonElement(prop.Value, key, pairs);
                }
                break;

            case JsonValueKind.Array:
                var index = 0;
                foreach (var item in element.EnumerateArray())
                {
                    FlattenJsonElement(item, $"{prefix}__{index}", pairs);
                    index++;
                }
                break;

            default:
                var value = element.ValueKind == JsonValueKind.String
                    ? element.GetString() ?? ""
                    : element.GetRawText();
                pairs.Add(new KeyValuePair<string, string>(prefix, value));
                break;
        }
    }
}
