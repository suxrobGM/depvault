import { describe, expect, it } from "bun:test";
import { dotnetParser } from "./dotnet.parser";

describe("dotnetParser", () => {
  describe("canParse", () => {
    it("should accept .csproj files", () => {
      expect(dotnetParser.canParse("MyApp.csproj")).toBe(true);
      expect(dotnetParser.canParse("project.csproj")).toBe(true);
    });

    it("should accept .fsproj files", () => {
      expect(dotnetParser.canParse("MyApp.fsproj")).toBe(true);
    });

    it("should accept .vbproj files", () => {
      expect(dotnetParser.canParse("MyApp.vbproj")).toBe(true);
    });

    it("should be case-insensitive", () => {
      expect(dotnetParser.canParse("MyApp.CSPROJ")).toBe(true);
      expect(dotnetParser.canParse("MyApp.Csproj")).toBe(true);
    });

    it("should reject unsupported files", () => {
      expect(dotnetParser.canParse("package.json")).toBe(false);
      expect(dotnetParser.canParse("nuget.config")).toBe(false);
      expect(dotnetParser.canParse("project.sln")).toBe(false);
    });
  });

  describe("parse", () => {
    it("should parse PackageReference elements with Include and Version attributes", () => {
      const content = `
<Project Sdk="Microsoft.NET.Sdk">
  <ItemGroup>
    <PackageReference Include="Newtonsoft.Json" Version="13.0.3" />
    <PackageReference Include="Serilog" Version="3.1.1" />
  </ItemGroup>
</Project>`;

      const result = dotnetParser.parse(content, "MyApp.csproj");

      expect(result.fileName).toBe("MyApp.csproj");
      expect(result.dependencies).toHaveLength(2);
      expect(result.dependencies).toContainEqual({
        name: "Newtonsoft.Json",
        version: "13.0.3",
        isDirect: true,
      });
      expect(result.dependencies).toContainEqual({
        name: "Serilog",
        version: "3.1.1",
        isDirect: true,
      });
    });

    it("should parse PackageReference with child Version element", () => {
      const content = `
<Project Sdk="Microsoft.NET.Sdk">
  <ItemGroup>
    <PackageReference Include="Microsoft.EntityFrameworkCore">
      <Version>8.0.0</Version>
    </PackageReference>
  </ItemGroup>
</Project>`;

      const result = dotnetParser.parse(content, "MyApp.csproj");

      expect(result.dependencies).toHaveLength(1);
      expect(result.dependencies[0]).toEqual({
        name: "Microsoft.EntityFrameworkCore",
        version: "8.0.0",
        isDirect: true,
      });
    });

    it("should handle multiple ItemGroups", () => {
      const content = `
<Project Sdk="Microsoft.NET.Sdk">
  <ItemGroup>
    <PackageReference Include="Newtonsoft.Json" Version="13.0.3" />
  </ItemGroup>
  <ItemGroup>
    <PackageReference Include="Serilog" Version="3.1.1" />
  </ItemGroup>
</Project>`;

      const result = dotnetParser.parse(content, "MyApp.csproj");
      expect(result.dependencies).toHaveLength(2);
    });

    it("should handle no PackageReferences", () => {
      const content = `
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
  </PropertyGroup>
</Project>`;

      const result = dotnetParser.parse(content, "MyApp.csproj");
      expect(result.dependencies).toHaveLength(0);
    });

    it("should deduplicate packages by name", () => {
      const content = `
<Project Sdk="Microsoft.NET.Sdk">
  <ItemGroup>
    <PackageReference Include="Newtonsoft.Json" Version="13.0.3" />
    <PackageReference Include="Newtonsoft.Json" Version="13.0.1" />
  </ItemGroup>
</Project>`;

      const result = dotnetParser.parse(content, "MyApp.csproj");
      expect(result.dependencies).toHaveLength(1);
    });

    it("should handle PackageReference with extra attributes", () => {
      const content = `
<Project Sdk="Microsoft.NET.Sdk">
  <ItemGroup>
    <PackageReference Include="xunit" Version="2.6.1" PrivateAssets="All" />
  </ItemGroup>
</Project>`;

      const result = dotnetParser.parse(content, "MyApp.csproj");
      expect(result.dependencies).toHaveLength(1);
      expect(result.dependencies[0]!.name).toBe("xunit");
    });

    it("should throw on empty content", () => {
      expect(() => dotnetParser.parse("", "MyApp.csproj")).toThrow("Empty file");
      expect(() => dotnetParser.parse("   ", "MyApp.csproj")).toThrow("Empty file");
    });
  });
});
