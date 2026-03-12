import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { authGuard } from "@/common/middleware";
import { SecurityOverviewResponseSchema } from "./security.schema";
import { SecurityService } from "./security.service";

const securityService = container.resolve(SecurityService);

export const securityController = new Elysia({
  prefix: "/security",
  detail: { tags: ["Security"] },
})
  .use(authGuard)
  .get("/overview", ({ user }) => securityService.getOverview(user.id), {
    response: SecurityOverviewResponseSchema,
    detail: {
      summary: "Security overview",
      description:
        "Return aggregated vulnerability and secret scan statistics across all projects the user is a member of.",
      security: [{ bearerAuth: [] }],
    },
  });
