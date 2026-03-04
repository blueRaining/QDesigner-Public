/**
 * Stub for UV Show window functions.
 * The full UV editor is available in the Pro version.
 */

export interface OpenUVShowOptions {
  fromDesign?: boolean;
}

export function openUVShowWindow(_options?: OpenUVShowOptions): void {
  console.warn("[QDesigner] UV editor is available in the Pro version.");
}

export function closeUVShowWindow(): void {
  // no-op
}
