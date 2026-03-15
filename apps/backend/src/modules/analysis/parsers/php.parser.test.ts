import { describe, expect, it } from "bun:test";
import { phpParser } from "./php.parser";

describe("phpParser", () => {
  describe("canParse", () => {
    it("should accept composer.json", () => {
      expect(phpParser.canParse("composer.json")).toBe(true);
      expect(phpParser.canParse("Composer.json")).toBe(true);
    });

    it("should reject unsupported files", () => {
      expect(phpParser.canParse("composer.lock")).toBe(false);
      expect(phpParser.canParse("package.json")).toBe(false);
    });
  });

  describe("parse", () => {
    it("should parse require and require-dev", () => {
      const content = JSON.stringify({
        name: "vendor/project",
        require: {
          "laravel/framework": "^11.0",
          "guzzlehttp/guzzle": "^7.8",
        },
        "require-dev": {
          "phpunit/phpunit": "^10.5",
        },
      });

      const result = phpParser.parse(content, "composer.json");

      expect(result.dependencies).toHaveLength(3);
      expect(result.dependencies).toContainEqual({
        name: "laravel/framework",
        version: "^11.0",
        isDirect: true,
      });
      expect(result.dependencies).toContainEqual({
        name: "phpunit/phpunit",
        version: "^10.5",
        isDirect: true,
      });
    });

    it("should skip PHP platform requirements", () => {
      const content = JSON.stringify({
        require: {
          php: "^8.2",
          "ext-mbstring": "*",
          "ext-openssl": "*",
          "lib-libxml": ">=2.7.0",
          "laravel/framework": "^11.0",
        },
      });

      const result = phpParser.parse(content, "composer.json");

      expect(result.dependencies).toHaveLength(1);
      expect(result.dependencies[0]!.name).toBe("laravel/framework");
    });

    it("should handle composer.json with no dependencies", () => {
      const content = JSON.stringify({ name: "vendor/empty" });
      const result = phpParser.parse(content, "composer.json");

      expect(result.dependencies).toHaveLength(0);
    });

    it("should handle only require section", () => {
      const content = JSON.stringify({
        require: { "monolog/monolog": "^3.5" },
      });
      const result = phpParser.parse(content, "composer.json");

      expect(result.dependencies).toHaveLength(1);
    });

    it("should handle only require-dev section", () => {
      const content = JSON.stringify({
        "require-dev": { "phpstan/phpstan": "^1.10" },
      });
      const result = phpParser.parse(content, "composer.json");

      expect(result.dependencies).toHaveLength(1);
    });

    it("should throw on malformed JSON", () => {
      expect(() => phpParser.parse("{invalid}", "composer.json")).toThrow("Invalid JSON");
    });

    it("should throw on non-object JSON", () => {
      expect(() => phpParser.parse('"hello"', "composer.json")).toThrow("must be a JSON object");
    });

    it("should throw on array JSON", () => {
      expect(() => phpParser.parse("[]", "composer.json")).toThrow("must be a JSON object");
    });

    it("should skip non-string version values", () => {
      const content = JSON.stringify({
        require: {
          "valid/pkg": "^1.0",
          "invalid/pkg": 123,
        },
      });
      const result = phpParser.parse(content, "composer.json");

      expect(result.dependencies).toHaveLength(1);
      expect(result.dependencies[0]!.name).toBe("valid/pkg");
    });
  });
});
