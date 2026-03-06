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
} from "./projects.schema";
import { ProjectsService } from "./projects.service";

const projectsService = container.resolve(ProjectsService);

export const projectsController = new Elysia({
  prefix: "/projects",
  detail: { tags: ["Projects"] },
})
  .use(authGuard)
  .post("/", ({ body, user }) => projectsService.create(body, user.id), {
    body: CreateProjectBodySchema,
    response: ProjectResponseSchema,
    detail: { summary: "Create a new project" },
  })
  .get("/", ({ query, user }) => projectsService.list(user.id, query.page, query.limit), {
    query: ProjectListQuerySchema,
    response: ProjectListResponseSchema,
    detail: { summary: "List projects for current user" },
  })
  .get("/:id", ({ params, user }) => projectsService.getById(params.id, user.id), {
    params: StringIdParamSchema,
    response: ProjectResponseSchema,
    detail: { summary: "Get project details" },
  })
  .put("/:id", ({ params, body, user }) => projectsService.update(params.id, body, user.id), {
    params: StringIdParamSchema,
    body: UpdateProjectBodySchema,
    response: ProjectResponseSchema,
    detail: { summary: "Update project" },
  })
  .delete("/:id", ({ params, user }) => projectsService.delete(params.id, user.id), {
    params: StringIdParamSchema,
    response: MessageResponseSchema,
    detail: { summary: "Delete project" },
  });
