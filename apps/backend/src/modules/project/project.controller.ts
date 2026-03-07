import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { authGuard } from "@/common/middleware";
import { StringIdParamSchema } from "@/types/request";
import { MessageResponseSchema } from "@/types/response";
import {
  CreateProjectBodySchema,
  ProjectListQuerySchema,
  ProjectListResponseSchema,
  ProjectResponseSchema,
  UpdateProjectBodySchema,
} from "./project.schema";
import { ProjectService } from "./project.service";

const projectService = container.resolve(ProjectService);

export const projectController = new Elysia({
  prefix: "/projects",
  detail: { tags: ["Projects"] },
})
  .use(authGuard)
  .post("/", ({ body, user }) => projectService.create(body, user.id), {
    body: CreateProjectBodySchema,
    response: ProjectResponseSchema,
    detail: {
      summary: "Create a new project",
      description:
        "Create a project and add the authenticated user as the owner. Projects serve as containers for dependency analyses and environment variables.",
      security: [{ bearerAuth: [] }],
    },
  })
  .get("/", ({ query, user }) => projectService.list(user.id, query.page, query.limit), {
    query: ProjectListQuerySchema,
    response: ProjectListResponseSchema,
    detail: {
      summary: "List projects",
      description:
        "Return a paginated list of projects where the authenticated user is a member (owner, editor, or viewer).",
      security: [{ bearerAuth: [] }],
    },
  })
  .get("/:id", ({ params, user }) => projectService.getById(params.id, user.id), {
    params: StringIdParamSchema,
    response: ProjectResponseSchema,
    detail: {
      summary: "Get project details",
      description:
        "Return details of a specific project. The authenticated user must be a member of the project.",
      security: [{ bearerAuth: [] }],
    },
  })
  .put("/:id", ({ params, body, user }) => projectService.update(params.id, body, user.id), {
    params: StringIdParamSchema,
    body: UpdateProjectBodySchema,
    response: ProjectResponseSchema,
    detail: {
      summary: "Update project",
      description:
        "Update project name and/or description. Only owners and editors are allowed to update.",
      security: [{ bearerAuth: [] }],
    },
  })
  .delete("/:id", ({ params, user }) => projectService.delete(params.id, user.id), {
    params: StringIdParamSchema,
    response: MessageResponseSchema,
    detail: {
      summary: "Delete project",
      description:
        "Permanently delete a project and all associated data (analyses, environments, variables). Only the project owner can delete.",
      security: [{ bearerAuth: [] }],
    },
  });
