using DepVault.Cli.ApiClient.Api.Projects;
using KiotaClient = DepVault.Cli.ApiClient;

namespace DepVault.Cli.Services.ProjectResolution;

/// <summary>Shared read of the caller's project list (single page, capped at 100).</summary>
internal static class ProjectQuery
{
    public static async Task<IReadOnlyList<ProjectsGetResponse_items>> ListAsync(
        KiotaClient.ApiClient client, CancellationToken ct)
    {
        var result = await client.Api.Projects.GetAsync(c =>
        {
            c.QueryParameters.Page = 1;
            c.QueryParameters.Limit = 100;
        }, ct);

        return result?.Items ?? [];
    }
}
