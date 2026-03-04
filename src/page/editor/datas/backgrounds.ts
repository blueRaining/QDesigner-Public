/**
 * 公共背景图配置
 */

const CDN_BASE = './background';

export interface BackgroundItem {
  id: string;
  name: string;
  url: string;
}

export const publicBackgrounds: BackgroundItem[] = Array.from({ length: 15 }, (_, i) => {
  const n = i + 1;
  return {
    id: `pub_bg_${n}`,
    name: `背景 ${n}`,
    url: `${CDN_BASE}/bg${n}.jpg`,
  };
});
