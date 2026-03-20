export const STRIPE_PLANS = {
  starter: {
    name: "Starter",
    price_id: "price_1TD7GeAWhwMVLtF9cL6vo9yD",
    product_id: "prod_UBUFJGgu4DHefP",
    price: 97,
  },
  professional: {
    name: "Professional",
    price_id: "price_1TD7H2AWhwMVLtF9KKWSiULr",
    product_id: "prod_UBUFH7snDsM3SP",
    price: 197,
  },
  enterprise: {
    name: "Enterprise",
    price_id: "price_1TD7HNAWhwMVLtF9pNXReOYw",
    product_id: "prod_UBUF3aUZvoR0fj",
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
