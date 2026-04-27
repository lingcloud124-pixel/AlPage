import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('server model config masked key handling', () => {
  test('treats masked admin placeholders as unchanged secrets instead of saving them back to the database', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'server/src/routes/model-config.ts'), 'utf8');

    expect(source).toContain('function isMaskedApiKeyCandidate');
    expect(source).toContain("return /^\\*{4,}/.test(trimmed);");
    expect(source).toContain("const normalizedStoredChatApiKey = isMaskedApiKeyCandidate(storedChatApiKey) ? '' : storedChatApiKey;");
    expect(source).toContain("const normalizedStoredImageApiKey = isMaskedApiKeyCandidate(storedImageApiKey) ? '' : storedImageApiKey;");
    expect(source).toContain("const normalizedExistingConfig = normalizeModelConfig(existing);");
    expect(source).toContain("? normalizedExistingConfig.chatApiKey");
    expect(source).toContain("? normalizedExistingConfig.imageApiKey");
  });
});
