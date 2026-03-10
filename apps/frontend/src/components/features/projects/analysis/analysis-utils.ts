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
