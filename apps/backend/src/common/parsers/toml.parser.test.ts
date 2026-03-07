import { describe, expect, it } from "bun:test";
import { tomlParser, tomlSerializer } from "./toml.parser";

describe("tomlParser", () => {
  it("should parse top-level key-value pairs", () => {
    const content = 'title = "My App"\nport = 3000';
    const result = tomlParser.parse(content);

    expect(result).toContainEqual({ key: "title", value: "My App" });
    expect(result).toContainEqual({ key: "port", value: "3000" });
  });

  it("should parse sections as prefixes", () => {
    const content = ["[database]", 'host = "localhost"', "port = 5432"].join("\n");
    const result = tomlParser.parse(content);

    expect(result).toContainEqual({ key: "database__host", value: "localhost" });
    expect(result).toContainEqual({ key: "database__port", value: "5432" });
  });

  it("should handle dotted section names", () => {
    const content = ["[database.connection]", 'host = "localhost"'].join("\n");
    const result = tomlParser.parse(content);

    expect(result).toContainEqual({ key: "database__connection__host", value: "localhost" });
  });

  it("should skip comments and blank lines", () => {
    const content = "# comment\n\nhost = localhost\n# another\nport = 5432";
    const result = tomlParser.parse(content);

    expect(result).toHaveLength(2);
  });

  it("should strip quotes from string values", () => {
    const content = "key = \"quoted value\"\nkey2 = 'single quoted'";
    const result = tomlParser.parse(content);

    expect(result[0]!.value).toBe("quoted value");
    expect(result[1]!.value).toBe("single quoted");
  });

  it("should handle boolean values", () => {
    const content = "debug = true\nverbose = false";
    const result = tomlParser.parse(content);

    expect(result).toContainEqual({ key: "debug", value: "true" });
    expect(result).toContainEqual({ key: "verbose", value: "false" });
  });

  it("should handle multiple sections", () => {
    const content = ["[database]", 'host = "db"', "", "[redis]", 'host = "cache"'].join("\n");
    const result = tomlParser.parse(content);

    expect(result).toContainEqual({ key: "database__host", value: "db" });
    expect(result).toContainEqual({ key: "redis__host", value: "cache" });
  });

  it("should strip inline comments", () => {
    const content = "host = localhost # the host";
    const result = tomlParser.parse(content);

    expect(result[0]!.value).toBe("localhost");
  });
});

describe("tomlSerializer", () => {
  it("should serialize top-level entries", () => {
    const entries = [
      { key: "title", value: "My App" },
      { key: "port", value: "3000" },
    ];
    const result = tomlSerializer.serialize(entries);

    expect(result).toContain('title = "My App"');
    expect(result).toContain("port = 3000");
  });

  it("should group entries into sections", () => {
    const entries = [
      { key: "database__host", value: "localhost" },
      { key: "database__port", value: "5432" },
    ];
    const result = tomlSerializer.serialize(entries);

    expect(result).toContain("[database]");
    expect(result).toContain('host = "localhost"');
    expect(result).toContain("port = 5432");
  });

  it("should handle boolean values without quotes", () => {
    const entries = [{ key: "debug", value: "true" }];
    const result = tomlSerializer.serialize(entries);

    expect(result).toBe("debug = true");
  });

  it("should handle deeply nested keys with dot notation sections", () => {
    const entries = [{ key: "database__connection__host", value: "localhost" }];
    const result = tomlSerializer.serialize(entries);

    expect(result).toContain("[database.connection]");
    expect(result).toContain('host = "localhost"');
  });
});
