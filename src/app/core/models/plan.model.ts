export type PlanType = 'free' | 'standard' | 'premium' | 'enterprise';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  maxUsers?: number;
  maxStorageMb?: number;
  maxExpensesPerMonth?: number;
  priceMonthly?: number;
  priceYearly?: number;
  createdAt?: string;
}
