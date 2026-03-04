/**
 * QDesign 离线版 - 用户图片（内存存储）
 */

export interface UserImage {
  id: string;
  name: string;
  url: string;
  mime_type: string;
  file_size_bytes: number;
  width: number | null;
  height: number | null;
  tag?: string;
  usage_count: number;
  created_at: number;
}

export interface UserImagesResponse {
  success: boolean;
  data: UserImage[];
  meta: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface UploadResult {
  id: string;
  name: string;
  url: string;
  mime_type: string;
  file_size_bytes: number;
  created_at: number;
}

// 内存存储
const imageStore: UserImage[] = [];
const svgStore: UserSvg[] = [];

/**
 * 获取用户上传的图片
 */
export async function getUserImages(page = 1, limit = 20, tag?: string): Promise<UserImagesResponse> {
  let items = tag ? imageStore.filter(img => img.tag === tag) : [...imageStore];
  const total = items.length;
  const start = (page - 1) * limit;
  items = items.slice(start, start + limit);

  return {
    success: true,
    data: items,
    meta: { page, limit, total, hasMore: start + limit < total },
  };
}

/**
 * 上传图片 — 转为 Blob URL 存在内存
 */
export async function uploadImage(file: File, name?: string, tag?: string): Promise<UploadResult> {
  const maxSize = 5 * 1024 * 1024;
  const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

  if (file.size > maxSize) {
    throw new Error('图片大小不能超过 5MB');
  }

  if (!allowedTypes.includes(file.type)) {
    throw new Error('仅支持 JPG、PNG、SVG、WebP 格式');
  }

  const url = URL.createObjectURL(file);
  const id = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const imageName = name || file.name.replace(/\.[^/.]+$/, '');

  const item: UserImage = {
    id,
    name: imageName,
    url,
    mime_type: file.type,
    file_size_bytes: file.size,
    width: null,
    height: null,
    tag,
    usage_count: 0,
    created_at: Date.now(),
  };

  imageStore.push(item);

  return {
    id,
    name: imageName,
    url,
    mime_type: file.type,
    file_size_bytes: file.size,
    created_at: Date.now(),
  };
}

/**
 * 删除图片
 */
export async function deleteImage(id: string): Promise<void> {
  const idx = imageStore.findIndex(img => img.id === id);
  if (idx >= 0) {
    URL.revokeObjectURL(imageStore[idx].url);
    imageStore.splice(idx, 1);
  }
}

// ============================================
// SVG
// ============================================

export interface UserSvg {
  id: string;
  name: string;
  url: string;
  file_size_bytes: number;
  usage_count: number;
  created_at: number;
}

export interface UserSvgsResponse {
  success: boolean;
  data: UserSvg[];
  meta: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

/**
 * 获取用户上传的 SVG
 */
export async function getUserSvgs(page = 1, limit = 20): Promise<UserSvgsResponse> {
  const total = svgStore.length;
  const start = (page - 1) * limit;
  const items = svgStore.slice(start, start + limit);

  return {
    success: true,
    data: items,
    meta: { page, limit, total, hasMore: start + limit < total },
  };
}

/**
 * 上传 SVG
 */
export async function uploadSvg(file: File, name?: string): Promise<UploadResult> {
  const maxSize = 2 * 1024 * 1024;

  if (file.size > maxSize) {
    throw new Error('SVG文件大小不能超过 2MB');
  }

  if (file.type !== 'image/svg+xml' && !file.name.toLowerCase().endsWith('.svg')) {
    throw new Error('仅支持 SVG 格式');
  }

  const url = URL.createObjectURL(file);
  const id = `svg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const svgName = name || file.name.replace(/\.[^/.]+$/, '');

  svgStore.push({
    id,
    name: svgName,
    url,
    file_size_bytes: file.size,
    usage_count: 0,
    created_at: Date.now(),
  });

  return {
    id,
    name: svgName,
    url,
    mime_type: 'image/svg+xml',
    file_size_bytes: file.size,
    created_at: Date.now(),
  };
}

/**
 * 删除 SVG
 */
export async function deleteSvg(id: string): Promise<void> {
  const idx = svgStore.findIndex(s => s.id === id);
  if (idx >= 0) {
    URL.revokeObjectURL(svgStore[idx].url);
    svgStore.splice(idx, 1);
  }
}
