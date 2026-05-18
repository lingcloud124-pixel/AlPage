import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('landing primary hint contract', () => {
  test('primary image flow supports primaryHint passed from chat-manager dataset', () => {
    const chatManager = fs.readFileSync(path.join(projectRoot, 'web/src/chat-manager.ts'), 'utf8');
    const primaryFlow = fs.readFileSync(path.join(projectRoot, 'web/src/primary-image-flow.ts'), 'utf8');

    expect(chatManager).toContain('primaryHint: lockedPrimaryHint,');
    expect(primaryFlow).toContain('primaryHint: preferredHueHint,');
  });
});
