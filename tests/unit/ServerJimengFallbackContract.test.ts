import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('server jimeng fallback contract', () => {
  test('stops fallback when configured jimeng provider returns a business failure', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'server/src/routes/ai-proxy.ts'), 'utf8');

    expect(source).toContain("const shouldStopAfterJimengFailure = selectedProvider === 'jimeng';");
    expect(source).toContain('if (shouldStopAfterJimengFailure) {');
    expect(source).toContain('return res.status(result.statusCode).json(result.body);');
  });

  test('maps jimeng business failure codes to valid http status codes', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'server/src/routes/ai-proxy.ts'), 'utf8');

    expect(source).toContain('function normalizeJimengFailureStatusCode');
    expect(source).toContain('if ([1026, 50411, 50412, 50413].includes(businessCode)) return 422;');
    expect(source).not.toContain('statusCode: typeof submitParsed.status ===');
    expect(source).not.toContain('statusCode: typeof pollParsed.status ===');
  });
});
