import "reflect-metadata";
import { describe, expect, it } from "bun:test";
import type Stripe from "stripe";
import { SubscriptionStatus } from "@/generated/prisma";
import { mapStripeStatus, resolveInvoiceSubscriptionId } from "./stripe-webhook.service";

describe("stripe-webhook helpers", () => {
  describe("resolveInvoiceSubscriptionId", () => {
    it("should extract the subscription id from parent.subscription_details (string form)", () => {
      const invoice = {
        parent: { subscription_details: { subscription: "sub_123" } },
      } as unknown as Stripe.Invoice;

      expect(resolveInvoiceSubscriptionId(invoice)).toBe("sub_123");
    });

    it("should extract the subscription id when it is an expanded object", () => {
      const invoice = {
        parent: { subscription_details: { subscription: { id: "sub_456" } } },
      } as unknown as Stripe.Invoice;

      expect(resolveInvoiceSubscriptionId(invoice)).toBe("sub_456");
    });

    it("should return null when the invoice carries no subscription reference", () => {
      expect(
        resolveInvoiceSubscriptionId({ parent: null } as unknown as Stripe.Invoice),
      ).toBeNull();
      expect(resolveInvoiceSubscriptionId({} as unknown as Stripe.Invoice)).toBeNull();
    });
  });

  describe("mapStripeStatus", () => {
    it("should map failed-payment statuses", () => {
      expect(mapStripeStatus("past_due")).toBe(SubscriptionStatus.PAST_DUE);
      expect(mapStripeStatus("unpaid")).toBe(SubscriptionStatus.UNPAID);
    });

    it("should map active and trialing statuses", () => {
      expect(mapStripeStatus("active")).toBe(SubscriptionStatus.ACTIVE);
      expect(mapStripeStatus("trialing")).toBe(SubscriptionStatus.TRIALING);
    });

    it("should never default an unknown status to ACTIVE", () => {
      const result = mapStripeStatus("some_future_status" as Stripe.Subscription.Status);

      expect(result).toBe(SubscriptionStatus.INCOMPLETE);
      expect(result).not.toBe(SubscriptionStatus.ACTIVE);
    });
  });
});
