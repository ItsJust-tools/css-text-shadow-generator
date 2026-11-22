'use client';

import React from 'react';
import { PRESETS, type ToolState } from '../types';
import { applyPreset } from '../layers';
import { cssDeclaration } from '../types';

interface SidebarProps {
  state: ToolState;
  onChange: (next: ToolState) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ state, onChange }) => {
  const active = state.layers.filter((l) => l.enabled).length;
  return (
    <div className="h-full space-y-6 overflow-y-auto p-4 text-sm" data-testid="shadow-sidebar">
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Current output</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300" data-testid="sidebar-layer-count">
          {active} active layer{active === 1 ? '' : 's'} of {state.layers.length}
        </p>
        <p
          className="mt-1 font-mono text-[10px] text-gray-500 dark:text-gray-400"
          data-testid="sidebar-preview-css"
        >
          {cssDeclaration(state)}
        </p>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Presets</h3>
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          {PRESETS.map((preset) => (
            <li key={preset.name} className="flex justify-between gap-2">
              <span>{preset.label}</span>
              <button
                type="button"
                data-testid={`sidebar-apply-${preset.name}`}
                onClick={() => onChange(applyPreset(state, preset.name))}
                className="text-violet-600 hover:underline dark:text-violet-400"
              >
                Apply
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Saved CSS</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300" data-testid="sidebar-history-count">
          Font size {state.preview.fontSize}px · {state.preview.background} preview
        </p>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Share</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300">
          Use the toolbar share button to create a URL containing the current layers; open it to
          restore this configuration.
        </p>
      </div>
    </div>
  );
};
