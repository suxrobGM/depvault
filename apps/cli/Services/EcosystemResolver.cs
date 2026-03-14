using DepVault.Cli.ApiClient.Projects.Item.Analyses;

namespace DepVault.Cli.Services;

internal static class EcosystemResolver
{
    public static readonly Dictionary<string, AnalysesPostRequestBody_ecosystem> Map =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["package.json"] = AnalysesPostRequestBody_ecosystem.NODEJS,
            ["package-lock.json"] = AnalysesPostRequestBody_ecosystem.NODEJS,
            ["yarn.lock"] = AnalysesPostRequestBody_ecosystem.NODEJS,
            ["pnpm-lock.yaml"] = AnalysesPostRequestBody_ecosystem.NODEJS,
            ["requirements.txt"] = AnalysesPostRequestBody_ecosystem.PYTHON,
            ["pyproject.toml"] = AnalysesPostRequestBody_ecosystem.PYTHON,
            ["Pipfile"] = AnalysesPostRequestBody_ecosystem.PYTHON,
            ["poetry.lock"] = AnalysesPostRequestBody_ecosystem.PYTHON,
            ["Cargo.toml"] = AnalysesPostRequestBody_ecosystem.RUST,
            ["Cargo.lock"] = AnalysesPostRequestBody_ecosystem.RUST,
            ["go.mod"] = AnalysesPostRequestBody_ecosystem.GO,
            ["pom.xml"] = AnalysesPostRequestBody_ecosystem.KOTLIN,
            ["build.gradle"] = AnalysesPostRequestBody_ecosystem.KOTLIN,
            ["build.gradle.kts"] = AnalysesPostRequestBody_ecosystem.KOTLIN,
            ["Gemfile"] = AnalysesPostRequestBody_ecosystem.RUBY,
            ["composer.json"] = AnalysesPostRequestBody_ecosystem.PHP
        };

    /// <summary>Resolves ecosystem from file name, including .csproj suffix matching.</summary>
    public static AnalysesPostRequestBody_ecosystem? Resolve(string fileName)
    {
        if (fileName.EndsWith(".csproj", StringComparison.OrdinalIgnoreCase)
            || fileName.Equals("packages.config", StringComparison.OrdinalIgnoreCase)
            || fileName.Equals("Directory.Packages.props", StringComparison.OrdinalIgnoreCase))
        {
            return AnalysesPostRequestBody_ecosystem.DOTNET;
        }

        return Map.TryGetValue(fileName, out var ecosystem) ? ecosystem : null;
    }

    /// <summary>Checks if a file name is a known dependency file.</summary>
    public static bool IsDependencyFile(string fileName)
    {
        return Resolve(fileName) is not null;
    }
}
