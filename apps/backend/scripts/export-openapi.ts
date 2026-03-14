/**
 * Exports the OpenAPI spec from the running Elysia app to a JSON file.
 *
 * Elysia's swagger plugin produces TypeBox-flavoured JSON Schema that is not
 * fully OpenAPI 3.0 compliant (e.g. `type: "Date"`, `const` enums). This
 * script fetches the raw spec, sanitizes it for standard tooling (Kiota,
 * swagger-codegen, etc.), and writes the result to disk.
 *
 * Usage:
 *   bun run scripts/export-openapi.ts [--output <path>]
 */
import { writeFileSync } from "fs";
import { resolve } from "path";

const DEFAULT_OUTPUT = resolve(import.meta.dir, "../../cli/openapi.json");

function parseArgs(): { output: string } {
  const args = process.argv.slice(2);
  const outputIdx = args.indexOf("--output");
  const output = outputIdx !== -1 && args[outputIdx + 1] ? args[outputIdx + 1]! : DEFAULT_OUTPUT;
  return { output: resolve(output) };
}

/**
 * Recursively walks the spec and fixes non-standard constructs:
 * - `type: "Date"` → `type: "string", format: "date-time"`
 * - `anyOf` with `const` values → single `enum` array
 * - Removes `multipart/form-data` and `text/plain` content types from
 *   request/response bodies (Elysia duplicates schemas across all three)
 */
function sanitizeSpec(spec: Record<string, unknown>): Record<string, unknown> {
  if (!spec.servers) {
    spec.servers = [{ url: "http://localhost:4000", description: "Local development" }];
  }

  stripTrailingSlashes(spec);
  fixMalformedResponses(spec);
  sanitizeNode(spec);
  stripDuplicateContentTypes(spec);
  addResponseDescriptions(spec);
  fixParameterSchemas(spec);
  return spec;
}

/** Remove trailing slashes from path keys (Kiota cannot handle them). */
function stripTrailingSlashes(spec: Record<string, unknown>): void {
  const paths = spec.paths as Record<string, unknown> | undefined;
  if (!paths) return;

  for (const key of Object.keys(paths)) {
    if (key.length > 1 && key.endsWith("/")) {
      const newKey = key.slice(0, -1);
      if (!(newKey in paths)) {
        paths[newKey] = paths[key];
      }
      delete paths[key];
    }
  }
}

/**
 * Fix responses that have schema properties (items, anyOf, properties) directly
 * on the response object instead of wrapped in content/application/json/schema.
 */
function fixMalformedResponses(spec: Record<string, unknown>): void {
  const paths = spec.paths as Record<string, Record<string, unknown>> | undefined;
  if (!paths) return;

  for (const pathObj of Object.values(paths)) {
    for (const method of ["get", "post", "put", "patch", "delete"]) {
      const operation = pathObj[method] as Record<string, unknown> | undefined;
      if (!operation?.responses) continue;

      const responses = operation.responses as Record<string, Record<string, unknown>>;
      for (const [, response] of Object.entries(responses)) {
        if (typeof response !== "object" || response === null) continue;

        // Remove schema-level properties that leaked onto the response object.
        // Valid response keys: description, headers, content, links
        const validResponseKeys = new Set(["description", "headers", "content", "links"]);

        if (response.content) {
          // Content already exists — just strip invalid props
          for (const key of Object.keys(response)) {
            if (!validResponseKeys.has(key)) delete response[key];
          }
        } else {
          // No content — try to build it from leaked schema props
          const schema: Record<string, unknown> = {};
          for (const key of Object.keys(response)) {
            if (!validResponseKeys.has(key)) {
              schema[key] = response[key];
              delete response[key];
            }
          }
          if (Object.keys(schema).length > 0) {
            // If it has `items`, wrap as array
            if ("items" in schema && !("type" in schema)) {
              schema.type = "array";
            }
            response.content = { "application/json": { schema } };
          }
        }
      }
    }
  }
}

/** Properties that are valid in JSON Schema but not OpenAPI 3.0. */
const INVALID_OPENAPI_PROPS = ["patternProperties", "maxSize", "const"];

function sanitizeNode(node: unknown): void {
  if (node === null || typeof node !== "object") return;

  if (Array.isArray(node)) {
    for (const item of node) sanitizeNode(item);
    return;
  }

  const obj = node as Record<string, unknown>;

  // Remove JSON Schema properties not valid in OpenAPI 3.0
  for (const prop of INVALID_OPENAPI_PROPS) {
    if (prop in obj) delete obj[prop];
  }

  // Fix `type: "Date"` → `type: "string", format: "date-time"`
  if (obj.type === "Date") {
    obj.type = "string";
    obj.format = "date-time";
  }

  // Fix anyOf containing `const` values → collapse to `enum`
  if (Array.isArray(obj.anyOf)) {
    const allConst = obj.anyOf.every(
      (item: unknown) =>
        typeof item === "object" && item !== null && "const" in (item as Record<string, unknown>),
    );

    if (allConst && obj.anyOf.length > 0) {
      const enumValues = obj.anyOf.map(
        (item: Record<string, unknown>) => item.const as string | number,
      );
      const firstItem = obj.anyOf[0] as Record<string, unknown>;

      delete obj.anyOf;
      obj.type = firstItem.type ?? "string";
      obj.enum = enumValues;
    } else {
      for (const item of obj.anyOf) sanitizeNode(item);
    }
  }

  // Recurse into all nested objects
  for (const value of Object.values(obj)) {
    sanitizeNode(value);
  }
}

/** Remove duplicate multipart/form-data and text/plain content types that Elysia generates. */
function stripDuplicateContentTypes(node: unknown): void {
  if (node === null || typeof node !== "object") return;

  if (Array.isArray(node)) {
    for (const item of node) stripDuplicateContentTypes(item);
    return;
  }

  const obj = node as Record<string, unknown>;

  if (
    obj.content &&
    typeof obj.content === "object" &&
    "application/json" in (obj.content as Record<string, unknown>)
  ) {
    const content = obj.content as Record<string, unknown>;
    delete content["multipart/form-data"];
    delete content["text/plain"];
  }

  for (const value of Object.values(obj)) {
    stripDuplicateContentTypes(value);
  }
}

const HTTP_STATUS_DESCRIPTIONS: Record<string, string> = {
  "200": "Success",
  "201": "Created",
  "204": "No Content",
  "400": "Bad Request",
  "401": "Unauthorized",
  "403": "Forbidden",
  "404": "Not Found",
  "409": "Conflict",
  "410": "Gone",
  "422": "Unprocessable Entity",
  "429": "Too Many Requests",
  "500": "Internal Server Error",
};

/** Add missing `description` to response objects (required by OpenAPI 3.0). */
function addResponseDescriptions(node: unknown): void {
  if (node === null || typeof node !== "object") return;

  if (Array.isArray(node)) {
    for (const item of node) addResponseDescriptions(item);
    return;
  }

  const obj = node as Record<string, unknown>;

  if (obj.responses && typeof obj.responses === "object") {
    const responses = obj.responses as Record<string, Record<string, unknown>>;
    for (const [code, response] of Object.entries(responses)) {
      if (typeof response === "object" && response !== null && !response.description) {
        response.description = HTTP_STATUS_DESCRIPTIONS[code] ?? `HTTP ${code}`;
      }
    }
  }

  for (const value of Object.values(obj)) {
    addResponseDescriptions(value);
  }
}

/** Fix parameter schemas: unwrap anyOf with format:integer on String type. */
function fixParameterSchemas(node: unknown): void {
  if (node === null || typeof node !== "object") return;

  if (Array.isArray(node)) {
    for (const item of node) fixParameterSchemas(item);
    return;
  }

  const obj = node as Record<string, unknown>;

  // Fix parameters with anyOf containing {type: "string", format: "integer"}
  if (Array.isArray(obj.anyOf) && obj.anyOf.length > 0) {
    const hasIntegerString = obj.anyOf.some(
      (item: unknown) =>
        typeof item === "object" &&
        item !== null &&
        (item as Record<string, unknown>).type === "string" &&
        (item as Record<string, unknown>).format === "integer",
    );

    if (hasIntegerString) {
      // Simplify to just integer type
      delete obj.anyOf;
      obj.type = "integer";
    }
  }

  for (const value of Object.values(obj)) {
    fixParameterSchemas(value);
  }
}

async function fetchWithRetry(url: string, timeoutMs = 10_000): Promise<Response> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      return await fetch(url);
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  throw new Error(`Server did not become ready within ${timeoutMs}ms`);
}

async function main() {
  const { output } = parseArgs();

  const port = process.env.PORT ?? "4000";
  const baseUrl = `http://localhost:${port}`;

  console.log("Starting server to extract OpenAPI spec...");

  await import("../src/app");

  const specUrl = `${baseUrl}/api/swagger/json`;
  console.log(`Waiting for server and fetching spec from ${specUrl}...`);

  const response = await fetchWithRetry(specUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch OpenAPI spec: ${response.status} ${response.statusText}`);
  }

  const spec = (await response.json()) as Record<string, unknown>;
  const sanitized = sanitizeSpec(spec);
  const specJson = JSON.stringify(sanitized, null, 2);

  writeFileSync(output, specJson, "utf-8");
  console.log(`OpenAPI spec written to ${output} (${specJson.length} bytes)`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Failed to export OpenAPI spec:", err);
  process.exit(1);
});
