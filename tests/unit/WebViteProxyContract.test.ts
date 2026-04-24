import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web vite proxy contract', () => {
  test('vite dev server routes all /api traffic to backend 3001 without legacy /api/export split', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/vite.config.ts'), 'utf8');

    expect(source).toContain("'/api': {");
    expect(source).toContain("target: 'http://localhost:3001'");
    expect(source).not.toContain("'/api/export': {");
    expect(source).not.toContain('127.0.0.1:5174');
  });
});
