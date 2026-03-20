export const STRIPE_PLANS = {
  starter: {
    name: "Starter",
    price_id: "price_1TD6ALAgGS1pODqVHX2hHoqc",
    product_id: "prod_UBT6n8G8vpirup",
    price: 97,
  },
  professional: {
    name: "Professional",
    price_id: "price_1TD6BvAgGS1pODqVLan5avYK",
    product_id: "prod_UBT8Y4qw6WBaMm",
    price: 197,
  },
  enterprise: {
    name: "Enterprise",
    price_id: "price_1TD6CSAgGS1pODqVQCmYokmU",
    product_id: "prod_UBT8eilXMNN0ng",
    price: 497,
  },
} as const;

export type PlanKey = keyof typeof STRIPE_PLANS;

export function getPlanByPriceId(priceId: string): PlanKey | null {
  for (const [key, plan] of Object.entries(STRIPE_PLANS)) {
    if (plan.price_id === priceId) return key as PlanKey;
  }
  return null;
}

export function getPlanByProductId(productId: string): PlanKey | null {
  for (const [key, plan] of Object.entries(STRIPE_PLANS)) {
    if (plan.product_id === productId) return key as PlanKey;
  }
  return null;
}
