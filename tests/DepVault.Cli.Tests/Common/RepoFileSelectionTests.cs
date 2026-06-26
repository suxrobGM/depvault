using DepVault.Cli.Common;
using AppEntry = DepVault.Cli.ApiClient.Api.Projects.Item.RepoMap.RepoMapGetResponse_apps;
using FileEntry = DepVault.Cli.ApiClient.Api.Projects.Item.RepoMap.RepoMapGetResponse_apps_files;
using RepoFileKind = DepVault.Cli.ApiClient.Api.Projects.Item.RepoMap.RepoMapGetResponse_apps_files_kind;

namespace DepVault.Cli.Tests.Common;

/// <summary>Tests the selection/path logic shared by <c>pull</c> and <c>purge</c>.</summary>
public sealed class RepoFileSelectionTests
{
    private static FileEntry File(string path, string? env, RepoFileKind kind = RepoFileKind.CONFIG)
        => new() { RelativePath = path, EnvironmentSlug = env, Kind = kind, Id = path };

    private static AppEntry App(string name, string appPath, params FileEntry[] files)
        => new() { Name = name, AppPath = appPath, Files = files.ToList() };

    [Theory]
    [InlineData("  DEV ", "dev")]
    [InlineData("Prod", "prod")]
    [InlineData("", null)]
    [InlineData("   ", null)]
    [InlineData(null, null)]
    public void NormalizeEnv_LowercasesAndTrims_OrNullsBlank(string? input, string? expected)
    {
        Assert.Equal(expected, RepoFileSelection.NormalizeEnv(input));
    }

    [Fact]
    public void FilterApps_NoFilter_ReturnsAll()
    {
        var apps = new List<AppEntry> { App("web", "apps/web"), App("api", "apps/api") };
        Assert.Equal(2, RepoFileSelection.FilterApps(apps, null).Count);
    }

    [Theory]
    [InlineData("api")]
    [InlineData("APPS/API")]
    public void FilterApps_MatchesByNameOrPath_CaseInsensitive(string filter)
    {
        var apps = new List<AppEntry> { App("web", "apps/web"), App("api", "apps/api") };
        var matched = RepoFileSelection.FilterApps(apps, filter);
        Assert.Single(matched);
        Assert.Equal("api", matched[0].Name);
    }

    [Fact]
    public void FilterApps_NoMatch_ReturnsEmpty()
    {
        var apps = new List<AppEntry> { App("web", "apps/web") };
        Assert.Empty(RepoFileSelection.FilterApps(apps, "nope"));
    }

    [Fact]
    public void CollectFiles_ExcludesSecrets_WhenIncludeSecretsFalse()
    {
        var app = App("web", "apps/web",
            File(".env", "base"),
            File("secrets/db.key", "base", RepoFileKind.SECRET));

        var withSecrets = RepoFileSelection.CollectFiles([app], null, includeBase: true, includeSecrets: true);
        var withoutSecrets = RepoFileSelection.CollectFiles([app], null, includeBase: true, includeSecrets: false);

        Assert.Equal(2, withSecrets.Count);
        Assert.Single(withoutSecrets);
        Assert.All(withoutSecrets, f => Assert.NotEqual(RepoFileKind.SECRET, f.Kind));
    }

    [Fact]
    public void CollectFiles_EnvFilter_IncludesMatchingAndBase_ByDefault()
    {
        var app = App("web", "apps/web",
            File(".env", "base"),
            File(".env.dev", "dev"),
            File(".env.prod", "prod"));

        var dev = RepoFileSelection.CollectFiles([app], "dev", includeBase: true, includeSecrets: true);

        Assert.Equal(2, dev.Count); // dev + base
        Assert.Contains(dev, f => f.EnvironmentSlug == "dev");
        Assert.Contains(dev, f => f.EnvironmentSlug == "base");
        Assert.DoesNotContain(dev, f => f.EnvironmentSlug == "prod");
    }

    [Fact]
    public void CollectFiles_EnvFilter_ExcludesBase_WhenIncludeBaseFalse()
    {
        var app = App("web", "apps/web",
            File(".env", "base"),
            File(".env.dev", "dev"));

        var dev = RepoFileSelection.CollectFiles([app], "dev", includeBase: false, includeSecrets: true);

        Assert.Single(dev);
        Assert.Equal("dev", dev[0].EnvironmentSlug);
    }

    [Fact]
    public void MatchesEnvironment_NullSlug_TreatedAsBase()
    {
        Assert.True(RepoFileSelection.MatchesEnvironment(null, "dev", includeBase: true));    // base via include
        Assert.False(RepoFileSelection.MatchesEnvironment(null, "dev", includeBase: false));
    }

    [Theory]
    [InlineData("config/app.json", "config/app.json")]
    [InlineData("config\\app.json", "config/app.json")]
    [InlineData("/leading/slash.env", "leading/slash.env")]
    public void ResolveTargetPath_NormalizesSeparators_AndStripsLeadingSlash(string relative, string expectedTail)
    {
        var outputDir = Path.Combine(Path.GetTempPath(), "depvault-rfs");
        var resolved = RepoFileSelection.ResolveTargetPath(outputDir, relative);

        var expected = Path.GetFullPath(Path.Combine(outputDir, expectedTail.Replace('/', Path.DirectorySeparatorChar)));
        Assert.Equal(expected, resolved);
    }

    [Theory]
    [InlineData("../escape.env")]
    [InlineData("a/../../escape.env")]
    [InlineData("../../etc/passwd")]
    public void ResolveTargetPath_RejectsPathsEscapingOutputDir(string relative)
    {
        var outputDir = Path.Combine(Path.GetTempPath(), "depvault-rfs");
        Assert.Throws<InvalidOperationException>(() => RepoFileSelection.ResolveTargetPath(outputDir, relative));
    }
}
