/**
 * QDesign 离线版 - 全功能解锁
 */

export type SubscriptionFeature =
  | 'all_templates'
  | 'ai_background'
  | 'ai_design'
  | 'ai_packaging'
  | 'custom_materials'
  | 'custom_environment'
  | 'custom_background';

export interface UserSubscriptionInfo {
  plan: string;
  plan_name: string;
  status: 'active' | 'canceled' | 'past_due' | 'expired' | 'trialing';
  billing_cycle: 'monthly' | 'yearly' | null;
  current_period_start: number | null;
  current_period_end: number | null;
  canceled_at: number | null;
  features: SubscriptionFeature[];
  storage_limit: number;
  storage_used: number;
  design_limit: number;
  design_count: number;
  credits_per_month: number;
  credits_balance: number;
  subscription_credits: number;
  purchased_credits: number;
}

const ALL_FEATURES: SubscriptionFeature[] = [
  'all_templates',
  'ai_background',
  'ai_design',
  'ai_packaging',
  'custom_materials',
  'custom_environment',
  'custom_background',
];

const LOCAL_SUBSCRIPTION: UserSubscriptionInfo = {
  plan: 'offline_unlimited',
  plan_name: '离线版（无限制）',
  status: 'active',
  billing_cycle: null,
  current_period_start: null,
  current_period_end: null,
  canceled_at: null,
  features: ALL_FEATURES,
  storage_limit: Number.MAX_SAFE_INTEGER,
  storage_used: 0,
  design_limit: Number.MAX_SAFE_INTEGER,
  design_count: 0,
  credits_per_month: Number.MAX_SAFE_INTEGER,
  credits_balance: Number.MAX_SAFE_INTEGER,
  subscription_credits: Number.MAX_SAFE_INTEGER,
  purchased_credits: Number.MAX_SAFE_INTEGER,
};

/** 获取当前订阅 — 无限额度 */
export async function getCurrentSubscription(): Promise<UserSubscriptionInfo> {
  return LOCAL_SUBSCRIPTION;
}
