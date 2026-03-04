/**
 * 公共材质预置数据 —— 基于 CDN 上的材质资源生成
 * 对应 ServiceMaterialAsset/Data/MaterialData.js 的数据，
 * 转为 MaterialFolder / UserMaterial 格式供公共材质 API 使用
 */
import type { MaterialFolder, UserMaterial } from './materials';

const BASE_URL = './Materials';

interface CategoryConfig {
    id: string;
    label: string;
    folder: string;     // CDN 子路径
    count: number;
}

const categories: CategoryConfig[] = [
    { id: 'metal',   label: '金属',     folder: 'metal',   count: 20 },
    { id: 'fabric',  label: '布料',     folder: 'fabric',  count: 65 },
    { id: 'wood',    label: '木质材质', folder: 'wood',    count: 55 },
    { id: 'plastic', label: '塑料',     folder: 'plastic', count: 20 },
    { id: 'leather', label: '皮革',     folder: 'leather', count: 23 },
    { id: 'glass',   label: '玻璃',     folder: 'glass',   count: 1 },
    { id: 'grass',   label: '草地',     folder: 'grass',   count: 4 },
    { id: 'marble',  label: '大理石',   folder: 'marble',  count: 20 },
];

// 生成公共文件夹列表
export const publicFolders: MaterialFolder[] = categories.map((cat, index) => ({
    id: `public_${cat.id}`,
    name: cat.label,
    is_default: false,
    sort_order: index,
    material_count: cat.count,
    created_at: 0,
    updated_at: 0,
}));

// 生成公共材质数据（按 folderId 索引）
export const publicMaterialsByFolder: Record<string, UserMaterial[]> = {};

for (const cat of categories) {
    const folderId = `public_${cat.id}`;
    const items: UserMaterial[] = [];
    for (let i = 0; i < cat.count; i++) {
        const num = `00${i + 1}`;
        items.push({
            id: `public_${cat.id}_${num}`,
            name: `${cat.label} ${i + 1}`,
            folder_id: folderId,
            thumbnail_url: `${BASE_URL}/${cat.folder}/${num}.png`,
            config_url: `${BASE_URL}/${cat.folder}/${num}.json`,
            base_url: `${BASE_URL}/${cat.folder}/`,
            file_count: 1,
            total_size_bytes: 0,
            created_at: 0,
            updated_at: 0,
        });
    }
    publicMaterialsByFolder[folderId] = items;
}
