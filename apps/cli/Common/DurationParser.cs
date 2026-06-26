namespace DepVault.Cli.Common;

/// <summary>Parses short durations like <c>30m</c>/<c>8h</c>/<c>7d</c> for the remembered-unlock TTL.</summary>
public static class DurationParser
{
    public static readonly TimeSpan DefaultTtl = TimeSpan.FromDays(7);
    public static readonly TimeSpan MaxTtl = TimeSpan.FromDays(30);

    /// <summary>Parses <c>&lt;number&gt;&lt;s|m|h|d&gt;</c>; null on empty/malformed/non-positive/overflow.</summary>
    public static TimeSpan? TryParse(string? input)
    {
        if (string.IsNullOrWhiteSpace(input))
        {
            return null;
        }

        var trimmed = input.Trim();
        var unit = trimmed[^1];
        var numberPart = trimmed[..^1];

        if (!long.TryParse(numberPart, out var value) || value <= 0)
        {
            return null;
        }

        try
        {
            return unit switch
            {
                's' or 'S' => TimeSpan.FromSeconds(value),
                'm' or 'M' => TimeSpan.FromMinutes(value),
                'h' or 'H' => TimeSpan.FromHours(value),
                'd' or 'D' => TimeSpan.FromDays(value),
                _ => null
            };
        }
        catch (OverflowException)
        {
            return null;
        }
    }

    /// <summary>Parsed value clamped to <see cref="MaxTtl"/>, <see cref="DefaultTtl"/> when blank, or null when invalid (so callers can warn).</summary>
    public static TimeSpan? ResolveTtl(string? input)
    {
        if (string.IsNullOrWhiteSpace(input))
        {
            return DefaultTtl;
        }

        var parsed = TryParse(input);
        if (parsed is null)
        {
            return null;
        }

        return parsed.Value > MaxTtl ? MaxTtl : parsed.Value;
    }
}
