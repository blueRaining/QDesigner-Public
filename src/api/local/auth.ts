/**
 * QDesign 离线版 - 认证
 * 始终返回已登录状态，无需真实认证
 */

export interface QDesignUser {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: 'user' | 'admin' | 'super_admin';
  subscription_plan?: string;
  credits_balance: number;
  subscription_credits?: number;
  purchased_credits?: number;
}

const LOCAL_USER: QDesignUser = {
  id: 'local',
  email: 'local@qdesign.offline',
  name: '本地用户',
  avatar_url: undefined,
  role: 'super_admin',
  subscription_plan: 'unlimited',
  credits_balance: Infinity,
  subscription_credits: Infinity,
  purchased_credits: Infinity,
};

/** 返回本地用户 */
export function getCachedUserInfo(): QDesignUser {
  return LOCAL_USER;
}

/** 更新积分缓存 — 离线版空操作 */
export function updateCachedCredits(_balance: number): void {}
