import { describe, expect, it } from "bun:test";
import { rustParser } from "./rust.parser";

describe("rustParser", () => {
  describe("canParse", () => {
    it("should accept Cargo.toml", () => {
      expect(rustParser.canParse("Cargo.toml")).toBe(true);
      expect(rustParser.canParse("cargo.toml")).toBe(true);
    });

    it("should reject unsupported files", () => {
      expect(rustParser.canParse("Cargo.lock")).toBe(false);
      expect(rustParser.canParse("package.json")).toBe(false);
    });
  });

  describe("parse", () => {
    it("should parse simple version dependencies", () => {
      const content = `
[package]
name = "my-project"
version = "0.1.0"

[dependencies]
serde = "1.0"
tokio = "1.28"
`;
      const result = rustParser.parse(content, "Cargo.toml");

      expect(result.dependencies).toHaveLength(2);
      expect(result.dependencies).toContainEqual({
        name: "serde",
        version: "1.0",
        isDirect: true,
      });
      expect(result.dependencies).toContainEqual({
        name: "tokio",
        version: "1.28",
        isDirect: true,
      });
    });

    it("should parse inline table dependencies with version", () => {
      const content = `
[dependencies]
serde = { version = "1.0", features = ["derive"] }
tokio = { version = "1.28", features = ["full"] }
`;
      const result = rustParser.parse(content, "Cargo.toml");

      expect(result.dependencies).toHaveLength(2);
      expect(result.dependencies).toContainEqual({
        name: "serde",
        version: "1.0",
        isDirect: true,
      });
    });

    it("should handle path/git dependencies without version as wildcard", () => {
      const content = `
[dependencies]
my-lib = { path = "../my-lib" }
other = { git = "https://github.com/user/repo" }
`;
      const result = rustParser.parse(content, "Cargo.toml");

      expect(result.dependencies).toHaveLength(2);
      expect(result.dependencies[0]!.version).toBe("*");
      expect(result.dependencies[1]!.version).toBe("*");
    });

    it("should parse dev-dependencies and build-dependencies", () => {
      const content = `
[dependencies]
serde = "1.0"

[dev-dependencies]
assert_cmd = "2.0"

[build-dependencies]
cc = "1.0"
`;
      const result = rustParser.parse(content, "Cargo.toml");

      expect(result.dependencies).toHaveLength(3);
      expect(result.dependencies.map((d) => d.name)).toEqual(["serde", "assert_cmd", "cc"]);
    });

    it("should skip non-dependency sections", () => {
      const content = `
[package]
name = "test"
version = "0.1.0"

[features]
default = ["std"]

[dependencies]
serde = "1.0"
`;
      const result = rustParser.parse(content, "Cargo.toml");

      expect(result.dependencies).toHaveLength(1);
      expect(result.dependencies[0]!.name).toBe("serde");
    });

    it("should throw on empty file", () => {
      expect(() => rustParser.parse("", "Cargo.toml")).toThrow("Empty file");
    });

    it("should handle no dependencies", () => {
      const content = `
[package]
name = "empty"
version = "0.1.0"
`;
      const result = rustParser.parse(content, "Cargo.toml");
      expect(result.dependencies).toHaveLength(0);
    });

    it("should skip comments and blank lines", () => {
      const content = `
[dependencies]
# This is a comment
serde = "1.0"

# Another comment
tokio = "1.28"
`;
      const result = rustParser.parse(content, "Cargo.toml");
      expect(result.dependencies).toHaveLength(2);
    });
  });
});
