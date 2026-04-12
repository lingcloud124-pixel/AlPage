import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('build verification rules json', () => {
  test('contains expected zip reference matrix and login image checks', () => {
    const config = JSON.parse(
      fs.readFileSync(path.join(projectRoot, 'config', 'build-verification-rules.json'), 'utf8'),
    );

    expect(config.expectedZips).toHaveLength(15);
    expect(config.expectedZips[0]).toEqual({
      prefix: '主题-MK-',
      reference: '主题-MK-2026清明主题.zip',
    });

    expect(config.loginImageChecks['登录-V17-']).toContain('login_thumb.jpg');
    expect(config.structureExtraAllowed['主题-V17-']).toContain('images/image-style/header-banner.png');
  });
});
