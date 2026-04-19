import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { authGuard } from "@/common/middleware";
import { ConvertBodySchema, ConvertResponseSchema } from "./convert.schema";
import { ConvertService } from "./convert.service";

const convertService = container.resolve(ConvertService);

export const convertController = new Elysia({
  prefix: "/convert",
  detail: { tags: ["Convert"], security: [{ bearerAuth: [] }] },
})
  .use(authGuard)
  .post("/", ({ body }) => convertService.convert(body), {
    body: ConvertBodySchema,
    response: ConvertResponseSchema,
    detail: {
      operationId: "convertConfigFormat",
      summary: "Convert between config formats",
      description:
        "Convert configuration content between supported formats (.env, appsettings.json, secrets.yaml, config.toml). No project needed — standalone conversion with preview.",
    },
  });
