/**
 * Stub for AI API module.
 * The full AI functionality is available in the Pro version.
 * All type/interface exports are preserved for compatibility.
 */

// ============================================
// Types (preserved for compatibility)
// ============================================

export type AIModule = 'packaging' | 'design' | 'background';
export type AIGenerationType = 'image' | 'video';
export type AIGenerationStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface AIPricingConfig {
  packaging: { generate: number; inpaint: number };
  design: { image: number; text: number; video: number };
  background: { generate: number; remove: number; generate_and_remove: number };
}

export interface AIGeneration {
  id: string;
  module: AIModule;
  type: AIGenerationType;
  prompt: string | null;
  output_url: string | null;
  thumbnail_url: string | null;
  status: AIGenerationStatus;
  credits_cost: number;
  created_at: number;
  completed_at: number | null;
}

export interface GenerationResult {
  generation_id: string;
  output_url: string;
  prompt: string;
  credits_cost: number;
  credits_remaining: number;
}

export interface GenerationConfig {
  temperature?: number;
  top_k?: number;
  top_p?: number;
  candidate_count?: number;
  image_size?: '1K' | '2K' | '4K';
}

export type ContentsStructureItem = {
  type: 'text' | 'image';
  key?: string;
  optional?: boolean;
};

export type PredefinedStructureType =
  | 'design_generate'
  | 'packaging_inpaint'
  | 'packaging_generate'
  | 'background_generate'
  | 'background_remove'
  | 'background_generate_and_remove';

export interface UnifiedGenerateParams {
  prompt: string;
  user_prompt?: string;
  model?: string;
  module?: AIModule;
  structure_type?: PredefinedStructureType;
  contents_structure?: ContentsStructureItem[];
  generation_config?: GenerationConfig;
  images?: Record<string, string>;
  design_id?: string;
}

export interface UnifiedGenerateFormDataParams {
  prompt: string;
  user_prompt?: string;
  model?: string;
  module?: AIModule;
  structure_type?: PredefinedStructureType;
  contents_structure?: ContentsStructureItem[];
  generation_config?: GenerationConfig;
  images: Record<string, Blob | File>;
  design_id?: string;
  extra_fields?: Record<string, string>;
}

export interface GenerationsFilter {
  module?: AIModule;
  type?: AIGenerationType;
  status?: AIGenerationStatus;
  page?: number;
  limit?: number;
}

export type AIConfigEntityType = 'design' | 'template' | 'preset';

export interface AIConfigSaveResult {
  id: string;
  entity_type: AIConfigEntityType;
  entity_id: string;
  uv_assets: string[];
  created_at?: number;
  updated_at: number;
}

export interface AIConfigLoadResult {
  id: string;
  entity_type: AIConfigEntityType;
  entity_id: string;
  encrypted_json: string;
  uv_assets: string[];
  created_at: number;
  updated_at: number;
}

// ============================================
// Stub API functions
// ============================================

export async function generateUnifiedFormData(
  _params: UnifiedGenerateFormDataParams
): Promise<GenerationResult> {
  throw new Error('AI generation is available in the Pro version.');
}

export async function listGenerations(
  _filter: GenerationsFilter = {}
): Promise<{ items: AIGeneration[]; meta: { page: number; limit: number; total: number; hasMore: boolean } }> {
  return { items: [], meta: { page: 1, limit: 20, total: 0, hasMore: false } };
}

export async function deleteGeneration(_generationId: string): Promise<void> {
  // no-op
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const match = /^data:(.*?);base64,(.*)$/i.exec(dataUrl);
  if (!match) {
    throw new Error('Invalid data URL');
  }
  const mimeType = match[1] || 'image/png';
  const base64Data = match[2];
  const byteCharacters = atob(base64Data);
  const len = byteCharacters.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = byteCharacters.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

export async function saveAIConfig(
  _entityType: AIConfigEntityType,
  _entityId: string,
  _encryptedJson: string,
  _images: any[]
): Promise<AIConfigSaveResult> {
  return {
    id: 'local',
    entity_type: _entityType,
    entity_id: _entityId,
    uv_assets: [],
    updated_at: Date.now(),
  };
}
