namespace DepVault.Cli.Commands.Scan;

internal sealed class ScanResults
{
    public int FilesAnalyzed { get; set; }
    public int TotalDependencies { get; set; }
    public int TotalVulnerabilities { get; set; }
    public List<(string Path, double Score)> HealthScores { get; } = [];
    public int EnvVariablesPushed { get; set; }
    public int SecretLeaksFound { get; set; }
    public int SecretFilesUploaded { get; set; }
}
