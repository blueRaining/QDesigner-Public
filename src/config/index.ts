/**
 * Stub for config module.
 * API keys and AI provider configuration are available in the Pro version.
 * All type/interface exports and function signatures are preserved for compatibility.
 */

// ============= AI Provider =============

export type AIProvider = 'google' | '4sapi' | 'apiyi';
export const AI_PROVIDER: AIProvider = 'google';

export function getAIBaseUrl(): string {
  return '';
}

export function getImageModel(): string {
  return 'gemini-2.5-flash-image';
}

export function getTextModel(): string {
  return 'gemini-2.5-flash-image';
}

// ============= AI Image Size =============

export type AIImageSize = '1K' | '2K';

export function getAIImageSize(): AIImageSize {
  return '1K';
}

// ============= Models =============

export interface AIModelOption {
  value: string;
  label: string;
  price: number;
}

export const AI_MODELS: AIModelOption[] = [
  { value: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash', price: 0.05 },
];

export function getModelPrice(): number {
  return 0.05;
}

export function getModelPriceLabel(multiplier: number = 1): string {
  const price = getModelPrice() * multiplier;
  return `$${price % 1 === 0 ? price.toFixed(1) : price}`;
}

// ============= Remote Templates =============

export const TEMPLATE_BASE_URL: string = import.meta.env.VITE_TEMPLATE_BASE_URL || '';

// ============= API Keys =============

export function getGeminiApiKey(): string {
  return '';
}
