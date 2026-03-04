/**
 * 公共材质数据配置
 */

const BASE_URL = './Materials';

interface MaterialItem {
  id: string;
  class: string;
  name: number;
  materialPath: string;
  imagePath: string;
}

interface MaterialCategory {
  class: string;
  label: string;
  datas: MaterialItem[];
}

function generateItems(className: string, folder: string, count: number): MaterialItem[] {
  return Array.from({ length: count }, (_, i) => {
    const n = i + 1;
    const padded = String(n).padStart(3, '0');
    return {
      id: padded,
      class: className,
      name: n,
      materialPath: `${BASE_URL}/${folder}/${padded}.json`,
      imagePath: `${BASE_URL}/${folder}/${padded}.png`,
    };
  });
}

export const materialCategories: MaterialCategory[] = [
  { class: 'Metal',   label: '金属',     datas: generateItems('Metal',   'metal',   20) },
  { class: 'Fabric',  label: '布料',     datas: generateItems('Fabric',  'fabric',  65) },
  { class: 'Wood',    label: '木质材质', datas: generateItems('Wood',    'wood',    55) },
  { class: 'plastic', label: '塑料',     datas: generateItems('plastic', 'plastic', 20) },
  { class: 'leather', label: '皮革',     datas: generateItems('leather', 'leather', 23) },
  { class: 'glass',   label: '玻璃',     datas: generateItems('glass',   'glass',   1) },
  { class: 'marble',  label: '大理石',   datas: generateItems('marble',  'marble',  20) },
];
