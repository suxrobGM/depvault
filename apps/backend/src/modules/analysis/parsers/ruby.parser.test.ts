import { describe, expect, it } from "bun:test";
import { rubyParser } from "./ruby.parser";

describe("rubyParser", () => {
  describe("canParse", () => {
    it("should accept Gemfile", () => {
      expect(rubyParser.canParse("Gemfile")).toBe(true);
      expect(rubyParser.canParse("gemfile")).toBe(true);
    });

    it("should reject unsupported files", () => {
      expect(rubyParser.canParse("Gemfile.lock")).toBe(false);
      expect(rubyParser.canParse("package.json")).toBe(false);
    });
  });

  describe("parse", () => {
    it("should parse gems with version constraints", () => {
      const content = `
source "https://rubygems.org"

gem "rails", "~> 7.1"
gem "puma", ">= 6.0"
gem "pg", "~> 1.5"
`;
      const result = rubyParser.parse(content, "Gemfile");

      expect(result.dependencies).toHaveLength(3);
      expect(result.dependencies).toContainEqual({
        name: "rails",
        version: "~> 7.1",
        isDirect: true,
      });
      expect(result.dependencies).toContainEqual({
        name: "puma",
        version: ">= 6.0",
        isDirect: true,
      });
    });

    it("should parse gems without version as wildcard", () => {
      const content = `
gem "bootsnap"
gem "jbuilder"
`;
      const result = rubyParser.parse(content, "Gemfile");

      expect(result.dependencies).toHaveLength(2);
      expect(result.dependencies[0]!.version).toBe("*");
      expect(result.dependencies[1]!.version).toBe("*");
    });

    it("should handle double-quoted gem names", () => {
      const content = `gem "nokogiri", "~> 1.15"`;
      const result = rubyParser.parse(content, "Gemfile");

      expect(result.dependencies).toHaveLength(1);
      expect(result.dependencies[0]!.name).toBe("nokogiri");
    });

    it("should handle single-quoted gem names", () => {
      const content = `gem 'nokogiri', '~> 1.15'`;
      const result = rubyParser.parse(content, "Gemfile");

      expect(result.dependencies).toHaveLength(1);
      expect(result.dependencies[0]!.name).toBe("nokogiri");
    });

    it("should skip comments and blank lines", () => {
      const content = `
# This is a comment
source "https://rubygems.org"

# Another comment
gem "rails", "~> 7.1"
`;
      const result = rubyParser.parse(content, "Gemfile");
      expect(result.dependencies).toHaveLength(1);
    });

    it("should skip source and ruby directives", () => {
      const content = `
source "https://rubygems.org"
ruby "3.2.0"

gem "rails", "~> 7.1"
`;
      const result = rubyParser.parse(content, "Gemfile");
      expect(result.dependencies).toHaveLength(1);
    });

    it("should handle gems with extra options after version", () => {
      const content = `gem "devise", "~> 4.9", require: false`;
      const result = rubyParser.parse(content, "Gemfile");

      expect(result.dependencies).toHaveLength(1);
      expect(result.dependencies[0]).toEqual({
        name: "devise",
        version: "~> 4.9",
        isDirect: true,
      });
    });

    it("should throw on empty file", () => {
      expect(() => rubyParser.parse("", "Gemfile")).toThrow("Empty file");
    });

    it("should handle no gems", () => {
      const content = `
source "https://rubygems.org"
ruby "3.2.0"
`;
      const result = rubyParser.parse(content, "Gemfile");
      expect(result.dependencies).toHaveLength(0);
    });
  });
});
