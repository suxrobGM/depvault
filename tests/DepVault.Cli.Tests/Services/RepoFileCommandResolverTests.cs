using DepVault.Cli.Services;
using AppEntry = DepVault.Cli.ApiClient.Api.Projects.Item.RepoMap.RepoMapGetResponse_apps;
using FileEntry = DepVault.Cli.ApiClient.Api.Projects.Item.RepoMap.RepoMapGetResponse_apps_files;
using RepoFileKind = DepVault.Cli.ApiClient.Api.Projects.Item.RepoMap.RepoMapGetResponse_apps_files_kind;

namespace DepVault.Cli.Tests.Services;

public sealed class RepoFileCommandResolverTests
{
    private static FileEntry File(string path, string? env, RepoFileKind kind = RepoFileKind.CONFIG)
        => new() { RelativePath = path, EnvironmentSlug = env, Kind = kind, Id = path };

    private static AppEntry App(string name, string appPath, params FileEntry[] files)
        => new() { Name = name, AppPath = appPath, Files = files.ToList() };

    [Fact]
    public void SelectFiles_FiltersAppEnvironmentBaseAndSecrets()
    {
        var apps = new List<AppEntry>
        {
            App("web", "apps/web", File("apps/web/.env.prod", "prod")),
            App("api", "apps/api",
                File("apps/api/.env", "base"),
                File("apps/api/.env.prod", "prod"),
                File("apps/api/secret.txt", "prod", RepoFileKind.SECRET))
        };

        var match = RepoFileCommandResolver.SelectFiles(
            apps,
            appFilter: "apps/api",
            envFilter: "prod",
            includeBase: false,
            includeSecrets: false,
            operationName: "pull",
            output: new NoOpOutput());

        Assert.Equal(RepoFileCommandMatchStatus.Success, match.Status);
        var file = Assert.Single(match.Files);
        Assert.Equal("apps/api/.env.prod", file.RelativePath);
    }

    [Fact]
    public void SelectFiles_EmptyRepoMap_ReturnsNoApps()
    {
        var match = RepoFileCommandResolver.SelectFiles(
            [],
            appFilter: null,
            envFilter: null,
            includeBase: true,
            includeSecrets: true,
            operationName: "purge",
            output: new NoOpOutput());

        Assert.Equal(RepoFileCommandMatchStatus.NoApps, match.Status);
        Assert.Empty(match.Files);
    }

    [Fact]
    public void SelectFiles_AppFilterMiss_ReturnsNoAppMatch()
    {
        var match = RepoFileCommandResolver.SelectFiles(
            [App("web", "apps/web", File("apps/web/.env", "base"))],
            appFilter: "api",
            envFilter: null,
            includeBase: true,
            includeSecrets: true,
            operationName: "pull",
            output: new NoOpOutput());

        Assert.Equal(RepoFileCommandMatchStatus.NoAppMatch, match.Status);
        Assert.Empty(match.Files);
    }

    [Fact]
    public void SelectFiles_NoMatchingFiles_ReturnsNoFiles()
    {
        var match = RepoFileCommandResolver.SelectFiles(
            [App("web", "apps/web", File("apps/web/.env.prod", "prod"))],
            appFilter: null,
            envFilter: "dev",
            includeBase: false,
            includeSecrets: true,
            operationName: "pull",
            output: new NoOpOutput());

        Assert.Equal(RepoFileCommandMatchStatus.NoFiles, match.Status);
        Assert.Empty(match.Files);
    }
}
