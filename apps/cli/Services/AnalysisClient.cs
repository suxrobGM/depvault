using DepVault.Cli.ApiClient.Api.Projects.Item.Analyses;
using DepVault.Cli.Auth;

namespace DepVault.Cli.Services;

/// <summary>Result of a single dependency file analysis.</summary>
public sealed class AnalysisResult
{
    public required double HealthScore { get; init; }
    public required List<AnalysesPostResponse_dependencies> Dependencies { get; init; }
    public int TotalVulnerabilities => Dependencies.Sum(d => d.Vulnerabilities?.Count ?? 0);
}

/// <summary>Wraps the analysis API call so both the `analyze` command and `scan` command share the same logic.</summary>
public sealed class AnalysisClient(IApiClientFactory clientFactory)
{
    public async Task<AnalysisResult?> AnalyzeFileAsync(
        string projectId,
        string fileName,
        string filePath,
        string content,
        AnalysesPostRequestBody_ecosystem? ecosystem,
        CancellationToken ct)
    {
        var client = clientFactory.Create();

        var response = await client.Api.Projects[projectId].Analyses.PostAsync(
            new AnalysesPostRequestBody
            {
                FileName = fileName,
                FilePath = filePath,
                Content = content,
                Ecosystem = ecosystem
            }, cancellationToken: ct);

        if (response is null)
        {
            return null;
        }

        return new AnalysisResult
        {
            HealthScore = response.HealthScore ?? 0,
            Dependencies = response.Dependencies ?? []
        };
    }
}
