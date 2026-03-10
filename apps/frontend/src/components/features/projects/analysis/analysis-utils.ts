export const ECOSYSTEMS = [
  { value: "NODEJS", label: "Node.js", defaultFile: "package.json" },
  { value: "PYTHON", label: "Python", defaultFile: "requirements.txt" },
] as const;

export type EcosystemValue = (typeof ECOSYSTEMS)[number]["value"];

export function getHealthColor(score: number | null): "success" | "warning" | "error" | "default" {
  if (score === null) return "default";
  if (score >= 80) return "success";
  if (score >= 50) return "warning";
  return "error";
}

export function getEcosystemLabel(ecosystem: string): string {
  const labels: Record<string, string> = {
    NODEJS: "Node.js",
    PYTHON: "Python",
    RUST: "Rust",
    DOTNET: ".NET",
    GO: "Go",
    JAVA: "Java",
    RUBY: "Ruby",
    PHP: "PHP",
  };
  return labels[ecosystem] ?? ecosystem;
}

const REGISTRY_URLS: Record<string, (name: string) => string> = {
  NODEJS: (name) => `https://www.npmjs.com/package/${name}`,
  PYTHON: (name) => `https://pypi.org/project/${name}`,
  RUST: (name) => `https://crates.io/crates/${name}`,
  GO: (name) => `https://pkg.go.dev/${name}`,
  JAVA: (name) => {
    const [group, artifact] = name.includes(":") ? name.split(":") : ["", name];
    return group
      ? `https://central.sonatype.com/artifact/${group}/${artifact}`
      : `https://central.sonatype.com/search?q=${artifact}`;
  },
  RUBY: (name) => `https://rubygems.org/gems/${name}`,
  PHP: (name) => `https://packagist.org/packages/${name}`,
  DOTNET: (name) => `https://www.nuget.org/packages/${name}`,
};

export function getPackageUrl(ecosystem: string, packageName: string): string | null {
  const builder = REGISTRY_URLS[ecosystem];
  return builder ? builder(packageName) : null;
}

export const STATUS_VARIANT: Record<string, "success" | "warning" | "error" | "default"> = {
  UP_TO_DATE: "success",
  MINOR_UPDATE: "warning",
  MAJOR_UPDATE: "error",
  DEPRECATED: "error",
};

export const STATUS_LABEL: Record<string, string> = {
  UP_TO_DATE: "Up to date",
  MINOR_UPDATE: "Minor update",
  MAJOR_UPDATE: "Major update",
  DEPRECATED: "Deprecated",
};

export const STATUS_ORDER: Record<string, number> = {
  DEPRECATED: 0,
  MAJOR_UPDATE: 1,
  MINOR_UPDATE: 2,
  UP_TO_DATE: 3,
};
