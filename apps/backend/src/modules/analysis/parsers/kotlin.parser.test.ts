import { describe, expect, it } from "bun:test";
import { kotlinParser } from "./kotlin.parser";

describe("kotlinParser", () => {
  describe("canParse", () => {
    it("should accept libs.versions.toml", () => {
      expect(kotlinParser.canParse("libs.versions.toml")).toBe(true);
    });

    it("should be case-insensitive", () => {
      expect(kotlinParser.canParse("Libs.Versions.Toml")).toBe(true);
      expect(kotlinParser.canParse("LIBS.VERSIONS.TOML")).toBe(true);
    });

    it("should reject unsupported files", () => {
      expect(kotlinParser.canParse("build.gradle.kts")).toBe(false);
      expect(kotlinParser.canParse("settings.gradle.kts")).toBe(false);
      expect(kotlinParser.canParse("versions.toml")).toBe(false);
    });
  });

  describe("parse", () => {
    it("should parse libraries with module and version.ref", () => {
      const content = `
[versions]
ktor = "2.3.7"
kotlin = "1.9.21"

[libraries]
ktor-core = { module = "io.ktor:ktor-client-core", version.ref = "ktor" }
ktor-cio = { module = "io.ktor:ktor-client-cio", version.ref = "ktor" }
`;

      const result = kotlinParser.parse(content, "libs.versions.toml");

      expect(result.fileName).toBe("libs.versions.toml");
      expect(result.dependencies).toHaveLength(2);
      expect(result.dependencies).toContainEqual({
        name: "io.ktor:ktor-client-core",
        version: "2.3.7",
        isDirect: true,
      });
      expect(result.dependencies).toContainEqual({
        name: "io.ktor:ktor-client-cio",
        version: "2.3.7",
        isDirect: true,
      });
    });

    it("should parse libraries with group and name", () => {
      const content = `
[versions]
compose = "1.5.4"

[libraries]
compose-ui = { group = "androidx.compose.ui", name = "ui", version.ref = "compose" }
`;

      const result = kotlinParser.parse(content, "libs.versions.toml");

      expect(result.dependencies).toHaveLength(1);
      expect(result.dependencies[0]).toEqual({
        name: "androidx.compose.ui:ui",
        version: "1.5.4",
        isDirect: true,
      });
    });

    it("should parse libraries with inline version", () => {
      const content = `
[libraries]
junit = { module = "junit:junit", version = "4.13.2" }
`;

      const result = kotlinParser.parse(content, "libs.versions.toml");

      expect(result.dependencies).toHaveLength(1);
      expect(result.dependencies[0]).toEqual({
        name: "junit:junit",
        version: "4.13.2",
        isDirect: true,
      });
    });

    it("should parse simple string libraries (group:artifact:version)", () => {
      const content = `
[libraries]
gson = "com.google.code.gson:gson:2.10.1"
`;

      const result = kotlinParser.parse(content, "libs.versions.toml");

      expect(result.dependencies).toHaveLength(1);
      expect(result.dependencies[0]).toEqual({
        name: "com.google.code.gson:gson",
        version: "2.10.1",
        isDirect: true,
      });
    });

    it("should parse plugins section", () => {
      const content = `
[versions]
agp = "8.2.0"
kotlin = "1.9.21"

[plugins]
android-application = { id = "com.android.application", version.ref = "agp" }
kotlin-jvm = { id = "org.jetbrains.kotlin.jvm", version.ref = "kotlin" }
`;

      const result = kotlinParser.parse(content, "libs.versions.toml");

      expect(result.dependencies).toHaveLength(2);
      expect(result.dependencies).toContainEqual({
        name: "com.android.application",
        version: "8.2.0",
        isDirect: true,
      });
      expect(result.dependencies).toContainEqual({
        name: "org.jetbrains.kotlin.jvm",
        version: "1.9.21",
        isDirect: true,
      });
    });

    it("should handle mixed libraries and plugins", () => {
      const content = `
[versions]
ktor = "2.3.7"
agp = "8.2.0"

[libraries]
ktor-core = { module = "io.ktor:ktor-client-core", version.ref = "ktor" }

[plugins]
android-application = { id = "com.android.application", version.ref = "agp" }
`;

      const result = kotlinParser.parse(content, "libs.versions.toml");
      expect(result.dependencies).toHaveLength(2);
    });

    it("should handle missing version reference gracefully", () => {
      const content = `
[libraries]
unknown-lib = { module = "com.example:unknown", version.ref = "nonexistent" }
`;

      const result = kotlinParser.parse(content, "libs.versions.toml");

      expect(result.dependencies).toHaveLength(1);
      expect(result.dependencies[0]!.version).toBe("*");
    });

    it("should skip comments and empty lines", () => {
      const content = `
# This is a comment
[versions]
ktor = "2.3.7"

# Library definitions
[libraries]
# Main library
ktor-core = { module = "io.ktor:ktor-client-core", version.ref = "ktor" }
`;

      const result = kotlinParser.parse(content, "libs.versions.toml");
      expect(result.dependencies).toHaveLength(1);
    });

    it("should handle empty libraries section", () => {
      const content = `
[versions]
ktor = "2.3.7"

[libraries]

[plugins]
`;

      const result = kotlinParser.parse(content, "libs.versions.toml");
      expect(result.dependencies).toHaveLength(0);
    });

    it("should throw on empty content", () => {
      expect(() => kotlinParser.parse("", "libs.versions.toml")).toThrow("Empty file");
      expect(() => kotlinParser.parse("   ", "libs.versions.toml")).toThrow("Empty file");
    });

    it("should ignore unknown sections", () => {
      const content = `
[versions]
ktor = "2.3.7"

[bundles]
ktor = ["ktor-core", "ktor-cio"]

[libraries]
ktor-core = { module = "io.ktor:ktor-client-core", version.ref = "ktor" }
`;

      const result = kotlinParser.parse(content, "libs.versions.toml");
      expect(result.dependencies).toHaveLength(1);
    });
  });
});
