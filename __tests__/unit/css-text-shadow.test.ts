import { describe, it, expect } from 'vitest';
import {
  DEFAULT_LAYER,
  DEFAULT_STATE,
  PRESETS,
  clampNumber,
  clampPercent,
  colorToRgba,
  cssDeclaration,
  newLayerId,
  type ShadowLayer,
  type ToolState,
} from '@/tool/types';
import {
  serializeState,
  deserializeState,
  roundTrips,
  cssTextShadowGeneratorTool,
} from '@/tool/tool-definition';
import {
  addLayer,
  applyPreset,
  duplicateLayer,
  moveLayer,
  removeLayer,
  toggleLayer,
  updateLayer,
  updatePreview,
} from '@/tool/layers';
import { summaryText, isState } from '@/tool/ui-shared';

const layer = (patch: Partial<ShadowLayer> = {}): ShadowLayer => ({
  ...DEFAULT_LAYER,
  id: 'layer-test',
  ...patch,
});

const state = (layers: ShadowLayer[], previewPatch = {}): ToolState => ({
  layers,
  preview: { ...DEFAULT_STATE.preview, ...previewPatch },
});

describe('serialization round-trip', () => {
  it('round-trips the default state without data loss', () => {
    expect(roundTrips(DEFAULT_STATE)).toBe(true);
  });

  it('round-trips multi-layer states with all fields intact', () => {
    const s = state(
      [
        layer({
          id: 'a',
          offsetX: -10,
          offsetY: 12,
          blur: 33,
          color: '#ff00de',
          opacity: 42,
          enabled: false,
        }),
        layer({
          id: 'b',
          offsetX: 3,
          offsetY: -4,
          blur: 0,
          color: 'rgba(10, 20, 30, 0.5)',
          opacity: 100,
        }),
      ],
      { sampleText: 'Hello 世界', fontSize: 72, background: 'light' }
    );
    const serialized = serializeState(s);
    const parsed = JSON.parse(serialized);
    const result = deserializeState(parsed);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(s);
    }
    expect(roundTrips(s)).toBe(true);
  });

  it('tool interface serialize/deserialize matches standalone functions', () => {
    const s = state([layer({ color: '#123456' })]);
    expect(JSON.parse(cssTextShadowGeneratorTool.serialize(s))).toEqual(
      JSON.parse(serializeState(s))
    );
  });

  it('rejects non-object payloads with an error', () => {
    expect(deserializeState(null).success).toBe(false);
    expect(deserializeState([1, 2]).success).toBe(false);
    expect(deserializeState('nope').success).toBe(false);
    expect(deserializeState(undefined).success).toBe(false);
  });

  it('recovers from corrupted layers array with defaults', () => {
    const result = deserializeState({ layers: ['garbage', 42, null], preview: 'oops' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.layers).toHaveLength(3);
      expect(result.data.layers[0]?.color).toBe(DEFAULT_LAYER.color);
      expect(result.data.preview.background).toBe('dark');
    }
  });

  it('clamps out-of-range values during deserialization', () => {
    const result = deserializeState({
      layers: [
        {
          offsetX: 9999,
          offsetY: -9999,
          blur: -5,
          opacity: 250,
          color: 'not a color!!!',
          enabled: true,
        },
      ],
      preview: { fontSize: 9999, sampleText: 'x'.repeat(500), background: 'banana' },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      const l = result.data.layers[0];
      if (!l) throw new Error('missing layer');
      expect(l.offsetX).toBe(100);
      expect(l.offsetY).toBe(-100);
      expect(l.blur).toBe(0);
      expect(l.opacity).toBe(100);
      expect(l.color).toBe(DEFAULT_LAYER.color);
      expect(result.data.preview.fontSize).toBe(200);
      expect(result.data.preview.sampleText.length).toBe(200);
      expect(result.data.preview.background).toBe('dark');
    }
  });

  it('caps layers at 50 on deserialize', () => {
    const many = Array.from({ length: 80 }, (_, i) => layer({ id: `l${i}` }));
    const result = deserializeState({ layers: many, preview: DEFAULT_STATE.preview });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.layers).toHaveLength(50);
  });

  it('empty layers array deserializes to empty (not default)', () => {
    const result = deserializeState({ layers: [], preview: DEFAULT_STATE.preview });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.layers).toEqual([]);
  });
});

describe('css output from layer operations', () => {
  it('adding a layer appends it to the css declaration', () => {
    const s1 = state([layer({ offsetX: 1, offsetY: 2, blur: 3, color: '#ff0000', opacity: 100 })]);
    const s2 = addLayer(s1);
    expect(s2.layers).toHaveLength(2);
    expect(s2.layers[1]?.id).not.toBe(s1.layers[0]?.id);
    const css = cssDeclaration(s2.layers.length === 2 ? s2 : s1);
    expect(css).toContain('1px 2px 3px');
    expect(css.match(/rgba\(/g)).toHaveLength(2);
  });

  it('duplicating a layer doubles its shadow', () => {
    const s1 = state([
      layer({ offsetX: 5, offsetY: 6, blur: 7, color: '#00ff00', opacity: 50, id: 'dup' }),
    ]);
    const s2 = duplicateLayer(s1, 'dup');
    expect(s2.layers).toHaveLength(2);
    expect(s2.layers[1]?.offsetX).toBe(5);
    expect(s2.layers[1]?.id).not.toBe('dup');
    const css = cssDeclaration(s2);
    expect(css.match(/5px 6px 7px/g)).toHaveLength(2);
  });

  it('reordering layers changes the css order', () => {
    const s = state([
      layer({ id: 'one', offsetX: 1, color: '#111111', opacity: 100 }),
      layer({ id: 'two', offsetX: 2, color: '#222222', opacity: 100 }),
    ]);
    const moved = moveLayer(s, 'two', -1);
    expect(moved.layers[0]?.id).toBe('two');
    const css = cssDeclaration(moved);
    const twoPos = css.indexOf('rgba(34, 34, 34');
    const onePos = css.indexOf('rgba(17, 17, 17');
    expect(twoPos).toBeLessThan(onePos);
    // moving out of range is a no-op
    expect(moveLayer(s, 'one', -1)).toEqual(s);
    expect(moveLayer(s, 'two', 5)).toEqual(s);
    expect(moveLayer(s, 'missing', 1)).toEqual(s);
  });

  it('removing a layer drops its shadow from the css', () => {
    const s = state([
      layer({ id: 'keep', offsetX: 1, color: '#111111', opacity: 100 }),
      layer({ id: 'drop', offsetX: 9, color: '#ff0000', opacity: 100 }),
    ]);
    const s2 = removeLayer(s, 'drop');
    expect(s2.layers).toHaveLength(1);
    const css = cssDeclaration(s2);
    expect(css).not.toContain('rgba(255, 0, 0');
    expect(css).toContain('rgba(17, 17, 17');
  });

  it('updating a layer mutates only the css for that layer', () => {
    const s = state([
      layer({ id: 'u', offsetX: 0, offsetY: 0, blur: 0, color: '#000000', opacity: 100 }),
    ]);
    const s2 = updateLayer(s, 'u', { offsetX: 4, blur: 8 });
    const css = cssDeclaration(s2);
    expect(css).toContain('4px 0px 8px');
    // clamp works
    const s3 = updateLayer(s, 'u', { offsetX: 5000, blur: -20, opacity: 300 });
    const l = s3.layers[0];
    if (!l) throw new Error('missing layer');
    expect(l.offsetX).toBe(100);
    expect(l.blur).toBe(0);
    expect(l.opacity).toBe(100);
  });

  it('disabling a layer via toggle removes it from css until re-enabled', () => {
    const s = state([
      layer({ id: 't', offsetX: 2, offsetY: 2, blur: 0, color: '#000000', opacity: 100 }),
    ]);
    const off = toggleLayer(s, 't');
    expect(cssDeclaration(off)).toBe('text-shadow: none;');
    const on = toggleLayer(off, 't');
    expect(cssDeclaration(on)).toContain('2px 2px 0px');
  });

  it('removing the last layer yields text-shadow: none', () => {
    const s = removeLayer(state([layer({ id: 'solo' })]), 'solo');
    expect(s.layers).toEqual([]);
    expect(cssDeclaration(s)).toBe('text-shadow: none;');
  });

  it('all layers disabled yields text-shadow: none', () => {
    const s = state([layer({ id: 'a', enabled: false }), layer({ id: 'b', enabled: false })]);
    expect(cssDeclaration(s)).toBe('text-shadow: none;');
  });
});

describe('color conversion', () => {
  it('converts 6-digit hex to rgba with the given opacity', () => {
    expect(colorToRgba('#ff00de', 100)).toBe('rgba(255, 0, 222, 1)');
    expect(colorToRgba('#ff00de', 0)).toBe('rgba(255, 0, 222, 0)');
    expect(colorToRgba('#ff00de', 55)).toBe('rgba(255, 0, 222, 0.55)');
  });

  it('converts 3-digit and 4-digit hex', () => {
    expect(colorToRgba('#f0a', 100)).toBe('rgba(255, 0, 170, 1)');
    expect(colorToRgba('#f0ab', 100)).toBe('rgba(255, 0, 170, 1)');
  });

  it('converts 8-digit hex ignoring its alpha channel', () => {
    expect(colorToRgba('#ff00de80', 100)).toBe('rgba(255, 0, 222, 1)');
  });

  it('converts rgb()/rgba() strings and drops embedded alpha', () => {
    expect(colorToRgba('rgb(12, 34, 56)', 100)).toBe('rgba(12, 34, 56, 1)');
    expect(colorToRgba('rgba(12, 34, 56, 0.9)', 50)).toBe('rgba(12, 34, 56, 0.5)');
  });

  it('invalid hex colors produce valid rgba (opaque black)', () => {
    expect(colorToRgba('#zzz', 100)).toBe('rgba(0, 0, 0, 1)');
    expect(colorToRgba('not-a-color', 80)).toBe('rgba(0, 0, 0, 0.8)');
    expect(colorToRgba('#12345', 100)).toBe('rgba(0, 0, 0, 1)');
    expect(colorToRgba('', 100)).toBe('rgba(0, 0, 0, 1)');
    expect(colorToRgba(undefined as unknown as string, 100)).toBe('rgba(0, 0, 0, 1)');
  });

  it('clamps rgb channels to 0-255', () => {
    expect(colorToRgba('rgb(300, -5, 20)', 100)).toBe('rgba(255, 0, 20, 1)');
  });

  it('supports a few named colors', () => {
    expect(colorToRgba('white', 50)).toBe('rgba(255, 255, 255, 0.5)');
    expect(colorToRgba('red', 100)).toBe('rgba(255, 0, 0, 1)');
  });
});

describe('presets', () => {
  it('every preset produces a non-none css declaration with fresh ids', () => {
    for (const preset of PRESETS) {
      const s = applyPreset(DEFAULT_STATE, preset.name);
      expect(s.layers.length).toBe(preset.layers.length);
      expect(new Set(s.layers.map((l) => l.id)).size).toBe(s.layers.length);
      expect(cssDeclaration(s)).not.toBe('text-shadow: none;');
    }
  });

  it('neon preset stacks multiple glow layers', () => {
    const s = applyPreset(DEFAULT_STATE, 'neon');
    expect(s.layers.length).toBeGreaterThanOrEqual(3);
  });

  it('unknown preset falls back to a single default layer', () => {
    const s = applyPreset(DEFAULT_STATE, 'nope' as never);
    expect(s.layers).toHaveLength(1);
    expect(s.layers[0]).toEqual({ ...DEFAULT_LAYER, id: s.layers[0]?.id });
  });
});

describe('preview updates', () => {
  it('updates sample text, font size and background', () => {
    let s = updatePreview(DEFAULT_STATE, { sampleText: 'Yo', fontSize: 120, background: 'light' });
    expect(s.preview).toEqual({ sampleText: 'Yo', fontSize: 120, background: 'light' });
    s = updatePreview(s, { fontSize: 5, background: 'weird' as never });
    expect(s.preview.fontSize).toBe(10);
    expect(s.preview.background).toBe('dark');
  });
});

describe('misc helpers', () => {
  it('newLayerId is unique across calls', () => {
    const ids = new Set([newLayerId(), newLayerId(), newLayerId()]);
    expect(ids.size).toBe(3);
  });

  it('clampNumber handles NaN with fallback', () => {
    expect(clampNumber(Number.NaN, 0, 10, 4)).toBe(4);
    expect(clampNumber(5, 0, 10, 0)).toBe(5);
  });

  it('clampPercent clamps into 0-100', () => {
    expect(clampPercent(-1)).toBe(0);
    expect(clampPercent(101)).toBe(100);
    expect(clampPercent(Number.NaN)).toBe(100);
  });

  it('summaryText counts active layers', () => {
    expect(summaryText(state([layer(), layer({ enabled: false })]))).toBe('1 shadow layer');
    expect(summaryText(state([]))).toBe('text-shadow: none');
  });

  it('isState recognizes valid shapes', () => {
    expect(isState(DEFAULT_STATE)).toBe(true);
    expect(isState({ layers: [] })).toBe(false);
    expect(isState(null)).toBe(false);
  });

  it('multi-layer css declaration is copyable single declaration text', () => {
    const css = cssDeclaration(
      state([
        layer({ offsetX: 1, offsetY: 1, blur: 2, color: '#000000', opacity: 100 }),
        layer({ offsetX: 3, offsetY: 3, blur: 4, color: '#ffffff', opacity: 100 }),
      ])
    );
    expect(css.startsWith('text-shadow:')).toBe(true);
    expect(css.endsWith(';')).toBe(true);
    expect(css).toContain(',\n');
  });
});
