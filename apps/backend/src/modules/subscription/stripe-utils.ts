import type Stripe from "stripe";

/** Extracts period dates from a Stripe subscription's first item (Stripe v20+). */
export function extractPeriodDates(sub: Stripe.Subscription) {
  const item = sub.items.data[0] as Stripe.SubscriptionItem & {
    current_period_start?: number;
    current_period_end?: number;
  };

  return {
    currentPeriodStart: item?.current_period_start
      ? new Date(item.current_period_start * 1000)
      : null,
    currentPeriodEnd: item?.current_period_end ? new Date(item.current_period_end * 1000) : null,
  };
}
