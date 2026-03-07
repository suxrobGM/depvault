import pino from "pino";
import { sanitizeObject } from "@/common/utils/log-sanitizer";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  hooks: {
    logMethod(inputArgs, method) {
      const sanitized = inputArgs.map((arg) =>
        typeof arg === "object" && arg !== null ? sanitizeObject(arg) : arg,
      );
      return method.apply(this, sanitized as Parameters<typeof method>);
    },
  },
  transport:
    process.env.NODE_ENV === "development"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
});
