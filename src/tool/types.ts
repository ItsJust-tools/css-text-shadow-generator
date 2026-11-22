/** One text-shadow layer. */
export interface ShadowLayer {
  /** Unique layer id. */
  id: string;
  /** Offset X in px (can be negative). */
  offsetX: number;
  /** Offset Y in px (can be negative). */
  offsetY: number;
  /** Blur radius in px (>= 0). */
  blur: number;
  /** Layer color — any hex string; converted to rgba() in CSS output. */
  color: string;
  /** 0–100 opacity percentage applied to the color. */
  opacity: number;
  /** Whether this layer participates in the output. */
  enabled: boolean;
}

/** Preview settings for the live text sample. */
export interface PreviewSettings {
  /** Sample text rendered in the preview. */
  sampleText: string;
  /** Font size in px (10–200). */
  fontSize: number;
  /** Preview background: light or dark. */
  background: 'light' | 'dark';
}

export interface ToolState {
  /** Stacked shadow layers, bottom-to-top rendering order. */
  layers: ShadowLayer[];
  /** Preview panel settings. */
  preview: PreviewSettings;
}

export const DEFAULT_LAYER: ShadowLayer = {
  id: 'layer-1',
  offsetX: 2,
  offsetY: 2,
  blur: 4,
  color: '#000000',
  opacity: 60,
  enabled: true,
};

export const DEFAULT_STATE: ToolState = {
  layers: [{ ...DEFAULT_LAYER }],
  preview: {
    sampleText: 'Text Shadow',
    fontSize: 48,
    background: 'dark',
  },
};

/** Library of ready-made shadow presets. */
export type PresetName = 'neon' | 'retro70s' | 'outline' | 'emboss' | 'glitch';

export interface Preset {
  name: PresetName;
  label: string;
  layers: Omit<ShadowLayer, 'id'>[];
}

const layer = (
  offsetX: number,
  offsetY: number,
  blur: number,
  color: string,
  opacity = 100
): Omit<ShadowLayer, 'id'> => ({ offsetX, offsetY, blur, color, opacity, enabled: true });

export const PRESETS: Preset[] = [
  {
    name: 'neon',
    label: 'Neon',
    layers: [
      layer(0, 0, 5, '#ff00de'),
      layer(0, 0, 10, '#ff00de'),
      layer(0, 0, 20, '#ff00de'),
      layer(0, 0, 40, '#ff00de'),
    ],
  },
  {
    name: 'retro70s',
    label: 'Retro 70s',
    layers: [
      layer(0, 2, 0, '#f97316'),
      layer(0, 4, 0, '#ea580c'),
      layer(0, 6, 0, '#dc2626'),
      layer(0, 8, 0, '#991b1b'),
    ],
  },
  {
    name: 'outline',
    label: 'Outline',
    layers: [
      layer(2, 0, 0, '#000000'),
      layer(-2, 0, 0, '#000000'),
      layer(0, 2, 0, '#000000'),
      layer(0, -2, 0, '#000000'),
    ],
  },
  {
    name: 'emboss',
    label: 'Emboss',
    layers: [
      layer(-1, -1, 1, '#ffffff', 80),
      layer(1, 1, 1, '#4b5563', 80),
      layer(2, 2, 2, '#1f2937', 60),
    ],
  },
  {
    name: 'glitch',
    label: 'Glitch',
    layers: [layer(-2, 0, 0, '#22d3ee'), layer(2, 0, 0, '#f43f5e'), layer(0, 1, 0, '#a3e635', 90)],
  },
];

let idCounter = 0;

/** Generate a fresh, collision-resistant layer id. */
export function newLayerId(): string {
  idCounter += 1;
  return `layer-${Date.now().toString(36)}-${idCounter}`;
}

/** Clamp a number to a range; falls back when not finite. */
export function clampNumber(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

/**
 * Convert any color-ish string plus opacity into a valid css rgba() value.
 * Accepts #rgb, #rgba, #rrggbb, #rrggbbaa, rgb()/rgba() strings and rgb triplets.
 * Anything unparseable becomes opaque black.
 */
export function colorToRgba(color: string, opacityPercent: number): string {
  const alpha = clampPercent(opacityPercent) / 100;
  if (typeof color !== 'string') return `rgba(0, 0, 0, ${alpha})`;
  const c = color.trim().toLowerCase();

  // rgb()/rgba() functional form
  const fnMatch = c.match(/^rgba?\(\s*(-?\d{1,3})\s*,\s*(-?\d{1,3})\s*,\s*(-?\d{1,3})/);
  if (fnMatch) {
    const [r, g, b] = fnMatch.slice(1).map((n) => clampNumber(Number(n), 0, 255, 0));
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  const hex = c.replace(/^#/, '');
  let r = 0;
  let g = 0;
  let b = 0;
  if (/^[0-9a-f]{3}$/.test(hex) || /^[0-9a-f]{4}$/.test(hex)) {
    r = parseInt(hex.charAt(0) + hex.charAt(0), 16);
    g = parseInt(hex.charAt(1) + hex.charAt(1), 16);
    b = parseInt(hex.charAt(2) + hex.charAt(2), 16);
  } else if (/^[0-9a-f]{6}$/.test(hex) || /^[0-9a-f]{8}$/.test(hex)) {
    r = parseInt(hex.slice(0, 2), 16);
    g = parseInt(hex.slice(2, 4), 16);
    b = parseInt(hex.slice(4, 6), 16);
  } else {
    // Also handle names like "red" minimally via a tiny table, else black
    const named: Record<string, [number, number, number]> = {
      black: [0, 0, 0],
      white: [255, 255, 255],
      red: [255, 0, 0],
      green: [0, 128, 0],
      blue: [0, 0, 255],
      gray: [128, 128, 128],
      grey: [128, 128, 128],
    };
    const hit = named[c];
    if (!hit) {
      return `rgba(0, 0, 0, ${alpha})`;
    }
    [r, g, b] = hit;
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Clamp an opacity percentage into 0–100. */
export function clampPercent(value: number): number {
  return clampNumber(value, 0, 100, 100);
}

/** CSS text-shadow declaration for the state, or a "none" fallback. */
export function cssDeclaration(state: ToolState, indent = '  '): string {
  const active = state.layers.filter((l) => l.enabled);
  if (active.length === 0) return 'text-shadow: none;';
  const parts = active.map(
    (l) =>
      `${l.offsetX}px ${l.offsetY}px ${Math.max(0, l.blur)}px ${colorToRgba(l.color, l.opacity)}`
  );
  if (parts.length === 1) return `text-shadow: ${parts[0]};`;
  return `text-shadow:\n${parts.map((p) => `${indent}${p}`).join(',\n')};`;
}
