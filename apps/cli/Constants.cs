namespace DepVault.Cli;

internal static class Constants
{
    public const string CiTokenEnvVar = "DEPVAULT_TOKEN";
    public const string GitHubRepo = "suxrobGM/depvault";
    public const string GitHubReleaseTagPrefix = "cli/v";

    public static readonly string ConfigDir = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".depvault");

    public static readonly string VersionCheckPath = Path.Combine(ConfigDir, "version-check.json");
}
