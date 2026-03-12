import { yamlSerializer } from "@shared/serializers";
import { describe, expect, it } from "bun:test";
import { yamlParser } from "./yaml.parser";

describe("yamlParser", () => {
  it("should parse flat key-value pairs", () => {
    const content = "db_host: localhost\ndb_port: 5432";
    const result = yamlParser.parse(content);

    expect(result).toContainEqual({ key: "db_host", value: "localhost" });
    expect(result).toContainEqual({ key: "db_port", value: "5432" });
  });

  it("should parse nested structures", () => {
    const content = ["database:", "  host: localhost", "  port: 5432"].join("\n");
    const result = yamlParser.parse(content);

    expect(result).toContainEqual({ key: "database__host", value: "localhost" });
    expect(result).toContainEqual({ key: "database__port", value: "5432" });
  });

  it("should parse deeply nested structures", () => {
    const content = ["app:", "  database:", "    connection:", "      host: localhost"].join("\n");
    const result = yamlParser.parse(content);

    expect(result).toContainEqual({ key: "app__database__connection__host", value: "localhost" });
  });

  it("should skip comments and blank lines", () => {
    const content = "# comment\n\nhost: localhost\n# another comment\nport: 5432";
    const result = yamlParser.parse(content);

    expect(result).toHaveLength(2);
  });

  it("should strip quoted values", () => {
    const content = "key1: \"quoted value\"\nkey2: 'single quoted'";
    const result = yamlParser.parse(content);

    expect(result[0]!.value).toBe("quoted value");
    expect(result[1]!.value).toBe("single quoted");
  });

  it("should strip inline comments", () => {
    const content = "host: localhost # the host";
    const result = yamlParser.parse(content);

    expect(result[0]!.value).toBe("localhost");
  });

  it("should handle multiple top-level sections", () => {
    const content = ["database:", "  host: db", "redis:", "  host: cache"].join("\n");
    const result = yamlParser.parse(content);

    expect(result).toContainEqual({ key: "database__host", value: "db" });
    expect(result).toContainEqual({ key: "redis__host", value: "cache" });
  });
});

describe("yamlSerializer", () => {
  it("should serialize flat entries", () => {
    const entries = [
      { key: "host", value: "localhost" },
      { key: "port", value: "5432" },
    ];
    const result = yamlSerializer.serialize(entries);

    expect(result).toContain("host: localhost");
    expect(result).toContain('port: "5432"');
  });

  it("should serialize nested entries", () => {
    const entries = [
      { key: "database__host", value: "localhost" },
      { key: "database__port", value: "5432" },
    ];
    const result = yamlSerializer.serialize(entries);

    expect(result).toContain("database:");
    expect(result).toContain("  host: localhost");
    expect(result).toContain('  port: "5432"');
  });

  it("should quote boolean-like values", () => {
    const entries = [{ key: "flag", value: "true" }];
    const result = yamlSerializer.serialize(entries);

    expect(result).toContain('"true"');
  });

  it("should quote empty values", () => {
    const entries = [{ key: "empty", value: "" }];
    const result = yamlSerializer.serialize(entries);

    expect(result).toContain('""');
  });
});
