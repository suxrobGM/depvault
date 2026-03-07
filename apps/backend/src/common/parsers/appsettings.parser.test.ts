import { describe, expect, it } from "bun:test";
import { appsettingsParser, appsettingsSerializer } from "./appsettings.parser";

describe("appsettingsParser", () => {
  it("should parse flat properties", () => {
    const content = JSON.stringify({ AppName: "MyApp", Port: "3000" });
    const result = appsettingsParser.parse(content);

    expect(result).toContainEqual({ key: "AppName", value: "MyApp" });
    expect(result).toContainEqual({ key: "Port", value: "3000" });
  });

  it("should flatten nested objects with __ separator", () => {
    const content = JSON.stringify({
      ConnectionStrings: {
        DefaultConnection: "Server=localhost",
      },
      Logging: {
        LogLevel: {
          Default: "Information",
        },
      },
    });
    const result = appsettingsParser.parse(content);

    expect(result).toContainEqual({
      key: "ConnectionStrings__DefaultConnection",
      value: "Server=localhost",
    });
    expect(result).toContainEqual({
      key: "Logging__LogLevel__Default",
      value: "Information",
    });
  });

  it("should handle null values as empty strings", () => {
    const content = JSON.stringify({ NullKey: null });
    const result = appsettingsParser.parse(content);

    expect(result).toContainEqual({ key: "NullKey", value: "" });
  });

  it("should handle numeric values", () => {
    const content = JSON.stringify({ Port: 3000, Debug: true });
    const result = appsettingsParser.parse(content);

    expect(result).toContainEqual({ key: "Port", value: "3000" });
    expect(result).toContainEqual({ key: "Debug", value: "true" });
  });

  it("should throw on invalid JSON", () => {
    expect(() => appsettingsParser.parse("not json")).toThrow("Invalid JSON");
  });

  it("should throw on non-object JSON", () => {
    expect(() => appsettingsParser.parse("[]")).toThrow("must be a JSON object");
  });
});

describe("appsettingsSerializer", () => {
  it("should serialize flat entries as JSON object", () => {
    const entries = [
      { key: "AppName", value: "MyApp" },
      { key: "Port", value: "3000" },
    ];
    const result = JSON.parse(appsettingsSerializer.serialize(entries));

    expect(result.AppName).toBe("MyApp");
    expect(result.Port).toBe("3000");
  });

  it("should reconstruct nested objects from __ separator", () => {
    const entries = [
      { key: "ConnectionStrings__DefaultConnection", value: "Server=localhost" },
      { key: "Logging__LogLevel__Default", value: "Information" },
    ];
    const result = JSON.parse(appsettingsSerializer.serialize(entries));

    expect(result.ConnectionStrings.DefaultConnection).toBe("Server=localhost");
    expect(result.Logging.LogLevel.Default).toBe("Information");
  });

  it("should produce valid JSON", () => {
    const entries = [{ key: "Key", value: 'value with "quotes"' }];
    const serialized = appsettingsSerializer.serialize(entries);

    expect(() => JSON.parse(serialized)).not.toThrow();
  });
});
