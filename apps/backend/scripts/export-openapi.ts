/**
 * Exports the OpenAPI spec from the running Elysia app to a JSON file.
 *
 * The backend schemas use OpenAPI-compliant helpers (`tDateTime`, `tStringEnum`,
 * `tStringUnion` from `@/types/schema`), so the spec is mostly valid out of the
 * box. This script applies minimal safety-net cleanup for any remaining Elysia
 * runtime quirks (e.g. duplicate content types on file upload endpoints).
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

/** Properties that Elysia/TypeBox leaks into the spec but are not valid OpenAPI 3.0. */
const INVALID_OPENAPI_PROPS = ["maxSize", "patternProperties"];

/** Applies safety-net fixes for any remaining Elysia runtime quirks. */
function sanitizeSpec(spec: Record<string, unknown>): Record<string, unknown> {
  stripTrailingSlashes(spec);
  stripInvalidProperties(spec);
  stripDuplicateContentTypes(spec);
  cleanupResponses(spec);
  return spec;
}

/** Remove Elysia/TypeBox-specific properties that are not valid in OpenAPI 3.0. */
function stripInvalidProperties(node: unknown): void {
  if (node === null || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) stripInvalidProperties(item);
    return;
  }
  const obj = node as Record<string, unknown>;
  for (const prop of INVALID_OPENAPI_PROPS) {
    if (prop in obj) delete obj[prop];
  }
  for (const value of Object.values(obj)) {
    stripInvalidProperties(value);
  }
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

/** Remove duplicate multipart/form-data and text/plain content types when application/json exists. */
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

/** Remove leaked schema properties from response objects (Elysia runtime quirk). */
function cleanupResponses(spec: Record<string, unknown>): void {
  const paths = spec.paths as Record<string, Record<string, unknown>> | undefined;
  if (!paths) return;

  const validResponseKeys = new Set(["description", "headers", "content", "links"]);

  for (const pathObj of Object.values(paths)) {
    for (const method of ["get", "post", "put", "patch", "delete"]) {
      const operation = pathObj[method] as Record<string, unknown> | undefined;
      if (!operation?.responses) continue;

      const responses = operation.responses as Record<string, Record<string, unknown>>;
      for (const [, response] of Object.entries(responses)) {
        if (typeof response !== "object" || response === null) continue;

        if (response.content) {
          for (const key of Object.keys(response)) {
            if (!validResponseKeys.has(key)) delete response[key];
          }
        } else {
          const schema: Record<string, unknown> = {};
          for (const key of Object.keys(response)) {
            if (!validResponseKeys.has(key)) {
              schema[key] = response[key];
              delete response[key];
            }
          }
          if (Object.keys(schema).length > 0) {
            if ("items" in schema && !("type" in schema)) schema.type = "array";
            response.content = { "application/json": { schema } };
          }
        }

        if (!response.description) response.description = "Success";
      }
    }
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
