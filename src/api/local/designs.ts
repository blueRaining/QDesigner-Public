/**
 * QDesign 离线版 - 设计数据（资源广场）
 */

export type DesignCategory = 'box' | 'bottle' | 'clothing' | 'ceramic' | 'customDesign' | 'others';

export interface Design {
  id: string;
  name: string;
  description: string | null;
  category: DesignCategory | null;
  template_id: string | null;
  thumbnail_url: string | null;
  model_url: string | null;
  environment_url?: string | null;
  aiconfig_url?: string | null;
  file_size_bytes: number;
  version: number;
  is_public: number;
  user_id?: string;
  user_name?: string;
  user_avatar?: string;
  view_count?: number;
  favorite_count?: number;
  created_at: number;
  updated_at: number;
}

/**
 * CDN 资源基础 URL
 */
const CDN_BASE = './templates';

/**
 * 从 CDN 路径生成资源广场 Design 对象
 */
function cdnDesign(
  id: string,
  name: string,
  category: DesignCategory,
  path: string,
): Design {
  const base = `${CDN_BASE}/${path}`;
  return {
    id,
    name,
    description: null,
    category,
    template_id: null,
    thumbnail_url: `${base}/thumbnail.jpg`,
    model_url: `${base}/model.rain`,
    environment_url: `${base}/environment.env`,
    aiconfig_url: `${base}/aiconfig.json`,
    file_size_bytes: 0,
    version: 1,
    is_public: 1,
    user_id: 'qdesign',
    user_name: 'QDesign',
    view_count: 0,
    favorite_count: 0,
    created_at: 0,
    updated_at: 0,
  };
}

/**
 * ============================================================
 * 资源广场数据 — 在此处添加新资源，无需修改模板中心
 * ============================================================
 *
 * 添加方式：
 *   cdnDesign('唯一ID', '显示名称', '分类', 'CDN子路径')
 *
 * CDN子路径对应: http://cdn.babylonjsx.cn/models/{子路径}/
 * 该目录下需包含: model.rain, thumbnail.jpg, environment.env
 */
const LOCAL_DESIGNS: Design[] = [
  // ===== 瓶型 =====
  cdnDesign('res_bottle_cola',         '可乐瓶',     'bottle',   'bottle/Cola'),
  cdnDesign('res_bottle_cola2',        '可乐瓶2',    'bottle',   'bottle/Cola2'),
  cdnDesign('res_bottle_orange_juice', '橙汁瓶',     'bottle',   'bottle/Orange_juice'),
  cdnDesign('res_bottle_tomato_sauce', '番茄酱瓶',   'bottle',   'bottle/Tomato_sauce'),
  cdnDesign('res_bottle_wine',         '红酒瓶',     'bottle',   'bottle/wine'),
  // ===== 包装盒 =====
  cdnDesign('res_box_packaging',       '包装盒',     'box',      'box/Packaging_box'),
  cdnDesign('res_box_packaging2',      '包装盒2',    'box',      'box/Packaging_box2'),
  // ===== 瓷器 =====
  cdnDesign('res_ceramic_porcelain',   '瓷器',       'ceramic',  'ceramic/porcelain'),
  cdnDesign('res_ceramic_porcelain2',  '瓷器2',      'ceramic',  'ceramic/porcelain2'),
  cdnDesign('res_ceramic_porcelain3',  '瓷器3',      'ceramic',  'ceramic/porcelain3'),
  // ===== 服装 =====
  cdnDesign('res_clothing_tshirt',     'T恤',        'clothing', 'clothing/T-shirt'),
  // ===== 其他 =====
  cdnDesign('res_others_others',       '其他模型',   'others',   'others/others'),
];

export interface DesignFilters {
  category?: DesignCategory;
  sort?: 'latest' | 'popular';
  page?: number;
  limit?: number;
}

/**
 * 获取资源广场列表
 */
export async function getPublicDesigns(filters: DesignFilters = {}): Promise<{
  items: Design[];
  total: number;
}> {
  let items = [...LOCAL_DESIGNS];

  if (filters.category) {
    items = items.filter(d => d.category === filters.category);
  }

  if (filters.sort === 'popular') {
    items.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
  }

  const page = filters.page || 1;
  const limit = filters.limit || 50;
  const start = (page - 1) * limit;

  return {
    items: items.slice(start, start + limit),
    total: items.length,
  };
}

/**
 * 获取设计详情
 */
export async function getDesign(id: string): Promise<Design> {
  const found = LOCAL_DESIGNS.find(d => d.id === id);
  if (found) return found;

  return {
    id,
    name: '本地设计',
    description: null,
    category: null,
    template_id: null,
    thumbnail_url: null,
    model_url: null,
    file_size_bytes: 0,
    version: 1,
    is_public: 0,
    user_id: 'local',
    created_at: Date.now(),
    updated_at: Date.now(),
  };
}
