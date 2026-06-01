namespace DepVault.Cli.Output;

/// <summary>
/// Thrown when the user cancels an interactive prompt by pressing Esc. Callers should treat this as
/// a non-fatal abort of the current action — return to the REPL prompt or exit cleanly, not an error.
/// </summary>
public sealed class PromptCanceledException() : Exception("Operation canceled.");
