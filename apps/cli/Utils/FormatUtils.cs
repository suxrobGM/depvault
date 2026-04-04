namespace DepVault.Cli.Utils;

public static class FormatUtils
{
    public static string FileSize(double? bytes)
    {
        if (bytes is null)
        {
            return "";
        }

        return bytes switch
        {
            < 1024 => $"{bytes:F0} B",
            < 1024 * 1024 => $"{bytes / 1024:F1} KB",
            _ => $"{bytes / (1024 * 1024):F1} MB"
        };
    }
}
