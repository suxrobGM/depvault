using System.CommandLine;
using DepVault.Cli.Auth;
using DepVault.Cli.Crypto;
using DepVault.Cli.Output;
using Spectre.Console;

namespace DepVault.Cli.Commands;

/// <summary>
/// CI/CD pipeline commands. Authenticates via the <c>DEPVAULT_TOKEN</c> env var and restores
/// every config/secret blob to disk verbatim. All decryption happens client-side — the server
/// only ever returns ciphertext.
/// </summary>
public sealed class CiCommands(
    IApiClientFactory clientFactory, AuthContext ctx, DekService dekService)
{
    public Command CreateCiCommand()
    {
        var cmd = new Command("ci", "CI/CD pipeline commands")
        {
            CreatePullCommand()
        };
        return cmd;
    }

    private Command CreatePullCommand()
    {
        var formatOpt = new Option<string>("--format")
        { Description = "Output format (text, json) for the summary of written files", DefaultValueFactory = _ => "text" };
        var outputOpt = new Option<string?>("--output")
        { Description = "Directory to restore files into (defaults to current directory)" };

        var cmd = new Command("pull", "Restore config & secret files using a CI token (DEPVAULT_TOKEN)")
        {
            formatOpt,
            outputOpt
        };

        cmd.SetAction(async (parseResult, cancellationToken) =>
        {
            if (!ctx.IsCiMode())
            {
                ctx.Output.PrintError($"CI pull requires the {Constants.CiTokenEnvVar} environment variable.");
                Environment.ExitCode = 1;
                return;
            }

            var client = clientFactory.Create();
            var result = await client.Api.Ci.Secrets.GetAsync(cancellationToken: cancellationToken);

            if (result is null)
            {
                ctx.Output.PrintError("No secrets returned.");
                Environment.ExitCode = 1;
                return;
            }

            byte[]? dek;
            try
            {
                dek = await dekService.ResolveCiDekAsync(cancellationToken);
            }
            catch (Exception ex)
            {
                ctx.Output.PrintError($"Failed to unwrap the project key: {ex.Message}");
                Environment.ExitCode = 1;
                return;
            }

            if (dek is null)
            {
                ctx.Output.PrintError("Failed to unwrap the project key.");
                Environment.ExitCode = 1;
                return;
            }

            var outputDir = parseResult.GetValue(outputOpt) ?? Directory.GetCurrentDirectory();
            var written = new List<string>();
            var failed = 0;

            foreach (var file in result.Files ?? [])
            {
                if (TryRestore(
                        file.RelativePath, file.EncryptedContent, file.Iv, file.AuthTag,
                        dek, outputDir, out var path))
                {
                    written.Add(path);
                }
                else
                {
                    failed++;
                }
            }

            if (parseResult.GetValue(formatOpt) == "json")
            {
                ctx.Output.PrintJson(new { written, failed });
            }
            else
            {
                foreach (var path in written)
                {
                    AnsiConsole.MarkupLine($"[green]Restored[/] {Markup.Escape(path)}");
                }

                AnsiConsole.MarkupLine($"[cyan1]Restored {written.Count} file(s).[/]");
                if (failed > 0)
                {
                    AnsiConsole.MarkupLine($"[red]{failed} file(s) failed to restore.[/]");
                }
            }

            if (failed > 0)
            {
                Environment.ExitCode = 1;
            }
        });

        return cmd;
    }

    /// <summary>
    /// Decrypts a single blob client-side and writes the plaintext to its relative path under
    /// <paramref name="outputDir"/>, recreating intermediate directories. Returns false on any failure.
    /// </summary>
    private bool TryRestore(
        string? relativePath, string? encryptedContent, string? iv, string? authTag,
        byte[] dek, string outputDir, out string writtenPath)
    {
        writtenPath = "";

        if (string.IsNullOrEmpty(relativePath) || string.IsNullOrEmpty(encryptedContent))
        {
            return false;
        }

        try
        {
            var plaintext = VaultCrypto.DecryptBytes(encryptedContent, iv ?? "", authTag ?? "", dek);

            var safeRelative = relativePath.Replace('\\', '/').TrimStart('/');
            var fullPath = Path.GetFullPath(Path.Combine(outputDir, safeRelative));

            var dir = Path.GetDirectoryName(fullPath);
            if (!string.IsNullOrEmpty(dir))
            {
                Directory.CreateDirectory(dir);
            }

            File.WriteAllBytes(fullPath, plaintext);
            writtenPath = fullPath;
            return true;
        }
        catch (Exception ex)
        {
            ctx.Output.PrintError($"Failed to restore {relativePath}: {ex.Message}");
            return false;
        }
    }
}
