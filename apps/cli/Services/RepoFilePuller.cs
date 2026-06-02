using DepVault.Cli.Auth;
using DepVault.Cli.Crypto;
using DepVault.Cli.Output;
using FileEntry = DepVault.Cli.ApiClient.Api.Projects.Item.RepoMap.RepoMapGetResponse_apps_files;

namespace DepVault.Cli.Services;

/// <summary>
/// Fetches each file's encrypted blob, decrypts it with the project DEK, and writes the plaintext
/// bytes verbatim to its exact <c>relativePath</c> under the output directory. No re-serialization
/// happens — config and secret files alike are restored byte-for-byte as they were pushed.
/// </summary>
public sealed class RepoFilePuller(
    IApiClientFactory clientFactory,
    IOutputFormatter output,
    IErrorHandler errorHandler)
{
    /// <summary>
    /// Pulls the given file entries for a project and writes them to disk. Returns the number of
    /// files successfully written.
    /// </summary>
    public async Task<int> PullAsync(
        string projectId,
        IReadOnlyList<FileEntry> entries,
        string outputDir,
        byte[] dek,
        CancellationToken ct)
    {
        if (entries.Count == 0)
        {
            return 0;
        }

        var client = clientFactory.Create();
        var written = 0;

        foreach (var entry in entries)
        {
            if (string.IsNullOrEmpty(entry.Id) || string.IsNullOrEmpty(entry.RelativePath))
            {
                continue;
            }

            try
            {
                var blob = await client.Api.Projects[projectId].Files[entry.Id]
                    .GetAsync(cancellationToken: ct);

                if (blob is null || string.IsNullOrEmpty(blob.EncryptedContent))
                {
                    output.PrintError($"Failed to pull {entry.RelativePath}: empty response");
                    continue;
                }

                var plaintext = VaultCrypto.DecryptBytes(
                    blob.EncryptedContent, blob.Iv ?? "", blob.AuthTag ?? "", dek);

                var filePath = ResolveTargetPath(outputDir, entry.RelativePath);
                await File.WriteAllBytesAsync(filePath, plaintext, ct);

                output.PrintSuccess($"  {Path.GetRelativePath(outputDir, filePath)}");
                written++;
            }
            catch (Exception ex)
            {
                if (errorHandler.Handle(ex, $"Failed to pull {entry.RelativePath}") == ErrorDisposition.Abort)
                {
                    break;
                }
            }
        }

        return written;
    }

    /// <summary>Resolves the absolute target path and ensures its parent directory exists.</summary>
    private static string ResolveTargetPath(string outputDir, string relativePath)
    {
        var normalized = relativePath.Replace('\\', '/').TrimStart('/');
        var filePath = Path.GetFullPath(Path.Combine(outputDir, normalized));

        var dir = Path.GetDirectoryName(filePath);
        if (!string.IsNullOrEmpty(dir))
        {
            Directory.CreateDirectory(dir);
        }

        return filePath;
    }
}
