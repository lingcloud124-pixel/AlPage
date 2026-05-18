import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('portal system prompt for AI-driven collection', () => {
  test('system prompt mentions update_portal_profile tool', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/agent/system-prompt.ts'), 'utf8');

    expect(source).toContain('update_portal_profile');
  });

  test('system prompt instructs AI to call update_portal_profile on every message', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/agent/system-prompt.ts'), 'utf8');

    expect(source).toContain('update_portal_profile');
    expect(source).toContain('每次收到用户消息');
  });
});
