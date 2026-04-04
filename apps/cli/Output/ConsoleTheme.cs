using Spectre.Console;

namespace DepVault.Cli.Output;

/// <summary>Static color and style constants for the CLI theme.</summary>
internal static class ConsoleTheme
{
    public static readonly Color Success = Color.Green;
    public static readonly Color Error = Color.Red;
    public static readonly Color Warning = Color.Yellow;
    public static readonly Color Info = Color.Blue;
    public static readonly Color Highlight = Color.Cyan1;
    public static readonly Color Muted = Color.Grey;
    public static readonly Color Brand = new(16, 185, 129); // #10B981 emerald

    public static readonly TableBorder Border = TableBorder.Rounded;

    // Markup-safe color strings for use in [color]...[/] syntax
    public static readonly string BrandMarkup = Brand.ToMarkup();
    public static readonly string HighlightMarkup = Highlight.ToMarkup();
    public static readonly string MutedMarkup = Muted.ToMarkup();
    public static readonly string SuccessMarkup = Success.ToMarkup();
    public static readonly string WarningMarkup = Warning.ToMarkup();
}
