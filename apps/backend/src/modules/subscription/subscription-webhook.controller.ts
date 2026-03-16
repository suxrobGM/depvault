import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { BadRequestError } from "@/common/errors";
import { MessageResponseSchema } from "@/types/response";
import { StripeWebhookService } from "./stripe-webhook.service";

const webhookService = container.resolve(StripeWebhookService);

export const subscriptionWebhookController = new Elysia({
  prefix: "/subscription",
  detail: { tags: ["Subscription"] },
}).post(
  "/webhook",
  async ({ request }) => {
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      throw new BadRequestError("Missing stripe-signature header");
    }

    const rawBody = await request.text();
    await webhookService.handleEvent(rawBody, signature);
    return { message: "Webhook processed" };
  },
  {
    response: MessageResponseSchema,
    detail: {
      operationId: "handleStripeWebhook",
      summary: "Handle Stripe webhook",
      description:
        "Receive and process Stripe webhook events for subscription lifecycle management.",
    },
  },
);
