namespace DepVault.Cli.Output;

/// <summary>Whether the caller (typically a per-file loop) should keep going or abort.</summary>
public enum ErrorDisposition
{
    Continue,
    Abort
}

/// <summary>
/// Single in-command error policy. Renders the appropriate output and returns a disposition:
/// auth errors render the auth panel once and signal <see cref="ErrorDisposition.Abort"/>; plan-limit
/// and generic errors render and signal <see cref="ErrorDisposition.Continue"/> so per-file loops can
/// finish. Does not re-throw — the top-level handler in <c>Program.cs</c> covers escapes.
/// </summary>
public interface IErrorHandler
{
    ErrorDisposition Handle(Exception ex, string fallbackMessage);
}

public sealed class ErrorHandler(IOutputFormatter output) : IErrorHandler
{
    public ErrorDisposition Handle(Exception ex, string fallbackMessage)
    {
        if (ApiErrorHandler.IsAuthError(ex))
        {
            ApiErrorHandler.PrintAuthError();
            return ErrorDisposition.Abort;
        }

        if (ApiErrorHandler.IsPlanLimitError(ex))
        {
            ApiErrorHandler.PrintPlanLimitError(ex.Message);
            return ErrorDisposition.Continue;
        }

        output.PrintError($"{fallbackMessage}: {ex.Message}");
        return ErrorDisposition.Continue;
    }
}
