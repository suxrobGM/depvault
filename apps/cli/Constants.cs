namespace DepVault.Cli;

internal static class Constants
{
    public const string CiTokenEnvVar = "DEPVAULT_TOKEN";

    public static readonly string ConfigDir = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".depvault");
}
