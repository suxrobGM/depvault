/** A single dependency extracted from a dependency file. */
export interface ParsedDependency {
  /** Package name (e.g., "express", "@types/node", "flask") */
  name: string;
  /** Version string or specifier (e.g., "^4.18.2", "==2.3.0", "*") */
  version: string;
  /** Whether this is a direct (top-level) dependency */
  isDirect: boolean;
  /** Name of the parent package for transitive dependencies */
  parentName?: string;
}

/** Result returned by a dependency parser after processing file content. */
export interface ParseResult {
  /** List of parsed dependencies */
  dependencies: ParsedDependency[];
  /** Original file name that was parsed */
  fileName: string;
}

/** Ecosystem-specific parser that extracts dependencies from file content. */
export interface DependencyParser {
  /** Returns true if this parser supports the given file name. */
  canParse(fileName: string): boolean;
  /** Parses file content and returns extracted dependencies. Throws BadRequestError on invalid input. */
  parse(content: string, fileName: string): ParseResult;
}
