import { describe, expect, it } from "bun:test";
import { nodejsParser } from "./nodejs.parser";

describe("nodejsParser", () => {
  describe("canParse", () => {
    it("should accept package.json", () => {
      expect(nodejsParser.canParse("package.json")).toBe(true);
    });

    it("should reject unsupported files", () => {
      expect(nodejsParser.canParse("package-lock.json")).toBe(false);
      expect(nodejsParser.canParse("yarn.lock")).toBe(false);
      expect(nodejsParser.canParse("requirements.txt")).toBe(false);
    });
  });

  describe("parse - package.json", () => {
    it("should parse dependencies and devDependencies", () => {
      const content = JSON.stringify({
        name: "test-project",
        version: "1.0.0",
        dependencies: {
          express: "^4.18.2",
          lodash: "~4.17.21",
        },
        devDependencies: {
          typescript: "^5.0.0",
          vitest: "^1.0.0",
        },
      });

      const result = nodejsParser.parse(content, "package.json");

      expect(result.fileName).toBe("package.json");
      expect(result.dependencies).toHaveLength(4);
      expect(result.dependencies).toContainEqual({
        name: "express",
        version: "^4.18.2",
        isDirect: true,
      });
      expect(result.dependencies).toContainEqual({
        name: "lodash",
        version: "~4.17.21",
        isDirect: true,
      });
      expect(result.dependencies).toContainEqual({
        name: "typescript",
        version: "^5.0.0",
        isDirect: true,
      });
      expect(result.dependencies).toContainEqual({
        name: "vitest",
        version: "^1.0.0",
        isDirect: true,
      });
    });

    it("should handle package.json with no dependencies", () => {
      const content = JSON.stringify({ name: "empty-project", version: "1.0.0" });
      const result = nodejsParser.parse(content, "package.json");

      expect(result.dependencies).toHaveLength(0);
    });

    it("should handle package.json with only dependencies", () => {
      const content = JSON.stringify({
        dependencies: { react: "^18.2.0" },
      });
      const result = nodejsParser.parse(content, "package.json");

      expect(result.dependencies).toHaveLength(1);
      expect(result.dependencies[0]!.name).toBe("react");
    });

    it("should handle package.json with only devDependencies", () => {
      const content = JSON.stringify({
        devDependencies: { jest: "^29.0.0" },
      });
      const result = nodejsParser.parse(content, "package.json");

      expect(result.dependencies).toHaveLength(1);
      expect(result.dependencies[0]!.name).toBe("jest");
    });

    it("should skip non-string version values", () => {
      const content = JSON.stringify({
        dependencies: {
          valid: "^1.0.0",
          invalid: 123,
          alsoInvalid: null,
        },
      });
      const result = nodejsParser.parse(content, "package.json");

      expect(result.dependencies).toHaveLength(1);
      expect(result.dependencies[0]!.name).toBe("valid");
    });

    it("should throw on malformed JSON", () => {
      expect(() => nodejsParser.parse("{invalid json}", "package.json")).toThrow("Invalid JSON");
    });

    it("should throw on non-object JSON", () => {
      expect(() => nodejsParser.parse('"hello"', "package.json")).toThrow("must be a JSON object");
    });

    it("should throw on array JSON", () => {
      expect(() => nodejsParser.parse("[]", "package.json")).toThrow("must be a JSON object");
    });

    it("should handle scoped packages", () => {
      const content = JSON.stringify({
        dependencies: {
          "@types/node": "^20.0.0",
          "@angular/core": "^17.0.0",
        },
      });
      const result = nodejsParser.parse(content, "package.json");

      expect(result.dependencies).toHaveLength(2);
      expect(result.dependencies).toContainEqual({
        name: "@types/node",
        version: "^20.0.0",
        isDirect: true,
      });
    });
  });
});
