import { describe, expect, it } from "bun:test";
import { javaParser } from "./java.parser";

describe("javaParser", () => {
  describe("canParse", () => {
    it("should accept pom.xml", () => {
      expect(javaParser.canParse("pom.xml")).toBe(true);
    });

    it("should accept build.gradle", () => {
      expect(javaParser.canParse("build.gradle")).toBe(true);
    });

    it("should accept build.gradle.kts", () => {
      expect(javaParser.canParse("build.gradle.kts")).toBe(true);
    });

    it("should reject unsupported files", () => {
      expect(javaParser.canParse("settings.gradle")).toBe(false);
      expect(javaParser.canParse("package.json")).toBe(false);
    });
  });

  describe("parse - pom.xml", () => {
    it("should parse dependencies from pom.xml", () => {
      const content = `<?xml version="1.0" encoding="UTF-8"?>
<project>
  <dependencies>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId>
      <version>3.2.0</version>
    </dependency>
    <dependency>
      <groupId>com.google.guava</groupId>
      <artifactId>guava</artifactId>
      <version>32.1.3-jre</version>
    </dependency>
  </dependencies>
</project>`;

      const result = javaParser.parse(content, "pom.xml");

      expect(result.dependencies).toHaveLength(2);
      expect(result.dependencies).toContainEqual({
        name: "org.springframework.boot:spring-boot-starter-web",
        version: "3.2.0",
        isDirect: true,
      });
      expect(result.dependencies).toContainEqual({
        name: "com.google.guava:guava",
        version: "32.1.3-jre",
        isDirect: true,
      });
    });

    it("should handle dependency without version", () => {
      const content = `<project>
  <dependencies>
    <dependency>
      <groupId>org.springframework</groupId>
      <artifactId>spring-core</artifactId>
    </dependency>
  </dependencies>
</project>`;

      const result = javaParser.parse(content, "pom.xml");

      expect(result.dependencies).toHaveLength(1);
      expect(result.dependencies[0]!.version).toBe("*");
    });

    it("should deduplicate dependencies", () => {
      const content = `<project>
  <dependencies>
    <dependency>
      <groupId>junit</groupId>
      <artifactId>junit</artifactId>
      <version>4.13.2</version>
    </dependency>
    <dependency>
      <groupId>junit</groupId>
      <artifactId>junit</artifactId>
      <version>4.13.2</version>
    </dependency>
  </dependencies>
</project>`;

      const result = javaParser.parse(content, "pom.xml");
      expect(result.dependencies).toHaveLength(1);
    });

    it("should throw on empty file", () => {
      expect(() => javaParser.parse("", "pom.xml")).toThrow("Empty file");
    });
  });

  describe("parse - build.gradle", () => {
    it("should parse string notation dependencies", () => {
      const content = `
plugins {
    id 'java'
}

dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-web:3.2.0'
    testImplementation 'junit:junit:4.13.2'
}
`;
      const result = javaParser.parse(content, "build.gradle");

      expect(result.dependencies).toHaveLength(2);
      expect(result.dependencies).toContainEqual({
        name: "org.springframework.boot:spring-boot-starter-web",
        version: "3.2.0",
        isDirect: true,
      });
    });

    it("should parse map notation dependencies", () => {
      const content = `
dependencies {
    implementation group: 'com.google.guava', name: 'guava', version: '32.1.3-jre'
}
`;
      const result = javaParser.parse(content, "build.gradle");

      expect(result.dependencies).toHaveLength(1);
      expect(result.dependencies[0]).toEqual({
        name: "com.google.guava:guava",
        version: "32.1.3-jre",
        isDirect: true,
      });
    });

    it("should handle dependencies without version in string notation", () => {
      const content = `
dependencies {
    implementation 'org.springframework.boot:spring-boot-starter'
}
`;
      const result = javaParser.parse(content, "build.gradle");

      expect(result.dependencies).toHaveLength(1);
      expect(result.dependencies[0]!.version).toBe("*");
    });

    it("should parse all dependency configurations", () => {
      const content = `
dependencies {
    implementation 'com.example:lib-a:1.0'
    api 'com.example:lib-b:2.0'
    compileOnly 'com.example:lib-c:3.0'
    runtimeOnly 'com.example:lib-d:4.0'
    testImplementation 'com.example:lib-e:5.0'
    annotationProcessor 'com.example:lib-f:6.0'
}
`;
      const result = javaParser.parse(content, "build.gradle");
      expect(result.dependencies).toHaveLength(6);
    });

    it("should throw on empty file", () => {
      expect(() => javaParser.parse("", "build.gradle")).toThrow("Empty file");
    });
  });

  describe("parse - build.gradle.kts", () => {
    it("should parse Kotlin DSL dependencies", () => {
      const content = `
plugins {
    kotlin("jvm") version "1.9.21"
}

dependencies {
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.7.3")
    testImplementation("io.kotest:kotest-runner-junit5:5.8.0")
}
`;
      const result = javaParser.parse(content, "build.gradle.kts");

      expect(result.dependencies).toHaveLength(2);
      expect(result.dependencies).toContainEqual({
        name: "org.jetbrains.kotlinx:kotlinx-coroutines-core",
        version: "1.7.3",
        isDirect: true,
      });
    });

    it("should deduplicate across string and map notations", () => {
      const content = `
dependencies {
    implementation("com.example:lib:1.0")
    implementation group: "com.example", name: "lib", version: "1.0"
}
`;
      const result = javaParser.parse(content, "build.gradle.kts");
      expect(result.dependencies).toHaveLength(1);
    });
  });
});
