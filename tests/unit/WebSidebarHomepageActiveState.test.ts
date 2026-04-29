import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web sidebar homepage active state', () => {
  test('keeps the homepage-aligned new conversation record highlighted when there is no active conversation id', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/components/sidebar.ts'), 'utf8');

    expect(source).toContain("!activeConversationId && item.title === '新对话'");
  });
});
