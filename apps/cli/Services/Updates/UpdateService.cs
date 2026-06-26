using System.IO.Compression;
using System.Runtime.InteropServices;
using Spectre.Console;
using DepVault.Cli.Output;

namespace DepVault.Cli.Services;

/// <summary>Downloads and installs the latest CLI binary from GitHub Releases.</summary>
public interface IUpdateService
{
    Task<bool> UpdateAsync(CancellationToken ct = default);
}

public sealed class UpdateService(IVersionChecker versionChecker, IGitHubReleaseClient gitHub) : IUpdateService
{
    private static readonly HttpClient Http = new()
    {
        DefaultRequestHeaders =
        {
            { "User-Agent", "depvault-cli" }
        },
        Timeout = TimeSpan.FromMinutes(2)
    };

    public async Task<bool> UpdateAsync(CancellationToken ct = default)
    {
        var current = versionChecker.GetCurrentVersion();

        var latest = await AnsiConsole.Status()
            .Spinner(Spinner.Known.Dots)
            .StartAsync("Checking for updates...", async _ => await versionChecker.GetLatestVersionAsync(ct));

        if (latest is null)
        {
            AnsiConsole.MarkupLine($"[{ConsoleTheme.Error.ToMarkup()}]Could not check for updates. Please check your internet connection.[/]");
            return false;
        }

        if (!VersionChecker.IsNewer(latest, current))
        {
            AnsiConsole.MarkupLine($"[{ConsoleTheme.Success.ToMarkup()}]You are already on the latest version (v{current}).[/]");
            return true;
        }

        AnsiConsole.MarkupLine($"[{ConsoleTheme.Info.ToMarkup()}]Updating v{current} -> v{latest}...[/]");

        var rid = DetectRid();
        if (rid is null)
        {
            AnsiConsole.MarkupLine($"[{ConsoleTheme.Error.ToMarkup()}]Unsupported platform. Please update manually.[/]");
            return false;
        }

        var downloadUrl = gitHub.BuildDownloadUrl(latest, rid);
        var currentBinaryPath = Environment.ProcessPath;

        if (string.IsNullOrEmpty(currentBinaryPath))
        {
            AnsiConsole.MarkupLine($"[{ConsoleTheme.Error.ToMarkup()}]Could not determine the current binary path.[/]");
            return false;
        }

        var success = await AnsiConsole.Status()
            .Spinner(Spinner.Known.Dots)
            .StartAsync("Downloading...", async _ =>
            {
                return await DownloadAndInstallAsync(downloadUrl, currentBinaryPath, ct);
            });

        if (success)
        {
            AnsiConsole.MarkupLine($"[{ConsoleTheme.Success.ToMarkup()}]Successfully updated to v{latest}![/]");
        }

        return success;
    }

    private static async Task<bool> DownloadAndInstallAsync(
        string url, string currentBinaryPath, CancellationToken ct)
    {
        var tempDir = Path.Combine(Path.GetTempPath(), $"depvault-update-{Guid.NewGuid():N}");

        try
        {
            Directory.CreateDirectory(tempDir);
            var isWindows = RuntimeInformation.IsOSPlatform(OSPlatform.Windows);
            var archiveExt = isWindows ? ".zip" : ".tar.gz";
            var archivePath = Path.Combine(tempDir, $"depvault{archiveExt}");

            // Download
            using (var response = await Http.GetAsync(url, HttpCompletionOption.ResponseHeadersRead, ct))
            {
                response.EnsureSuccessStatusCode();
                await using var stream = await response.Content.ReadAsStreamAsync(ct);
                await using var file = File.Create(archivePath);
                await stream.CopyToAsync(file, ct);
            }

            // Extract to temp dir
            var extractDir = Path.Combine(tempDir, "extracted");
            Directory.CreateDirectory(extractDir);

            if (isWindows)
            {
                await ZipFile.ExtractToDirectoryAsync(archivePath, extractDir, ct);
            }
            else
            {
                await ExtractTarGzAsync(archivePath, extractDir, ct);
            }

            // Find the new binary
            var binaryName = isWindows ? "depvault.exe" : "depvault";
            var newBinaryPath = Path.Combine(extractDir, binaryName);

            if (!File.Exists(newBinaryPath))
            {
                AnsiConsole.MarkupLine($"[{ConsoleTheme.Error.ToMarkup()}]Downloaded archive does not contain the expected binary.[/]");
                return false;
            }

            // Replace the current binary
            ReplaceBinary(currentBinaryPath, newBinaryPath);
            return true;
        }
        catch (Exception ex)
        {
            AnsiConsole.MarkupLine($"[{ConsoleTheme.Error.ToMarkup()}]Update failed: {Markup.Escape(ex.Message)}[/]");
            return false;
        }
        finally
        {
            try
            { Directory.Delete(tempDir, recursive: true); }
            catch { /* cleanup is best-effort */ }
        }
    }

    private static void ReplaceBinary(string currentPath, string newPath)
    {
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
        {
            // On Windows, a running exe can't be deleted but CAN be renamed
            var backupPath = currentPath + ".old";

            if (File.Exists(backupPath))
            {
                File.Delete(backupPath);
            }

            File.Move(currentPath, backupPath);
            File.Move(newPath, currentPath);

            // Schedule cleanup of old binary
            try
            {
                File.Delete(backupPath);
            }
            catch { /* will be cleaned up next update or manually */ }
        }
        else
        {
            // On Unix, replace in place (atomic-ish via move)
            var permissions = File.GetUnixFileMode(currentPath);
            File.Move(newPath, currentPath, overwrite: true);
            File.SetUnixFileMode(currentPath, permissions);
        }
    }

    private static async Task ExtractTarGzAsync(string archivePath, string outputDir, CancellationToken ct)
    {
        var process = new System.Diagnostics.Process
        {
            StartInfo = new System.Diagnostics.ProcessStartInfo
            {
                FileName = "tar",
                ArgumentList = { "-xzf", archivePath, "-C", outputDir },
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            }
        };

        process.Start();
        await process.WaitForExitAsync(ct);

        if (process.ExitCode != 0)
        {
            var error = await process.StandardError.ReadToEndAsync(ct);
            throw new InvalidOperationException($"tar extraction failed: {error}");
        }
    }

    private static string? DetectRid()
    {
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
        {
            return "win-x64";
        }

        if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux))
        {
            return RuntimeInformation.OSArchitecture switch
            {
                Architecture.X64 => "linux-x64",
                _ => null
            };
        }

        if (RuntimeInformation.IsOSPlatform(OSPlatform.OSX))
        {
            return RuntimeInformation.OSArchitecture switch
            {
                Architecture.X64 => "osx-x64",
                Architecture.Arm64 => "osx-arm64",
                _ => null
            };
        }

        return null;
    }

}
