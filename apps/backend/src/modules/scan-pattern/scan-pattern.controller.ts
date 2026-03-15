import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { projectGuard } from "@/common/middleware";
import { MessageResponseSchema } from "@/types/response";
import {
  CreatePatternBodySchema,
  PatternListResponseSchema,
  PatternParamsSchema,
  PatternProjectParamsSchema,
  PatternResponseSchema,
  UpdatePatternBodySchema,
} from "./scan-pattern.schema";
import { ScanPatternService } from "./scan-pattern.service";

const scanPatternService = container.resolve(ScanPatternService);

export const scanPatternController = new Elysia({
  prefix: "/projects/:id/scan-patterns",
  detail: { tags: ["Scan Patterns"] },
})
  .use(projectGuard("VIEWER"))
  .get("/", ({ params }) => scanPatternService.list(params.id), {
    params: PatternProjectParamsSchema,
    response: PatternListResponseSchema,
    detail: {
      operationId: "listScanPatterns",
      summary: "List scan patterns",
      description: "Return built-in and custom scan patterns for the project.",
      security: [{ bearerAuth: [] }],
    },
  })
  .use(projectGuard("EDITOR"))
  .post("/", ({ params, body }) => scanPatternService.create(params.id, body), {
    params: PatternProjectParamsSchema,
    body: CreatePatternBodySchema,
    response: PatternResponseSchema,
    detail: {
      operationId: "createScanPattern",
      summary: "Create custom pattern",
      description:
        "Create a new custom scan pattern for the project. Requires editor or owner role.",
      security: [{ bearerAuth: [] }],
    },
  })
  .put(
    "/:patternId",
    ({ params, body }) => scanPatternService.update(params.id, params.patternId, body),
    {
      params: PatternParamsSchema,
      body: UpdatePatternBodySchema,
      response: PatternResponseSchema,
      detail: {
        operationId: "updateScanPattern",
        summary: "Update custom pattern",
        description: "Update a custom scan pattern. Built-in patterns cannot be modified.",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .delete("/:patternId", ({ params }) => scanPatternService.delete(params.id, params.patternId), {
    params: PatternParamsSchema,
    response: MessageResponseSchema,
    detail: {
      operationId: "deleteScanPattern",
      summary: "Delete custom pattern",
      description: "Delete a custom scan pattern. Built-in patterns cannot be deleted.",
      security: [{ bearerAuth: [] }],
    },
  });
