import { envSerializer } from "@depvault/shared/serializers";
import { describe, expect, it } from "bun:test";
import { envParser } from "./env.parser";

describe("envParser", () => {
  it("should parse basic key=value pairs", () => {
    const content = "DB_HOST=localhost\nDB_PORT=5432\nDB_NAME=mydb";
    const result = envParser.parse(content);

    expect(result).toHaveLength(3);
    expect(result).toContainEqual({ key: "DB_HOST", value: "localhost" });
    expect(result).toContainEqual({ key: "DB_PORT", value: "5432" });
    expect(result).toContainEqual({ key: "DB_NAME", value: "mydb" });
  });

  it("should attach comments to the following variable", () => {
    const content = "# Database host\nDB_HOST=localhost\n# Database port\nDB_PORT=5432";
    const result = envParser.parse(content);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ key: "DB_HOST", value: "localhost", comment: "Database host" });
    expect(result[1]).toEqual({ key: "DB_PORT", value: "5432", comment: "Database port" });
  });

  it("should attach multi-line comments to the following variable", () => {
    const content = "# Database config\n# Primary postgres instance\nDB_HOST=localhost";
    const result = envParser.parse(content);

    expect(result).toHaveLength(1);
    expect(result[0]!.comment).toBe("Database config\nPrimary postgres instance");
  });

  it("should reset comment buffer on blank lines", () => {
    const content = "# Orphaned comment\n\nDB_HOST=localhost";
    const result = envParser.parse(content);

    expect(result).toHaveLength(1);
    expect(result[0]!.comment).toBe("\n");
  });

  it("should encode blank line separator as leading newline in comment", () => {
    const content = "DB_HOST=localhost\n\n# App config\nAPP_PORT=3000";
    const result = envParser.parse(content);

    expect(result).toHaveLength(2);
    expect(result[0]!.comment).toBeUndefined();
    expect(result[1]!.comment).toBe("\nApp config");
  });

  it("should encode blank line without comment", () => {
    const content = "DB_HOST=localhost\n\nDB_PORT=5432";
    const result = envParser.parse(content);

    expect(result).toHaveLength(2);
    expect(result[1]!.comment).toBe("\n");
  });

  it("should not set blank line flag for the first entry", () => {
    const content = "\n\nDB_HOST=localhost";
    const result = envParser.parse(content);

    expect(result).toHaveLength(1);
    expect(result[0]!.comment).toBeUndefined();
  });

  it("should strip double quotes from values", () => {
    const content = 'DB_HOST="localhost"\nAPI_KEY="abc123"';
    const result = envParser.parse(content);

    expect(result[0]!.value).toBe("localhost");
    expect(result[1]!.value).toBe("abc123");
  });

  it("should strip single quotes from values", () => {
    const content = "DB_HOST='localhost'";
    const result = envParser.parse(content);

    expect(result[0]!.value).toBe("localhost");
  });

  it("should handle values with equals signs", () => {
    const content = "CONNECTION_STRING=host=localhost;port=5432";
    const result = envParser.parse(content);

    expect(result[0]!.value).toBe("host=localhost;port=5432");
  });

  it("should handle empty values", () => {
    const content = "EMPTY_VAR=";
    const result = envParser.parse(content);

    expect(result[0]!.value).toBe("");
  });

  it("should handle Windows line endings", () => {
    const content = "A=1\r\nB=2\r\n";
    const result = envParser.parse(content);

    expect(result).toHaveLength(2);
  });

  it("should skip lines without equals sign", () => {
    const content = "VALID=yes\nINVALID_LINE\nALSO_VALID=true";
    const result = envParser.parse(content);

    expect(result).toHaveLength(2);
  });

  it("should handle values with spaces", () => {
    const content = 'MESSAGE="hello world"';
    const result = envParser.parse(content);

    expect(result[0]!.value).toBe("hello world");
  });
});

describe("envSerializer", () => {
  it("should serialize key-value pairs", () => {
    const entries = [
      { key: "DB_HOST", value: "localhost" },
      { key: "DB_PORT", value: "5432" },
    ];
    const result = envSerializer.serialize(entries);

    expect(result).toBe("DB_HOST=localhost\nDB_PORT=5432");
  });

  it("should quote values with spaces", () => {
    const entries = [{ key: "MESSAGE", value: "hello world" }];
    const result = envSerializer.serialize(entries);

    expect(result).toBe('MESSAGE="hello world"');
  });

  it("should quote values with special characters", () => {
    const entries = [{ key: "API_KEY", value: "abc#123" }];
    const result = envSerializer.serialize(entries);

    expect(result).toBe('API_KEY="abc#123"');
  });

  it("should handle empty entries", () => {
    const result = envSerializer.serialize([]);
    expect(result).toBe("");
  });

  it("should emit comments before variables", () => {
    const entries = [
      { key: "DB_HOST", value: "localhost", comment: "Database host" },
      { key: "DB_PORT", value: "5432" },
    ];
    const result = envSerializer.serialize(entries);

    expect(result).toBe("# Database host\nDB_HOST=localhost\nDB_PORT=5432");
  });

  it("should emit multi-line comments", () => {
    const entries = [
      { key: "DB_HOST", value: "localhost", comment: "Database config\nPrimary instance" },
    ];
    const result = envSerializer.serialize(entries);

    expect(result).toBe("# Database config\n# Primary instance\nDB_HOST=localhost");
  });

  it("should emit blank line when comment has leading newline", () => {
    const entries = [
      { key: "DB_HOST", value: "localhost" },
      { key: "APP_PORT", value: "3000", comment: "\nApp config" },
    ];
    const result = envSerializer.serialize(entries);

    expect(result).toBe("DB_HOST=localhost\n\n# App config\nAPP_PORT=3000");
  });

  it("should emit blank line without comment text", () => {
    const entries = [
      { key: "DB_HOST", value: "localhost" },
      { key: "DB_PORT", value: "5432", comment: "\n" },
    ];
    const result = envSerializer.serialize(entries);

    expect(result).toBe("DB_HOST=localhost\n\nDB_PORT=5432");
  });

  it("should not emit blank line for first entry even with leading newline", () => {
    const entries = [{ key: "DB_HOST", value: "localhost", comment: "\nDatabase host" }];
    const result = envSerializer.serialize(entries);

    expect(result).toBe("# Database host\nDB_HOST=localhost");
  });

  it("should round-trip parse and serialize with comments and spacing", () => {
    const original =
      "# Database\nDB_HOST=localhost\n\n# App settings\nAPP_PORT=3000\nAPP_DEBUG=true";
    const parsed = envParser.parse(original);
    const serialized = envSerializer.serialize(parsed);

    expect(serialized).toBe(original);
  });
});
