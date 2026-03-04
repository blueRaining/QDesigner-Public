/**
 * QDesign 离线版 - 本地模板配置
 */

import { TEMPLATE_BASE_URL } from '/@/config';

export type TemplateCategory = 'box' | 'bottle' | 'clothing' | 'ceramic' | 'customDesign' | 'others';

export interface Template {
  id: string;
  name: string;
  description: string | null;
  category: TemplateCategory;
  thumbnail_url: string | null;
  tier: number;
  credits_required: number;
  status: 'draft' | 'published' | 'unpublished';
  download_count: number;
  view_count?: number;
  use_count?: number;
  favorite_count?: number;
  created_at: number;
  zip_url?: string;
}

export interface TemplateFilters {
  category?: TemplateCategory;
  tier?: number;
  page?: number;
  limit?: number;
}

export interface TemplatesResponse {
  items: Template[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

/**
 * CDN 模板基础 URL
 */
const CDN_BASE = './templates';

/**
 * 从 CDN config.json URL 生成 Template 对象
 */
function cdnTemplate(
  id: string,
  name: string,
  category: TemplateCategory,
  /** config.json 所在目录相对于 CDN_BASE 的路径，如 'bottle/Cola' */
  path: string,
): Template & { model_url?: string; environment_url?: string; aiconfig_url?: string } {
  const base = `${CDN_BASE}/${path}`;
  return {
    id,
    name,
    description: null,
    category,
    thumbnail_url: `${base}/thumbnail.jpg`,
    tier: 0,
    credits_required: 0,
    status: 'published',
    download_count: 0,
    created_at: 0,
    model_url: `${base}/model.rain`,
    environment_url: `${base}/environment.env`,
    aiconfig_url: `${base}/aiconfig.json`,
  } as any;
}

/**
 * 本地 + CDN 模板配置
 */
const LOCAL_TEMPLATES: (Template & { model_url?: string })[] = [
  // ===== 瓶型标签 =====
  cdnTemplate('cdn_bottle_cola',         '可乐瓶',     'bottle', 'bottle/Cola'),
  cdnTemplate('cdn_bottle_cola2',        '可乐瓶2',    'bottle', 'bottle/Cola2'),
  cdnTemplate('cdn_bottle_orange_juice', '橙汁瓶',     'bottle', 'bottle/Orange_juice'),
  cdnTemplate('cdn_bottle_tomato_sauce', '番茄酱瓶',   'bottle', 'bottle/Tomato_sauce'),
  cdnTemplate('cdn_bottle_wine',         '红酒瓶',     'bottle', 'bottle/wine'),
  // ===== 包装盒 =====
  cdnTemplate('cdn_box_packaging',       '包装盒',     'box',    'box/Packaging_box'),
  cdnTemplate('cdn_box_packaging2',      '包装盒2',    'box',    'box/Packaging_box2'),
  // ===== 瓷器 =====
  cdnTemplate('cdn_ceramic_porcelain',   '瓷器',       'ceramic', 'ceramic/porcelain'),
  cdnTemplate('cdn_ceramic_porcelain2',  '瓷器2',      'ceramic', 'ceramic/porcelain2'),
  cdnTemplate('cdn_ceramic_porcelain3',  '瓷器3',      'ceramic', 'ceramic/porcelain3'),
  // ===== 服装 =====
  cdnTemplate('cdn_clothing_tshirt',     'T恤',        'clothing', 'clothing/T-shirt'),
  // ===== 其他 =====
  cdnTemplate('cdn_others_others',       '其他模型',   'others', 'others/others'),
];

// ========== 远程模板缓存 ==========
let _remoteTemplatesCache: Template[] | null = null;
let _remoteFetchPromise: Promise<Template[]> | null = null;

/**
 * 获取远程模板列表（带缓存）
 */
async function fetchRemoteTemplates(): Promise<Template[]> {
  if (_remoteTemplatesCache) return _remoteTemplatesCache;
  if (_remoteFetchPromise) return _remoteFetchPromise;

  if (!TEMPLATE_BASE_URL) return [];

  _remoteFetchPromise = (async () => {
    try {
      const baseUrl = TEMPLATE_BASE_URL.endsWith('/') ? TEMPLATE_BASE_URL : TEMPLATE_BASE_URL + '/';
      const resp = await fetch(baseUrl + 'templates.json');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();

      const templates: Template[] = (data.templates || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        description: null,
        category: t.category as TemplateCategory,
        thumbnail_url: t.thumbnail ? baseUrl + t.thumbnail : null,
        tier: 0,
        credits_required: 0,
        status: 'published' as const,
        download_count: 0,
        created_at: 0,
        zip_url: t.zip ? baseUrl + t.zip : undefined,
      }));

      _remoteTemplatesCache = templates;
      return templates;
    } catch (e) {
      console.warn('Failed to fetch remote templates:', e);
      return [];
    } finally {
      _remoteFetchPromise = null;
    }
  })();

  return _remoteFetchPromise;
}

/**
 * 合并本地和远程模板
 */
async function getAllTemplates(): Promise<Template[]> {
  const local = LOCAL_TEMPLATES.filter(t => t.status === 'published');
  const remote = await fetchRemoteTemplates();
  return [...local, ...remote];
}

/**
 * 获取模板列表
 */
export async function getTemplates(filters: TemplateFilters = {}): Promise<TemplatesResponse> {
  let items = await getAllTemplates();

  if (filters.category) {
    items = items.filter(t => t.category === filters.category);
  }

  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const start = (page - 1) * limit;
  const paged = items.slice(start, start + limit);

  return {
    items: paged,
    page,
    limit,
    total: items.length,
    hasMore: start + limit < items.length,
  };
}

/**
 * 按类别获取模板
 */
export async function getTemplatesByCategory(category: TemplateCategory): Promise<Template[]> {
  const result = await getTemplates({ category, limit: 50 });
  return result.items;
}

/**
 * 获取单个模板详情
 */
export async function getTemplate(id: string): Promise<Template & { file_size_bytes: number; config: any; model_url?: string; environment_url?: string; aiconfig_url?: string }> {
  // 先查本地（含 CDN 模板）
  const localTemplate = LOCAL_TEMPLATES.find(t => t.id === id);
  if (localTemplate) {
    return {
      ...localTemplate,
      file_size_bytes: 0,
      config: null,
      // CDN 模板已有 model_url / environment_url，本地模板使用默认路径
      model_url: (localTemplate as any).model_url || `./templates/${id}/model.rain`,
      environment_url: (localTemplate as any).environment_url || undefined,
      aiconfig_url: (localTemplate as any).aiconfig_url || undefined,
    };
  }

  // 再查远程
  const remoteTemplates = await fetchRemoteTemplates();
  const remoteTemplate = remoteTemplates.find(t => t.id === id);
  if (remoteTemplate) {
    return {
      ...remoteTemplate,
      file_size_bytes: 0,
      config: null,
      // 远程模板不提供 model_url，通过 zip_url 加载
    };
  }

  throw new Error(`模板不存在: ${id}`);
}

/**
 * 切换收藏模板 — 空操作
 */
export async function toggleFavoriteTemplate(_id: string): Promise<{ favorited: boolean; favorite_count: number }> {
  return { favorited: false, favorite_count: 0 };
}
