import { Elysia } from "elysia";

export const noCacheHeaders = new Elysia({ name: "no-cache-headers" }).onAfterHandle(
  { as: "scoped" },
  ({ set }) => {
    set.headers["Cache-Control"] = "no-store, no-cache, must-revalidate";
    set.headers["Pragma"] = "no-cache";
    set.headers["Expires"] = "0";
  },
);
