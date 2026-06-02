import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web landing workspace entry', () => {
  test('landing state collapses preview panel until a portal is generated', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/main.ts'), 'utf8');

    expect(source).toContain('export function showWorkspaceLandingState(): void {');
    const fnStart = source.indexOf('export function showWorkspaceLandingState(): void {');
    const fnBody = source.slice(fnStart, source.indexOf('\n}', fnStart) + 2);

    expect(fnBody).toContain('collapsePreview();');
  });
});
