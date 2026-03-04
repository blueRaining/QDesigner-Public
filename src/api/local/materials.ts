/**
 * QDesign 离线版 - 材质管理（内存存储）
 */
import { publicFolders, publicMaterialsByFolder } from './publicMaterialData';

export interface MaterialFolder {
  id: string;
  name: string;
  is_default: boolean;
  sort_order: number;
  material_count: number;
  created_at: number;
  updated_at: number;
}

export interface UserMaterial {
  id: string;
  name: string;
  folder_id: string;
  thumbnail_url: string | null;
  config_url: string;
  base_url: string;
  config?: object;
  file_count: number;
  total_size_bytes: number;
  created_at: number;
  updated_at: number;
}

export interface UploadMaterialData {
  name: string;
  folderId?: string;
  config: object;
  thumbnail?: Blob;
  textures: { [filename: string]: Blob };
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// 内存存储
const folders: MaterialFolder[] = [{
  id: 'default',
  name: '默认文件夹',
  is_default: true,
  sort_order: 0,
  material_count: 0,
  created_at: Date.now(),
  updated_at: Date.now(),
}];
const materials: UserMaterial[] = [];

export async function getMaterialFolders(_page = 1, _limit = 100): Promise<MaterialFolder[]> {
  return [...folders];
}

export async function getPublicMaterialFolders(_page = 1, _limit = 100): Promise<MaterialFolder[]> {
  return [...publicFolders];
}

export async function renamePublicMaterialFolder(_id: string, _name: string): Promise<void> {}
export async function deletePublicMaterialFolder(_id: string): Promise<void> {}

export async function createMaterialFolder(name: string): Promise<MaterialFolder> {
  const folder: MaterialFolder = {
    id: `folder_${Date.now()}`,
    name,
    is_default: false,
    sort_order: folders.length,
    material_count: 0,
    created_at: Date.now(),
    updated_at: Date.now(),
  };
  folders.push(folder);
  return folder;
}

export async function renameMaterialFolder(id: string, name: string): Promise<void> {
  const folder = folders.find(f => f.id === id);
  if (folder) folder.name = name;
}

export async function deleteMaterialFolder(id: string): Promise<void> {
  const idx = folders.findIndex(f => f.id === id);
  if (idx >= 0) folders.splice(idx, 1);
}

export async function getPublicMaterials(
  folderId?: string,
  page = 1,
  limit = 100
): Promise<{ items: UserMaterial[]; hasMore: boolean; total: number }> {
  const all = folderId ? (publicMaterialsByFolder[folderId] || []) : [];
  const start = (page - 1) * limit;
  const items = all.slice(start, start + limit);
  return { items, hasMore: start + limit < all.length, total: all.length };
}

export async function renamePublicMaterial(_id: string, _name: string): Promise<void> {}
export async function deletePublicMaterial(_id: string): Promise<void> {}

export async function getUserMaterials(folderId?: string, _page = 1, _limit = 100): Promise<UserMaterial[]> {
  return folderId ? materials.filter(m => m.folder_id === folderId) : [...materials];
}

export async function uploadMaterial(materialData: UploadMaterialData): Promise<UserMaterial> {
  const thumbnailUrl = materialData.thumbnail ? URL.createObjectURL(materialData.thumbnail) : null;
  const configBlob = new Blob([JSON.stringify(materialData.config)], { type: 'application/json' });
  const configUrl = URL.createObjectURL(configBlob);

  const material: UserMaterial = {
    id: `mat_${Date.now()}`,
    name: materialData.name,
    folder_id: materialData.folderId || 'default',
    thumbnail_url: thumbnailUrl,
    config_url: configUrl,
    base_url: '',
    config: materialData.config,
    file_count: Object.keys(materialData.textures).length,
    total_size_bytes: 0,
    created_at: Date.now(),
    updated_at: Date.now(),
  };

  materials.push(material);
  return material;
}

export async function moveMaterial(materialId: string, folderId: string): Promise<void> {
  const material = materials.find(m => m.id === materialId);
  if (material) material.folder_id = folderId;
}

export async function renameMaterial(materialId: string, name: string): Promise<void> {
  const material = materials.find(m => m.id === materialId);
  if (material) material.name = name;
}

export async function deleteMaterial(id: string): Promise<void> {
  const idx = materials.findIndex(m => m.id === id);
  if (idx >= 0) materials.splice(idx, 1);
}
