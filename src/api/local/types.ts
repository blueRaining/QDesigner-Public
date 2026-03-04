/**
 * QDesign 离线版类型定义
 */

// 预设类型
export type PresetType = 'environment' | 'lighting' | 'camera';

// 模板状态
type TemplateStatus = 'draft' | 'published' | 'unpublished';

// 产品分类
type Category = 'box' | 'bottle' | 'clothing' | 'ceramic' | 'others' | 'customDesign';

/**
 * 预设场景
 */
export interface Preset {
  id: string;
  name: string;
  description: string | null;
  type: PresetType;
  category?: Category;
  thumbnail_url: string | null;
  tier: number;
  credits_required: number;
  status: TemplateStatus;
  download_count: number;
  created_at: number;
  created_by?: string;
}
