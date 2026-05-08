import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web credits auto refresh contract', () => {
  test('credits module refreshes backend config when page becomes active again', () => {
    const creditsSource = fs.readFileSync(path.join(projectRoot, 'web/src/credits.ts'), 'utf8');
    const mainSource = fs.readFileSync(path.join(projectRoot, 'web/src/main.ts'), 'utf8');

    expect(creditsSource).toContain('export function startCreditsAutoRefresh(intervalMs = 30_000): void');
    expect(creditsSource).toContain("document.addEventListener('visibilitychange'");
    expect(creditsSource).toContain("if (document.visibilityState === 'visible') {");
    expect(creditsSource).toContain("window.addEventListener('focus'");
    expect(creditsSource).toContain('window.setInterval(() => {');
    expect(creditsSource).toContain('fetchCredits()');
    expect(mainSource).toContain('startCreditsAutoRefresh();');
  });
});
