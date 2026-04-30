import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web auth contract', () => {
  test('auth.ts uses session-based auth with /api/auth/me check', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/auth.ts'), 'utf8');

    expect(source).toContain('/api/auth/me');
    expect(source).toContain('theme-studio-user');
    expect(source).toContain('getUser');
    expect(source).not.toContain('theme-studio-token');
  });

  test('ui-setup no longer imports legacy login export from auth module', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/ui-setup.ts'), 'utf8');

    expect(source).not.toContain('import { getUser, login } from');
    expect(source).not.toContain('await login(');
  });

  test('login page no longer imports legacy login flow', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/login.html'), 'utf8');

    expect(source).toContain('fetchUsers');
    expect(source).toContain('./src/auth.js');
    expect(source).not.toContain('/api/auth/login');
    expect(source).not.toContain('/api/auth/me');
    expect(source).not.toContain('theme-studio-token');
  });
});
