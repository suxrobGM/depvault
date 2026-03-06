import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { staticPlugin } from "@elysiajs/static";
import { Elysia } from "elysia";

const UPLOADS_DIR = resolve(process.env.DATA_DIR, "uploads");
mkdirSync(UPLOADS_DIR, { recursive: true });

/**
 * Elysia plugin for serving static files from the uploads directory.
 * Must be registered OUTSIDE the API_PREFIX group.
 */
export const uploadsStaticPlugin = new Elysia({ name: "static" }).use(
  staticPlugin({
    assets: UPLOADS_DIR,
    prefix: "/uploads",
  }),
);
