/**
 * QDesign 离线版 - 本地预设配置
 */

export type PresetType = 'environment' | 'lighting' | 'camera' | 'complete_scene';

export interface Preset {
  id: string;
  name: string;
  description: string | null;
  type: PresetType;
  thumbnail_url: string | null;
  tier: number;
  credits_required: number;
  status: 'draft' | 'published' | 'unpublished';
  download_count: number;
  file_size_bytes?: number;
  model_url?: string;
  config?: Record<string, unknown>;
  created_at: number;
  updated_at?: number;
}

/**
 * 本地预设配置
 */
const LOCAL_PRESETS: Preset[] = [];

/**
 * 获取单个预设详情
 */
export async function getPreset(id: string): Promise<Preset> {
  const preset = LOCAL_PRESETS.find(p => p.id === id);
  if (!preset) {
    throw new Error(`预设不存在: ${id}`);
  }

  return {
    ...preset,
    model_url: `./presets/${id}/model.rain`,
  };
}
