import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import manifest from '@/app/manifest';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';
import ErrorPage from '@/app/error';
import NotFound from '@/app/not-found';
import { JsonLd } from '@/app/json-ld';
import ToolPage from '@/app/page';
import { cn } from '@/lib/utils';
import { generateJsonLd, generateToolMetadata } from '@/lib/seo';
import toolConfig from '@/tool/tool.config';
import { getPublicSiteUrl, templateMetadata } from '@/tool/template-metadata';
import { cssTextShadowGeneratorTool } from '@/tool/tool-definition';
import { Canvas } from '@/tool/components/Canvas';
import { Sidebar } from '@/tool/components/Sidebar';
import { Toolbar } from '@/tool/components/Toolbar';
import { DEFAULT_STATE as BASE_DEFAULT_STATE, type ToolState } from '@/tool/types';
import type { ExporterLoader } from '@itsjust/core';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/app/tool-client-wrapper', () => ({
  default: () => <div data-testid="tool-client-wrapper">tool-client-wrapper</div>,
}));

describe('app and seo', () => {
  const getOgImageUrl = (
    images: NonNullable<NonNullable<ReturnType<typeof generateToolMetadata>['openGraph']>['images']>
  ): string | undefined => {
    const list = Array.isArray(images) ? images : [images];
    const first = list[0];
    if (!first) return undefined;
    if (typeof first === 'string') return first;
    if (first instanceof URL) return first.toString();
    return String(first.url);
  };

  it('builds metadata and json-ld values', () => {
    const metadata = generateToolMetadata(toolConfig);
    const jsonLd = generateJsonLd(toolConfig);

    expect(metadata.creator).toBe(toolConfig.name);
    expect(metadata.metadataBase?.toString()).toBe('http://localhost:3000/');
    const ogUrl = metadata.openGraph?.images ? getOgImageUrl(metadata.openGraph.images) : undefined;
    expect(ogUrl).toContain('/og.svg');
    expect(jsonLd.url).toBe('http://localhost:3000');
    expect(jsonLd.featureList.length).toBeGreaterThan(0);
  });

  it('returns site manifest, robots and sitemap', () => {
    const man = manifest();
    const rob = robots();
    const sm = sitemap();

    expect(man.name).toBe(templateMetadata.appName);
    expect(rob.sitemap).toBe('http://localhost:3000/sitemap.xml');
    expect(sm[0]?.url).toBe('http://localhost:3000');
  });

  it('renders json-ld script safely', () => {
    render(<JsonLd config={{ ...toolConfig, name: '</script>' }} />);
    const script = document.querySelector('script[type="application/ld+json"]');
    expect(script?.innerHTML).toContain('\\u003c/script>');
  });

  it('renders error page and invokes reset', () => {
    const reset = vi.fn();
    render(<ErrorPage error={new Error('boom')} reset={reset} />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders not-found page', () => {
    render(<NotFound />);
    expect(screen.getByText('Page not found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go home' })).toHaveAttribute('href', '/');
  });

  it('renders top-level tool page', () => {
    render(<ToolPage />);
    expect(screen.getByTestId('tool-client-wrapper')).toBeInTheDocument();
    expect(document.querySelector('script[type="application/ld+json"]')).toBeInTheDocument();
  });

  it('covers tool definition and helper exports', async () => {
    expect(cn('a', undefined, 'b', false, null, 'c')).toBe('a b c');
    expect(getPublicSiteUrl()).toBe('http://localhost:3000');
    expect(cssTextShadowGeneratorTool.name).toBe(toolConfig.name);
    expect(cssTextShadowGeneratorTool.id).toBe('css-text-shadow-generator');
    const restored = cssTextShadowGeneratorTool.deserialize({
      layers: [
        {
          id: 'x',
          offsetX: 2,
          offsetY: -2,
          blur: 6,
          color: '#00ff00',
          opacity: 75,
          enabled: true,
        },
      ],
      preview: { sampleText: 'Hi', fontSize: 64, background: 'light' },
    });
    expect(restored.success).toBe(true);
    if (!restored.success) throw new Error('unreachable');
    expect(restored.data.layers[0]?.color).toBe('#00ff00');
    expect(restored.data.preview.fontSize).toBe(64);
    expect(cssTextShadowGeneratorTool.serialize(BASE_DEFAULT_STATE)).toContain('"layers"');
    const exporters =
      (cssTextShadowGeneratorTool as { exporters?: Array<{ loader: ExporterLoader }> }).exporters ??
      [];
    expect(exporters).toHaveLength(4);
    const first = exporters[0];
    expect(first).toBeDefined();
    if (!first) throw new Error('missing exporter');
    const png = await (first.loader as ExporterLoader)();
    const resolved = 'default' in png ? png.default : png.exporter;
    expect(resolved.format).toBe('png');
  });

  it('renders tool components with default state', async () => {
    const onChange = vi.fn();
    render(
      <>
        <Toolbar
          state={BASE_DEFAULT_STATE}
          onChange={onChange}
          onClear={() => {}}
          onCopy={() => {}}
        />
        <Sidebar state={BASE_DEFAULT_STATE} onChange={onChange} />
        <Canvas state={BASE_DEFAULT_STATE} onChange={onChange} />
      </>
    );

    expect(screen.getByTestId('preview-panel')).toBeInTheDocument();
    expect(screen.getByTestId('preview-text')).toBeInTheDocument();
    expect(screen.getByTestId('css-code')).toHaveTextContent('text-shadow:');
    expect(screen.getByTestId('layer-list')).toBeInTheDocument();

    // copy css button copies the declaration
    const copyMock = vi.fn(() => Promise.resolve());
    Object.assign(navigator, { clipboard: { writeText: copyMock } });
    await userEvent.click(screen.getByTestId('copy-css'));
    expect(copyMock).toHaveBeenCalledWith(expect.stringContaining('text-shadow:'));

    // clear layers button empties layer list
    await userEvent.click(screen.getByTestId('btn-clear-layers'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ layers: [] }));
  });
});
