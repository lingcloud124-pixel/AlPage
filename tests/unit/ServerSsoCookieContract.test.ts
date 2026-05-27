import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('server SSO cookie contract', () => {
  test('SSO validation covers EKP cookies observed in production diagnostics', () => {
    const authSource = fs.readFileSync(path.join(projectRoot, 'server/src/middleware/auth.ts'), 'utf8');
    const ssoSource = fs.readFileSync(path.join(projectRoot, 'server/src/routes/sso.ts'), 'utf8');
    const indexSource = fs.readFileSync(path.join(projectRoot, 'server/src/index.ts'), 'utf8');

    for (const cookieName of ['LRToken', 'LtpaToken', 'LR_myekp', 'LRekp01Token']) {
      expect(authSource, `auth middleware missing ${cookieName}`).toContain(cookieName);
      expect(ssoSource, `SSO route missing ${cookieName}`).toContain(cookieName);
      expect(indexSource, `diagnostics missing ${cookieName}`).toContain(cookieName);
    }
  });

  test('/api/auth/sso/login tries every available SSO cookie before redirecting to EKP', () => {
    const ssoSource = fs.readFileSync(path.join(projectRoot, 'server/src/routes/sso.ts'), 'utf8');

    expect(ssoSource).toContain('for (const { name, value } of tokens)');
    expect(ssoSource).toContain('resolveLoginName(value)');
    expect(ssoSource).not.toContain('resolveLoginName(ssoCookie)');
  });
});
