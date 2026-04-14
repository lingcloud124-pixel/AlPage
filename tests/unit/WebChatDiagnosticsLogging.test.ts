import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web chat diagnostics logging', () => {
  test('avoids silent catches in chat diagnostics paths and keeps user-safe warning logs', () => {
    const chatManager = fs.readFileSync(path.join(projectRoot, 'web/src/chat-manager.ts'), 'utf8');
    const chatClient = fs.readFileSync(path.join(projectRoot, 'web/src/agent/chat-client.ts'), 'utf8');

    expect(chatManager).not.toContain('} catch {}');
    expect(chatClient).not.toContain('} catch {}');

    expect(chatManager).toContain('图片参考分析失败');
    expect(chatClient).toContain('流式响应存在未解析片段');
    expect(chatClient).toContain('Tool call JSON 解析失败');
  });
});
