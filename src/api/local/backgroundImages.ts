/**
 * QDesign 离线版 - 背景图（内存存储）
 */

import { publicBackgrounds } from '/@/page/editor/datas/backgrounds';

export interface BackgroundImage {
  id: string;
  name: string;
  thumbnail_url: string | null;
  image_url: string;
  file_size_bytes: number;
  width: number | null;
  height: number | null;
  created_at: number;
  is_public?: boolean;
}

interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// 内存存储
const bgImages: BackgroundImage[] = [];

// 将配置转为 BackgroundImage 格式
const publicBgImages: BackgroundImage[] = publicBackgrounds.map((bg) => ({
  id: bg.id,
  name: bg.name,
  thumbnail_url: bg.url,
  image_url: bg.url,
  file_size_bytes: 0,
  width: null,
  height: null,
  created_at: 0,
  is_public: true,
}));

export async function getPublicBackgroundImages(page = 1, limit = 50): Promise<PaginatedResponse<BackgroundImage>> {
  const total = publicBgImages.length;
  const start = (page - 1) * limit;
  const items = publicBgImages.slice(start, start + limit);
  return {
    success: true,
    data: items,
    meta: { page, limit, total, hasMore: start + limit < total },
  };
}

export async function getUserBackgroundImages(page = 1, limit = 50): Promise<PaginatedResponse<BackgroundImage>> {
  const total = bgImages.length;
  const start = (page - 1) * limit;
  const items = bgImages.slice(start, start + limit);

  return {
    success: true,
    data: items,
    meta: { page, limit, total, hasMore: start + limit < total },
  };
}

export async function uploadBackgroundImage(
  file: File,
  thumbnail?: Blob | null
): Promise<BackgroundImage> {
  const imageUrl = URL.createObjectURL(file);
  const thumbnailUrl = thumbnail ? URL.createObjectURL(thumbnail) : null;
  const id = `bg_${Date.now()}`;

  const bgImage: BackgroundImage = {
    id,
    name: file.name.replace(/\.[^/.]+$/, ''),
    thumbnail_url: thumbnailUrl,
    image_url: imageUrl,
    file_size_bytes: file.size,
    width: null,
    height: null,
    created_at: Date.now(),
  };

  bgImages.push(bgImage);
  return bgImage;
}

export async function renameBackgroundImage(id: string, name: string, _isPublic = false): Promise<void> {
  const img = bgImages.find(b => b.id === id);
  if (img) img.name = name;
}

export async function deleteBackgroundImage(id: string, _isPublic = false): Promise<void> {
  const idx = bgImages.findIndex(b => b.id === id);
  if (idx >= 0) {
    URL.revokeObjectURL(bgImages[idx].image_url);
    if (bgImages[idx].thumbnail_url) URL.revokeObjectURL(bgImages[idx].thumbnail_url!);
    bgImages.splice(idx, 1);
  }
}
