import { describe, expect, it } from "bun:test";
import { pythonParser } from "./python.parser";

describe("pythonParser", () => {
  describe("canParse", () => {
    it("should accept requirements.txt", () => {
      expect(pythonParser.canParse("requirements.txt")).toBe(true);
    });

    it("should accept pyproject.toml", () => {
      expect(pythonParser.canParse("pyproject.toml")).toBe(true);
    });

    it("should reject unsupported files", () => {
      expect(pythonParser.canParse("setup.py")).toBe(false);
      expect(pythonParser.canParse("package.json")).toBe(false);
    });
  });

  describe("parse - requirements.txt", () => {
    it("should parse packages with version specifiers", () => {
      const content = [
        "flask==2.3.2",
        "requests>=2.28.0",
        "numpy~=1.24.0",
        "pandas!=1.5.0",
        "scipy<=1.11.0",
      ].join("\n");

      const result = pythonParser.parse(content, "requirements.txt");

      expect(result.fileName).toBe("requirements.txt");
      expect(result.dependencies).toHaveLength(5);
      expect(result.dependencies).toContainEqual({
        name: "flask",
        version: "==2.3.2",
        isDirect: true,
      });
      expect(result.dependencies).toContainEqual({
        name: "requests",
        version: ">=2.28.0",
        isDirect: true,
      });
      expect(result.dependencies).toContainEqual({
        name: "numpy",
        version: "~=1.24.0",
        isDirect: true,
      });
    });

    it("should handle packages without version specifiers", () => {
      const content = "flask\nrequests\n";
      const result = pythonParser.parse(content, "requirements.txt");

      expect(result.dependencies).toHaveLength(2);
      expect(result.dependencies[0]).toEqual({
        name: "flask",
        version: "*",
        isDirect: true,
      });
    });

    it("should skip comments and blank lines", () => {
      const content = [
        "# This is a comment",
        "",
        "flask==2.3.2",
        "  # Another comment",
        "",
        "requests>=2.28.0",
      ].join("\n");

      const result = pythonParser.parse(content, "requirements.txt");
      expect(result.dependencies).toHaveLength(2);
    });

    it("should skip -r includes and other flags", () => {
      const content = [
        "-r base.txt",
        "--index-url https://pypi.org/simple",
        "-e git+https://github.com/user/repo.git",
        "-f https://download.pytorch.org/whl",
        "--extra-index-url https://example.com",
        "flask==2.3.2",
      ].join("\n");

      const result = pythonParser.parse(content, "requirements.txt");
      expect(result.dependencies).toHaveLength(1);
      expect(result.dependencies[0]!.name).toBe("flask");
    });

    it("should handle inline comments", () => {
      const content = "flask==2.3.2  # web framework\nrequests>=2.28.0 # http client";
      const result = pythonParser.parse(content, "requirements.txt");

      expect(result.dependencies).toHaveLength(2);
      expect(result.dependencies[0]!.version).toBe("==2.3.2");
    });

    it("should handle environment markers", () => {
      const content = 'pywin32>=300; sys_platform == "win32"\nflask==2.3.2';
      const result = pythonParser.parse(content, "requirements.txt");

      expect(result.dependencies).toHaveLength(2);
      expect(result.dependencies[0]).toEqual({
        name: "pywin32",
        version: ">=300",
        isDirect: true,
      });
    });

    it("should handle extras in package names", () => {
      const content = "requests[security]>=2.28.0\ncelery[redis]==5.3.0";
      const result = pythonParser.parse(content, "requirements.txt");

      expect(result.dependencies).toHaveLength(2);
      expect(result.dependencies[0]!.name).toBe("requests");
      expect(result.dependencies[1]!.name).toBe("celery");
    });

    it("should normalize package names", () => {
      const content = "My_Package==1.0.0\nAnother.Package>=2.0";
      const result = pythonParser.parse(content, "requirements.txt");

      expect(result.dependencies[0]!.name).toBe("my-package");
      expect(result.dependencies[1]!.name).toBe("another-package");
    });

    it("should handle empty file", () => {
      const result = pythonParser.parse("", "requirements.txt");
      expect(result.dependencies).toHaveLength(0);
    });

    it("should handle compound version specifiers", () => {
      const content = "flask>=2.0.0,<3.0.0";
      const result = pythonParser.parse(content, "requirements.txt");

      expect(result.dependencies).toHaveLength(1);
      expect(result.dependencies[0]!.version).toBe(">=2.0.0,<3.0.0");
    });

    it("should skip URLs", () => {
      const content = [
        "https://example.com/package.whl",
        "./local-package",
        "/absolute/path/package",
        "flask==2.3.2",
      ].join("\n");

      const result = pythonParser.parse(content, "requirements.txt");
      expect(result.dependencies).toHaveLength(1);
    });

    it("should handle Windows line endings", () => {
      const content = "flask==2.3.2\r\nrequests>=2.28.0\r\n";
      const result = pythonParser.parse(content, "requirements.txt");
      expect(result.dependencies).toHaveLength(2);
    });
  });

  describe("parse - pyproject.toml", () => {
    it("should parse [project.dependencies]", () => {
      const content = [
        "[project]",
        'name = "my-project"',
        'version = "1.0.0"',
        "dependencies = [",
        '  "flask>=2.3.0",',
        '  "requests~=2.28.0",',
        '  "pydantic==2.0.0",',
        "]",
      ].join("\n");

      const result = pythonParser.parse(content, "pyproject.toml");

      expect(result.fileName).toBe("pyproject.toml");
      expect(result.dependencies).toHaveLength(3);
      expect(result.dependencies).toContainEqual({
        name: "flask",
        version: ">=2.3.0",
        isDirect: true,
      });
      expect(result.dependencies).toContainEqual({
        name: "requests",
        version: "~=2.28.0",
        isDirect: true,
      });
      expect(result.dependencies).toContainEqual({
        name: "pydantic",
        version: "==2.0.0",
        isDirect: true,
      });
    });

    it("should handle single-line dependencies array", () => {
      const content = [
        "[project]",
        'name = "test"',
        'dependencies = ["flask>=2.3.0", "requests>=2.28.0"]',
      ].join("\n");

      const result = pythonParser.parse(content, "pyproject.toml");
      expect(result.dependencies).toHaveLength(2);
    });

    it("should handle dependencies without versions", () => {
      const content = ["[project]", "dependencies = [", '  "flask",', '  "requests",', "]"].join(
        "\n",
      );

      const result = pythonParser.parse(content, "pyproject.toml");
      expect(result.dependencies).toHaveLength(2);
      expect(result.dependencies[0]!.version).toBe("*");
    });

    it("should handle empty dependencies", () => {
      const content = ["[project]", "dependencies = []"].join("\n");
      const result = pythonParser.parse(content, "pyproject.toml");
      expect(result.dependencies).toHaveLength(0);
    });

    it("should handle environment markers in pyproject.toml", () => {
      const content = [
        "[project]",
        "dependencies = [",
        '  "pywin32>=300; sys_platform == \\"win32\\"",',
        '  "flask>=2.3.0",',
        "]",
      ].join("\n");

      const result = pythonParser.parse(content, "pyproject.toml");
      expect(result.dependencies).toHaveLength(2);
      expect(result.dependencies[0]!.name).toBe("pywin32");
    });

    it("should handle extras in pyproject.toml", () => {
      const content = [
        "[project]",
        "dependencies = [",
        '  "requests[security]>=2.28.0",',
        "]",
      ].join("\n");

      const result = pythonParser.parse(content, "pyproject.toml");
      expect(result.dependencies).toHaveLength(1);
      expect(result.dependencies[0]!.name).toBe("requests");
    });

    it("should ignore other sections", () => {
      const content = [
        "[build-system]",
        'requires = ["setuptools>=64"]',
        "",
        "[project]",
        "dependencies = [",
        '  "flask>=2.3.0",',
        "]",
        "",
        "[tool.pytest]",
        "testpaths = ['tests']",
      ].join("\n");

      const result = pythonParser.parse(content, "pyproject.toml");
      expect(result.dependencies).toHaveLength(1);
      expect(result.dependencies[0]!.name).toBe("flask");
    });

    it("should return empty when no project section exists", () => {
      const content = ["[build-system]", 'requires = ["setuptools"]'].join("\n");

      const result = pythonParser.parse(content, "pyproject.toml");
      expect(result.dependencies).toHaveLength(0);
    });

    it("should handle single-quoted strings", () => {
      const content = [
        "[project]",
        "dependencies = [",
        "  'flask>=2.3.0',",
        "  'requests>=2.28.0',",
        "]",
      ].join("\n");

      const result = pythonParser.parse(content, "pyproject.toml");
      expect(result.dependencies).toHaveLength(2);
    });
  });
});
