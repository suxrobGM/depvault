import { describe, expect, it } from "bun:test";
import { goParser } from "./go.parser";

describe("goParser", () => {
  describe("canParse", () => {
    it("should accept go.mod", () => {
      expect(goParser.canParse("go.mod")).toBe(true);
      expect(goParser.canParse("Go.mod")).toBe(true);
    });

    it("should reject unsupported files", () => {
      expect(goParser.canParse("go.sum")).toBe(false);
      expect(goParser.canParse("package.json")).toBe(false);
    });
  });

  describe("parse", () => {
    it("should parse require block", () => {
      const content = `
module github.com/user/project

go 1.21

require (
	github.com/gin-gonic/gin v1.9.1
	github.com/lib/pq v1.10.9
)
`;
      const result = goParser.parse(content, "go.mod");

      expect(result.dependencies).toHaveLength(2);
      expect(result.dependencies).toContainEqual({
        name: "github.com/gin-gonic/gin",
        version: "v1.9.1",
        isDirect: true,
      });
      expect(result.dependencies).toContainEqual({
        name: "github.com/lib/pq",
        version: "v1.10.9",
        isDirect: true,
      });
    });

    it("should parse single-line require statements", () => {
      const content = `
module example.com/mymod

go 1.21

require github.com/stretchr/testify v1.8.4
`;
      const result = goParser.parse(content, "go.mod");

      expect(result.dependencies).toHaveLength(1);
      expect(result.dependencies[0]).toEqual({
        name: "github.com/stretchr/testify",
        version: "v1.8.4",
        isDirect: true,
      });
    });

    it("should strip +incompatible suffix", () => {
      const content = `
module example.com/mod

go 1.21

require (
	github.com/old/pkg v2.0.0+incompatible
)
`;
      const result = goParser.parse(content, "go.mod");

      expect(result.dependencies).toHaveLength(1);
      expect(result.dependencies[0]!.version).toBe("v2.0.0");
    });

    it("should skip comments", () => {
      const content = `
module example.com/mod

go 1.21

require (
	// indirect dependency
	github.com/pkg/errors v0.9.1
)
`;
      const result = goParser.parse(content, "go.mod");

      expect(result.dependencies).toHaveLength(1);
    });

    it("should handle inline comments marking indirect deps", () => {
      const content = `
module example.com/mod

go 1.21

require (
	github.com/gin-gonic/gin v1.9.1
	golang.org/x/text v0.14.0 // indirect
)
`;
      const result = goParser.parse(content, "go.mod");

      expect(result.dependencies).toHaveLength(2);
      expect(result.dependencies[1]!.version).toBe("v0.14.0");
    });

    it("should handle multiple require blocks", () => {
      const content = `
module example.com/mod

go 1.21

require (
	github.com/gin-gonic/gin v1.9.1
)

require (
	golang.org/x/text v0.14.0
)
`;
      const result = goParser.parse(content, "go.mod");
      expect(result.dependencies).toHaveLength(2);
    });

    it("should throw on empty file", () => {
      expect(() => goParser.parse("", "go.mod")).toThrow("Empty file");
    });

    it("should handle no dependencies", () => {
      const content = `
module example.com/mod

go 1.21
`;
      const result = goParser.parse(content, "go.mod");
      expect(result.dependencies).toHaveLength(0);
    });
  });
});
