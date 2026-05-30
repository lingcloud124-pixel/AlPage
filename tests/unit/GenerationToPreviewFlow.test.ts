import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { readAllCSS } from '../helpers/read-css';

const projectRoot = process.cwd();

describe('generation-to-preview flow', () => {
  test('generate_theme_pipeline handler expands preview after success', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/chat-manager.ts'), 'utf8');
    const idx = source.indexOf("} else if (tc.tool === 'generate_theme_pipeline')");
    expect(idx).toBeGreaterThan(0);
    const handlerBlock = source.substring(idx, idx + 2000);

    expect(handlerBlock).toContain('deps.expandPreview()');
  });

  test('result actions have highlight animation in CSS', () => {
    const css = readAllCSS();

    expect(css).toContain('workspace-result-actions');
    expect(css).toContain('result-actions-highlight');
  });
});
