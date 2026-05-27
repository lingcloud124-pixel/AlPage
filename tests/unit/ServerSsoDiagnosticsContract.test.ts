import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('server SSO diagnostics contract', () => {
  test('/api/auth/test-sso probes documented EKP token parsing call shapes', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'server/src/index.ts'), 'utf8');

    expect(source).toContain("label: 'GET_QUERY'");
    expect(source).toContain("label: 'POST_QUERY'");
    expect(source).toContain("label: 'POST_BODY'");
    expect(source).toContain('probeResults');
    expect(source).toContain('buildBody: (token: string) => `token=${encodeURIComponent(token)}`');
  });
});
