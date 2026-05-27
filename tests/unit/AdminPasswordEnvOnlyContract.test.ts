import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

describe('admin password env-only contract', () => {
  test('admin auth reads ADMIN_PASSWORD directly from env without database override', () => {
    const source = readFileSync(join(process.cwd(), 'server/src/routes/admin-auth.ts'), 'utf8');

    expect(source).toContain('process.env.ADMIN_PASSWORD');
    expect(source).not.toContain('getStoredAdminPassword');
    expect(source).not.toContain('decryptIfNeeded');
  });

  test('server does not expose a self-service admin password update API', () => {
    const source = readFileSync(join(process.cwd(), 'server/src/index.ts'), 'utf8');

    expect(source).not.toContain('admin-password');
    expect(source).not.toContain('/api/admin-password');
  });

  test('admin UI does not expose self-service password change controls', () => {
    const html = readFileSync(join(process.cwd(), 'server/admin/index.html'), 'utf8');
    const script = readFileSync(join(process.cwd(), 'server/admin/admin.js'), 'utf8');

    expect(html).not.toContain('data-action="change-password"');
    expect(html).not.toContain('changePasswordModal');
    expect(script).not.toContain('/api/admin-password');
    expect(script).not.toContain('submitChangePassword');
    expect(script).not.toContain('showChangePassword');
  });
});
