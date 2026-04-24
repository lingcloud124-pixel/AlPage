import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('image provider contract', () => {
  test('ai-proxy contains provider-aware image request shaping for ark and minimax', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'server/src/routes/ai-proxy.ts'), 'utf8');

    expect(source).toContain('function detectImageProvider');
    expect(source).toContain("volces.com");
    expect(source).toContain("'ark'");
    expect(source).toContain("'minimax'");
    expect(source).toContain('function buildImageRequestBody');
    expect(source).toContain('response_format:');
    expect(source).toContain('size:');
  });

  test('frontend image requests no longer hardcode minimax model name in request body', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/agent/chat-client.ts'), 'utf8');

    expect(source).toContain('const imageSettings = getImageSettings();');
    expect(source).toContain('model: imageSettings.model');
    expect(source).toContain("response_format: 'url'");
  });
});
