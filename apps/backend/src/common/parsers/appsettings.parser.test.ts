import { jsonSerializer as appsettingsSerializer } from "@depvault/shared/serializers";
import { describe, expect, it } from "bun:test";
import { appsettingsParser } from "./appsettings.parser";

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

  it("should flatten arrays with numeric indices", () => {
    const content = JSON.stringify({
      Serilog: {
        Using: ["Serilog.Sinks.File"],
        Enrich: ["FromLogContext", "WithThreadId", "WithExceptionDetails"],
      },
    });
    const result = appsettingsParser.parse(content);

    expect(result).toContainEqual({ key: "Serilog__Using__0", value: "Serilog.Sinks.File" });
    expect(result).toContainEqual({ key: "Serilog__Enrich__0", value: "FromLogContext" });
    expect(result).toContainEqual({ key: "Serilog__Enrich__1", value: "WithThreadId" });
    expect(result).toContainEqual({ key: "Serilog__Enrich__2", value: "WithExceptionDetails" });
  });

  it("should flatten arrays of objects with nested keys", () => {
    const content = JSON.stringify({
      Serilog: {
        WriteTo: [
          {
            Name: "File",
            Args: { path: "Logs/webapi-.log", rollingInterval: "Month" },
          },
        ],
      },
    });
    const result = appsettingsParser.parse(content);

    expect(result).toContainEqual({ key: "Serilog__WriteTo__0__Name", value: "File" });
    expect(result).toContainEqual({
      key: "Serilog__WriteTo__0__Args__path",
      value: "Logs/webapi-.log",
    });
    expect(result).toContainEqual({
      key: "Serilog__WriteTo__0__Args__rollingInterval",
      value: "Month",
    });
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

  it("should reconstruct arrays from numeric keys", () => {
    const entries = [
      { key: "Serilog__Using__0", value: "Serilog.Sinks.File" },
      { key: "Serilog__Enrich__0", value: "FromLogContext" },
      { key: "Serilog__Enrich__1", value: "WithThreadId" },
    ];
    const result = JSON.parse(appsettingsSerializer.serialize(entries));

    expect(result.Serilog.Using).toEqual(["Serilog.Sinks.File"]);
    expect(result.Serilog.Enrich).toEqual(["FromLogContext", "WithThreadId"]);
  });

  it("should reconstruct arrays of objects", () => {
    const entries = [
      { key: "WriteTo__0__Name", value: "File" },
      { key: "WriteTo__0__Args__path", value: "Logs/app.log" },
    ];
    const result = JSON.parse(appsettingsSerializer.serialize(entries));

    expect(result.WriteTo[0].Name).toBe("File");
    expect(result.WriteTo[0].Args.path).toBe("Logs/app.log");
  });
});
