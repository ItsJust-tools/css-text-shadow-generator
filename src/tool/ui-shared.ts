import { DEFAULT_STATE, type PresetName, type ToolState } from './types';

export const PREVIEW_BACKGROUNDS: { value: ToolState['preview']['background']; label: string }[] = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
];

/** Compact summary used by the status bar and copy actions. */
export function summaryText(state: ToolState): string {
  const count = state.layers.filter((l) => l.enabled).length;
  if (count === 0) return 'text-shadow: none';
  return `${count} shadow layer${count === 1 ? '' : 's'}`;
}

export function isState(value: unknown): value is ToolState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<ToolState>;
  return Array.isArray(v.layers) && typeof v.preview === 'object';
}

export type { ToolState, PresetName };
export { DEFAULT_STATE };
