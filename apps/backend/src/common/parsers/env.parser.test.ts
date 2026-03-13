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

  it("should skip comments and blank lines", () => {
    const content = "# Database config\n\nDB_HOST=localhost\n  # port\nDB_PORT=5432\n";
    const result = envParser.parse(content);

    expect(result).toHaveLength(2);
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
});
