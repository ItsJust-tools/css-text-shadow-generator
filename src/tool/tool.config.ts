import type { ExportFormat } from '@itsjust/core';

export const toolConfig = {
  id: 'css-text-shadow-generator',
  name: 'CSS Text Shadow Generator',
  description:
    'Visual editor for CSS text-shadow with live preview, stacking multiple shadow layers, and copyable CSS output.',
  version: '1.0.0',
  exportFormats: ['png', 'jpeg', 'webp', 'pdf', 'json'] satisfies ExportFormat[],
  features: {
    export: true,
    autoSave: true,
    undoRedo: true,
    sidebar: true,
    statusBar: true,
    darkMode: true,
  },
  theme: {
    accent: '#a855f7',
    accentHover: '#9333ea',
    accentSubtle: 'rgba(168, 85, 247, 0.15)',
    brand: 'CSS Text Shadow Generator',
    icon: '🌗',
  },
};

export default toolConfig;
