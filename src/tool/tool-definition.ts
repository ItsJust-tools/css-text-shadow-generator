import type { Tool, DeserializeResult } from '@itsjust/core';
import toolConfig from './tool.config';
import {
  DEFAULT_LAYER,
  DEFAULT_STATE,
  clampNumber,
  clampPercent,
  cssDeclaration,
  type PreviewSettings,
  type ShadowLayer,
  type ToolState,
} from './types';

const HEX_OR_COLOR = /^[0-9a-zA-Z#(),.\s%]+$/;

function layerOr(value: unknown, fallback: ShadowLayer): ShadowLayer {
  if (typeof value !== 'object' || value === null) return { ...fallback };
  const v = value as Record<string, unknown>;
  const base: ShadowLayer = {
    id: typeof v.id === 'string' && v.id ? v.id : fallback.id,
    offsetX: clampNumber(Number(v.offsetX), -100, 100, fallback.offsetX),
    offsetY: clampNumber(Number(v.offsetY), -100, 100, fallback.offsetY),
    blur: clampNumber(Number(v.blur), 0, 100, fallback.blur),
    color: typeof v.color === 'string' && HEX_OR_COLOR.test(v.color) ? v.color : fallback.color,
    opacity: clampPercent(Number(v.opacity)),
    enabled: typeof v.enabled === 'boolean' ? v.enabled : fallback.enabled,
  };
  if (
    typeof v.offsetX !== 'number' ||
    typeof v.offsetY !== 'number' ||
    typeof v.blur !== 'number' ||
    typeof v.opacity !== 'number'
  ) {
    // Preserve original numeric strings? No — non-numeric fields fall back.
    if (Number.isNaN(base.offsetX)) base.offsetX = fallback.offsetX;
    if (Number.isNaN(base.blur)) base.blur = fallback.blur;
  }
  return base;
}

function previewOr(value: unknown, fallback: PreviewSettings): PreviewSettings {
  if (typeof value !== 'object' || value === null) return { ...fallback };
  const v = value as Record<string, unknown>;
  const background = v.background === 'light' ? 'light' : 'dark';
  const fontSize = clampNumber(Number(v.fontSize), 10, 200, fallback.fontSize);
  const sampleText =
    typeof v.sampleText === 'string' ? v.sampleText.slice(0, 200) : fallback.sampleText;
  return { sampleText, fontSize, background };
}

/** Serialize tool state into a compact JSON string for share/import. */
export function serializeState(state: ToolState): string {
  return JSON.stringify({
    layers: state.layers,
    preview: state.preview,
  });
}

/** Validate and recover tool state from an arbitrary payload. */
export function deserializeState(data: unknown): DeserializeResult<ToolState> {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return {
      success: false,
      error: 'Invalid data format: expected CSS text shadow generator state object',
    };
  }
  const v = data as Record<string, unknown>;
  const layers = Array.isArray(v.layers)
    ? v.layers.slice(0, 50).map((l) => layerOr(l, DEFAULT_LAYER))
    : [{ ...DEFAULT_LAYER }];
  const preview = previewOr(v.preview, DEFAULT_STATE.preview);
  return { success: true, data: { layers, preview } };
}

/** True when a serialized string round-trips back to the same state. */
export function roundTrips(state: ToolState): boolean {
  try {
    const restored = deserializeState(JSON.parse(serializeState(state)));
    return restored.success && JSON.stringify(restored.data) === JSON.stringify(state);
  } catch {
    return false;
  }
}

export const cssTextShadowGeneratorTool: Tool<ToolState> = {
  id: toolConfig.id,
  name: toolConfig.name,
  version: toolConfig.version,
  config: toolConfig,
  initialState: JSON.parse(JSON.stringify(DEFAULT_STATE)) as ToolState,
  serialize: serializeState,
  deserialize: deserializeState,
  exporters: [
    { format: 'png', loader: () => import('./exporters/png') },
    { format: 'jpeg', loader: () => import('./exporters/jpeg') },
    { format: 'webp', loader: () => import('./exporters/webp') },
    { format: 'pdf', loader: () => import('./exporters/pdf') },
  ],
};

export { cssDeclaration, DEFAULT_STATE, DEFAULT_LAYER };
