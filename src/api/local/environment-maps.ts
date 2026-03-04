/**
 * QDesign 离线版 - 环境贴图（内存存储）
 */
import { publicEnvironments } from '/@/page/editor/datas/environments';

export interface EnvironmentMap {
  id: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  hdr_url: string;
  file_type: 'hdr' | 'env' | 'basis' | 'dds';
  file_size_bytes: number;
  download_count: number;
  created_at: number;
}

export interface EnvironmentMapsResponse {
  success: boolean;
  data: EnvironmentMap[];
  meta: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface UploadEnvironmentMapResult {
  id: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  hdr_url: string;
  file_type: string;
  file_size_bytes: number;
  created_at: number;
}

// 内存存储
const envMaps: EnvironmentMap[] = [];

// 预置公共环境球数据
const publicEnvMaps: EnvironmentMap[] = publicEnvironments.map((item) => ({
  id: item.id,
  name: item.name,
  description: null,
  thumbnail_url: item.thumbnailUrl,
  hdr_url: item.hdrUrl,
  file_type: item.fileType as EnvironmentMap['file_type'],
  file_size_bytes: 0,
  download_count: 0,
  created_at: 0,
}));

export async function getPublicEnvironmentMaps(page = 1, limit = 20): Promise<EnvironmentMapsResponse> {
  const total = publicEnvMaps.length;
  const start = (page - 1) * limit;
  const items = publicEnvMaps.slice(start, start + limit);

  return {
    success: true,
    data: items,
    meta: { page, limit, total, hasMore: start + limit < total },
  };
}

export async function getUserEnvironmentMaps(page = 1, limit = 20): Promise<EnvironmentMapsResponse> {
  const total = envMaps.length;
  const start = (page - 1) * limit;
  const items = envMaps.slice(start, start + limit);

  return {
    success: true,
    data: items,
    meta: { page, limit, total, hasMore: start + limit < total },
  };
}

export async function uploadEnvironmentMap(
  file: File,
  thumbnail: Blob | null,
  name?: string,
  _isPublic = false
): Promise<UploadEnvironmentMapResult> {
  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    const error: any = new Error('文件大小不能超过 50MB');
    error.code = 'FILE_TOO_LARGE';
    throw error;
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'hdr';
  const hdrUrl = URL.createObjectURL(file);
  const thumbnailUrl = thumbnail ? URL.createObjectURL(thumbnail) : null;
  const id = `env_${Date.now()}`;
  const envName = name || file.name.replace(/\.[^/.]+$/, '');

  const envMap: EnvironmentMap = {
    id,
    name: envName,
    description: null,
    thumbnail_url: thumbnailUrl,
    hdr_url: hdrUrl,
    file_type: ext as any,
    file_size_bytes: file.size,
    download_count: 0,
    created_at: Date.now(),
  };

  envMaps.push(envMap);

  return {
    id,
    name: envName,
    description: null,
    thumbnail_url: thumbnailUrl,
    hdr_url: hdrUrl,
    file_type: ext,
    file_size_bytes: file.size,
    created_at: Date.now(),
  };
}

export async function deleteEnvironmentMap(id: string, _isPublic = false): Promise<void> {
  const idx = envMaps.findIndex(e => e.id === id);
  if (idx >= 0) {
    URL.revokeObjectURL(envMaps[idx].hdr_url);
    if (envMaps[idx].thumbnail_url) URL.revokeObjectURL(envMaps[idx].thumbnail_url!);
    envMaps.splice(idx, 1);
  }
}

export async function renameEnvironmentMap(id: string, newName: string, _isPublic = false): Promise<void> {
  const envMap = envMaps.find(e => e.id === id);
  if (envMap) envMap.name = newName;
}
