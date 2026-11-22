'use client';

import React from 'react';
import { cssDeclaration, type ToolState, type ShadowLayer, PRESETS } from '../types';
import {
  addLayer,
  duplicateLayer,
  moveLayer,
  removeLayer,
  toggleLayer,
  updateLayer,
  updatePreview,
  applyPreset,
} from '../layers';

interface CanvasProps {
  state: ToolState;
  onChange?: (state: ToolState) => void;
  onSaveHistory?: (text: string) => void;
}

const fieldClass =
  'mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100';

function CopyButton({ value, testid }: { value: string; testid?: string }) {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable; ignore
    }
  }, [value]);
  return (
    <button
      type="button"
      onClick={handleCopy}
      data-testid={testid}
      className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
      aria-label="Copy value"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

interface NumFieldProps {
  label: string;
  value: number;
  onChangeState: (next: number) => void;
  testid: string;
  min?: number;
  max?: number;
}

function NumField({ label, value, onChangeState, testid, min, max }: NumFieldProps) {
  return (
    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
      {label}
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChangeState(Number(e.target.value))}
        data-testid={testid}
        className={fieldClass}
      />
    </label>
  );
}

const LayerEditor: React.FC<{
  layer: ShadowLayer;
  index: number;
  total: number;
  onPatch: (patch: Partial<ShadowLayer>) => void;
  onToggle: () => void;
  onMove: (delta: number) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}> = ({ layer, index, total, onPatch, onToggle, onMove, onDuplicate, onRemove }) => (
  <div
    className="rounded-lg border border-gray-200 p-3 dark:border-gray-800"
    data-testid={`layer-card-${index}`}
  >
    <div className="mb-2 flex items-center justify-between gap-2">
      <label className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300">
        <input
          type="checkbox"
          checked={layer.enabled}
          onChange={onToggle}
          data-testid={`layer-enabled-${index}`}
        />
        Layer {index + 1}
      </label>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => onMove(-1)}
          disabled={index === 0}
          data-testid={`layer-up-${index}`}
          aria-label="Move layer up"
          className="rounded border border-gray-300 px-2 py-0.5 text-xs disabled:opacity-40 dark:border-gray-700"
        >
          ↑
        </button>
        <button
          type="button"
          onClick={() => onMove(1)}
          disabled={index === total - 1}
          data-testid={`layer-down-${index}`}
          aria-label="Move layer down"
          className="rounded border border-gray-300 px-2 py-0.5 text-xs disabled:opacity-40 dark:border-gray-700"
        >
          ↓
        </button>
        <button
          type="button"
          onClick={onDuplicate}
          data-testid={`layer-duplicate-${index}`}
          aria-label="Duplicate layer"
          className="rounded border border-gray-300 px-2 py-0.5 text-xs dark:border-gray-700"
        >
          Duplicate
        </button>
        <button
          type="button"
          onClick={onRemove}
          data-testid={`layer-remove-${index}`}
          aria-label="Remove layer"
          className="rounded border border-gray-300 px-2 py-0.5 text-xs hover:bg-red-50 dark:border-gray-700 dark:hover:bg-red-900/30"
        >
          ✕
        </button>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      <NumField
        label="Offset X"
        value={layer.offsetX}
        onChangeState={(v) => onPatch({ offsetX: v })}
        testid={`layer-offset-x-${index}`}
      />
      <NumField
        label="Offset Y"
        value={layer.offsetY}
        onChangeState={(v) => onPatch({ offsetY: v })}
        testid={`layer-offset-y-${index}`}
      />
      <NumField
        label="Blur"
        value={layer.blur}
        min={0}
        onChangeState={(v) => onPatch({ blur: v })}
        testid={`layer-blur-${index}`}
      />
      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
        Color
        <input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(layer.color) ? layer.color : '#000000'}
          onChange={(e) => onPatch({ color: e.target.value })}
          data-testid={`layer-color-${index}`}
          className="mt-1 h-[38px] w-full rounded-md border border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-800"
        />
      </label>
      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
        Hex / rgba
        <input
          type="text"
          value={layer.color}
          onChange={(e) => onPatch({ color: e.target.value })}
          placeholder="#ff00de or rgba(...)"
          data-testid={`layer-hex-${index}`}
          className={fieldClass}
        />
      </label>
    </div>
    <div className="mt-2">
      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
        Opacity: {layer.opacity}%
        <input
          type="range"
          min={0}
          max={100}
          value={layer.opacity}
          onChange={(e) => onPatch({ opacity: Number(e.target.value) })}
          data-testid={`layer-opacity-${index}`}
          className="w-full"
        />
      </label>
    </div>
  </div>
);

export const Canvas: React.FC<CanvasProps> = ({ state, onChange, onSaveHistory }) => {
  const update = (next: ToolState) => onChange?.(next);
  const css = cssDeclaration(state);
  const preview = state.preview;
  const shadowValue =
    state.layers
      .filter((l) => l.enabled)
      .map((l) => `${l.offsetX}px ${l.offsetY}px ${Math.max(0, l.blur)}px ${l.color}`)
      .join(', ') || 'none';

  return (
    <div className="h-full space-y-6 overflow-y-auto p-4" data-testid="shadow-canvas">
      {/* Live preview */}
      <div
        className={
          preview.background === 'dark'
            ? 'rounded-lg border border-gray-800 bg-gray-950 p-8 text-center'
            : 'rounded-lg border border-gray-200 bg-white p-8 text-center'
        }
        data-testid="preview-panel"
        data-background={preview.background}
      >
        <span
          className="block font-bold leading-tight"
          style={{
            fontSize: `${preview.fontSize}px`,
            color: preview.background === 'dark' ? '#f9fafb' : '#111827',
            textShadow: shadowValue === 'none' ? 'none' : shadowValue,
          }}
          data-testid="preview-text"
        >
          {preview.sampleText || 'Preview'}
        </span>
      </div>

      {/* Preview settings */}
      <div className="grid gap-4 sm:grid-cols-3" data-testid="preview-settings">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
          Sample text
          <input
            type="text"
            value={preview.sampleText}
            onChange={(e) => update(updatePreview(state, { sampleText: e.target.value }))}
            data-testid="preview-sample-text"
            className={fieldClass}
          />
        </label>
        <NumField
          label="Font size (px)"
          value={preview.fontSize}
          min={10}
          max={200}
          onChangeState={(v) => update(updatePreview(state, { fontSize: v }))}
          testid="preview-font-size"
        />
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
          Preview background
          <select
            value={preview.background}
            onChange={(e) =>
              update(updatePreview(state, { background: e.target.value as 'light' | 'dark' }))
            }
            data-testid="preview-background"
            className={fieldClass}
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </label>
      </div>

      {/* Presets */}
      <div>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Presets
        </h3>
        <div className="flex flex-wrap gap-2" data-testid="preset-list">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => update(applyPreset(state, preset.name))}
              data-testid={`preset-${preset.name}`}
              className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Layers */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Shadow layers ({state.layers.length})
          </h3>
          <button
            type="button"
            onClick={() => update(addLayer(state))}
            data-testid="btn-add-layer"
            className="rounded-md bg-violet-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-600"
          >
            + Add layer
          </button>
        </div>
        {state.layers.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400" data-testid="layers-empty">
            No layers — the generated CSS uses <code>text-shadow: none</code>. Add a layer to begin.
          </p>
        ) : (
          <div className="space-y-3" data-testid="layer-list">
            {state.layers.map((layer, i) => (
              <LayerEditor
                key={layer.id}
                layer={layer}
                index={i}
                total={state.layers.length}
                onPatch={(patch) => update(updateLayer(state, layer.id, patch))}
                onToggle={() => update(toggleLayer(state, layer.id))}
                onMove={(delta) => update(moveLayer(state, layer.id, delta))}
                onDuplicate={() => update(duplicateLayer(state, layer.id))}
                onRemove={() => update(removeLayer(state, layer.id))}
              />
            ))}
          </div>
        )}
      </div>

      {/* CSS output */}
      <div
        className="rounded-lg bg-gray-950 p-4 text-gray-100 dark:bg-black"
        data-testid="css-output"
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs uppercase tracking-widest text-gray-400">CSS</span>
          <CopyButton value={css} testid="copy-css" />
        </div>
        <pre className="overflow-x-auto font-mono text-sm" data-testid="css-code">
          <code>{css}</code>
        </pre>
      </div>

      {onSaveHistory ? (
        <button
          type="button"
          data-testid="btn-save-history"
          onClick={() => onSaveHistory(css)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Save CSS to history
        </button>
      ) : null}

      <p className="text-center text-xs text-gray-500 dark:text-gray-400">
        Everything runs locally in your browser; nothing is uploaded.
      </p>
    </div>
  );
};
