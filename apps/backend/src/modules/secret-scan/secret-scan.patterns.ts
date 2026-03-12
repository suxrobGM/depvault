import type { DetectionSeverity } from "@/generated/prisma";

interface BuiltInPattern {
  name: string;
  regex: string;
  severity: DetectionSeverity;
  remediation: string;
}

export const BUILT_IN_PATTERNS: BuiltInPattern[] = [
  {
    name: "AWS Access Key ID",
    regex: "AKIA[0-9A-Z]{16}",
    severity: "CRITICAL",
    remediation:
      "Immediately deactivate the key in AWS IAM console. Create a new key pair and update all services using the compromised key.",
  },
  {
    name: "AWS Secret Access Key",
    regex: "aws_secret_access_key\\s*[:=]\\s*[A-Za-z0-9/+=]{40}",
    severity: "CRITICAL",
    remediation:
      "Deactivate the associated access key in AWS IAM. Rotate the secret key and audit CloudTrail logs for unauthorized usage.",
  },
  {
    name: "GitHub Token (Classic)",
    regex: "ghp_[A-Za-z0-9_]{36}",
    severity: "CRITICAL",
    remediation:
      "Revoke the token immediately at github.com/settings/tokens. Generate a new token with minimal required scopes.",
  },
  {
    name: "GitHub Token (Fine-Grained)",
    regex: "github_pat_[A-Za-z0-9_]{22,}",
    severity: "CRITICAL",
    remediation:
      "Revoke the token at github.com/settings/tokens. Create a new fine-grained token scoped to only the required repositories.",
  },
  {
    name: "Stripe Secret Key",
    regex: "sk_live_[A-Za-z0-9]{24,}",
    severity: "CRITICAL",
    remediation:
      "Roll the API key in the Stripe Dashboard under Developers > API keys. Update all integrations with the new key.",
  },
  {
    name: "Stripe Publishable Key",
    regex: "pk_live_[A-Za-z0-9]{24,}",
    severity: "MEDIUM",
    remediation:
      "While publishable keys are less sensitive, roll the key in Stripe Dashboard to prevent potential misuse.",
  },
  {
    name: "GCP Service Account Key",
    regex: '"type"\\s*:\\s*"service_account"',
    severity: "CRITICAL",
    remediation:
      "Delete the service account key in Google Cloud Console. Create a new key and use Workload Identity Federation where possible.",
  },
  {
    name: "Private Key Header",
    regex: "-----BEGIN (RSA|EC|DSA|ED25519|OPENSSH) PRIVATE KEY-----",
    severity: "CRITICAL",
    remediation:
      "Revoke and regenerate the private key. Update all systems that rely on this key pair. Consider using a secrets manager.",
  },
  {
    name: "Generic API Key",
    regex: "(api[_-]?key|apikey)\\s*[:=]\\s*['\"][A-Za-z0-9]{16,}['\"]",
    severity: "HIGH",
    remediation:
      "Identify the service this API key belongs to and rotate it. Store API keys in environment variables or a secrets manager.",
  },
  {
    name: "JWT Token",
    regex: "eyJ[A-Za-z0-9_-]{10,}\\.eyJ[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}",
    severity: "HIGH",
    remediation:
      "Invalidate the token by rotating the signing secret. Review token expiry policies and ensure tokens are not hardcoded.",
  },
  {
    name: "Database Connection String",
    regex: "(postgres|mysql|mongodb|redis)://[^\\s'\"]{10,}",
    severity: "HIGH",
    remediation:
      "Change the database password immediately. Update connection strings in all environments. Restrict database access to known IPs.",
  },
  {
    name: "Generic Secret Assignment",
    regex: "(secret|password|passwd|token)\\s*[:=]\\s*['\"][^\\s'\"]{8,}['\"]",
    severity: "MEDIUM",
    remediation:
      "Move the secret to environment variables or a secrets manager. Rotate the credential if it grants access to any service.",
  },
];

interface CompiledPattern extends BuiltInPattern {
  compiled: RegExp;
}

/** Pre-compiles all built-in patterns for efficient scanning. */
export function compilePatterns(patterns: Pick<BuiltInPattern, "regex">[]): RegExp[] {
  return patterns.map((p) => new RegExp(p.regex, "g"));
}

/** Returns built-in patterns with pre-compiled RegExp objects. */
export function getCompiledBuiltInPatterns(): CompiledPattern[] {
  return BUILT_IN_PATTERNS.map((p) => ({
    ...p,
    compiled: new RegExp(p.regex, "g"),
  }));
}
