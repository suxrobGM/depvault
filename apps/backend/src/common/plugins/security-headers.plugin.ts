import { Elysia } from "elysia";

/**
 * Elysia plugin for setting security response headers.
 */
export const securityHeadersPlugin = new Elysia({ name: "security-headers" }).onAfterHandle(
  ({ set }) => {
    set.headers["X-Frame-Options"] = "DENY";
    set.headers["X-Content-Type-Options"] = "nosniff";
    set.headers["X-XSS-Protection"] = "1; mode=block";
    set.headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    if (process.env.NODE_ENV === "production") {
      set.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
    }
  },
);
