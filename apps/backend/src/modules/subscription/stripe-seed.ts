import "dotenv/config";
import Stripe from "stripe";
import { prisma } from "@/common/database";
import { SubscriptionPlan } from "@/generated/prisma";

const PLANS = [
  {
    plan: SubscriptionPlan.PRO,
    name: "DepVault Pro",
    amount: 1000,
    description: "For developers and small teams shipping fast",
  },
  {
    plan: SubscriptionPlan.TEAM,
    name: "DepVault Team",
    amount: 1500,
    description: "For organizations that need control and compliance",
  },
] as const;

async function main(): Promise<void> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.error("STRIPE_SECRET_KEY is required");
    process.exit(1);
  }

  const stripe = new Stripe(secretKey);

  console.log("\nSeeding Stripe products and prices...\n");

  for (const { plan, name, amount, description } of PLANS) {
    const metadataKey = "depvault_plan";

    const existingProducts = await stripe.products.search({
      query: `metadata["${metadataKey}"]:"${plan}"`,
    });

    let product: Stripe.Product;

    if (existingProducts.data.length > 0) {
      product = existingProducts.data[0]!;
      product = await stripe.products.update(product.id, { name, description });
      console.log("  Updated product: %s (%s)", name, product.id);
    } else {
      product = await stripe.products.create({
        name,
        description,
        metadata: { [metadataKey]: plan },
      });
      console.log("  Created product: %s (%s)", name, product.id);
    }

    const existingPrices = await stripe.prices.list({
      product: product.id,
      active: true,
      type: "recurring",
      limit: 10,
    });

    let price = existingPrices.data.find(
      (p) => p.unit_amount === amount && p.recurring?.interval === "month" && p.currency === "usd",
    );

    if (!price) {
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: amount,
        currency: "usd",
        recurring: { interval: "month" },
        billing_scheme: "per_unit",
      });
      console.log("  Created price: $%d/mo (%s)", amount / 100, price.id);
    } else {
      console.log("  Existing price: $%d/mo (%s)", amount / 100, price.id);
    }

    await prisma.stripePlan.upsert({
      where: { plan },
      update: {
        productId: product.id,
        priceId: price.id,
        priceAmount: amount,
      },
      create: {
        plan,
        productId: product.id,
        priceId: price.id,
        priceAmount: amount,
      },
    });

    console.log("  Synced to database: %s\n", plan);
  }

  console.log("Stripe seed complete\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
