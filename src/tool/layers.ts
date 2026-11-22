import {
  DEFAULT_LAYER,
  DEFAULT_STATE,
  PRESETS,
  clampNumber,
  clampPercent,
  cssDeclaration,
  newLayerId,
  type PresetName,
  type ShadowLayer,
  type ToolState,
} from './types';

/** Replace state with a preset's layers, fresh ids. */
export function applyPreset(state: ToolState, preset: PresetName): ToolState {
  const found = PRESETS.find((p) => p.name === preset);
  if (!found) return { ...state, layers: [{ ...DEFAULT_LAYER, id: newLayerId() }] };
  return {
    ...state,
    layers: found.layers.map((l) => ({ ...l, id: newLayerId() })),
  };
}

/** Add a new layer with sensible defaults on top (end of the array). */
export function addLayer(state: ToolState): ToolState {
  const base: ShadowLayer = {
    ...DEFAULT_LAYER,
    id: newLayerId(),
    color: state.layers.length % 2 === 0 ? '#000000' : '#3b82f6',
    opacity: 100,
  };
  return { ...state, layers: [...state.layers, base] };
}

/** Remove a layer by id. */
export function removeLayer(state: ToolState, id: string): ToolState {
  return { ...state, layers: state.layers.filter((l) => l.id !== id) };
}

/** Duplicate a layer (same values, new id) right after the original. */
export function duplicateLayer(state: ToolState, id: string): ToolState {
  const idx = state.layers.findIndex((l) => l.id === id);
  if (idx === -1 || !state.layers[idx]) return state;
  const copy: ShadowLayer = { ...state.layers[idx], id: newLayerId() };
  const layers = [...state.layers.slice(0, idx + 1), copy, ...state.layers.slice(idx + 1)];
  return { ...state, layers };
}

/** Move a layer by delta positions; no-op when out of range. */
export function moveLayer(state: ToolState, id: string, delta: number): ToolState {
  const idx = state.layers.findIndex((l) => l.id === id);
  const target = idx + delta;
  if (idx === -1 || target < 0 || target >= state.layers.length) return state;
  const layers = [...state.layers];
  const [item] = layers.splice(idx, 1);
  if (!item) return state;
  layers.splice(target, 0, item);
  return { ...state, layers };
}

/** Patch one layer's numeric/string fields with clamping. */
export function updateLayer(state: ToolState, id: string, patch: Partial<ShadowLayer>): ToolState {
  return {
    ...state,
    layers: state.layers.map((l) => {
      if (l.id !== id) return l;
      const next = { ...l, ...patch };
      next.offsetX = clampNumber(next.offsetX, -100, 100, 0);
      next.offsetY = clampNumber(next.offsetY, -100, 100, 0);
      next.blur = clampNumber(next.blur, 0, 100, 0);
      next.opacity = clampPercent(next.opacity);
      return next;
    }),
  };
}

/** Toggle a layer on/off. */
export function toggleLayer(state: ToolState, id: string): ToolState {
  return {
    ...state,
    layers: state.layers.map((l) => (l.id === id ? { ...l, enabled: !l.enabled } : l)),
  };
}

/** Update preview settings with clamping of font size. */
export function updatePreview(state: ToolState, patch: Partial<ToolState['preview']>): ToolState {
  const next = { ...state.preview, ...patch };
  next.fontSize = clampNumber(next.fontSize, 10, 200, 48);
  next.background =
    next.background === 'light' || next.background === 'dark' ? next.background : 'dark';
  return { ...state, preview: next };
}

export { DEFAULT_STATE, cssDeclaration };
