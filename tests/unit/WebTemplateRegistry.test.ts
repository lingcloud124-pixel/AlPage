import { describe, expect, test } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import { getTemplateConfig, getTemplateRegistry } from '../../web/src/theme/template-registry';
import { getWebHeaderSemantics } from '../../web/src/theme/header-semantics';

describe('web template registry', () => {
  const projectRoot = process.cwd();
  const config = JSON.parse(
    fs.readFileSync(path.join(projectRoot, 'config', 'web-template-registry.json'), 'utf8'),
  );

  test('contains core page templates and header templates with shared semantic names', () => {
    const registry = getTemplateRegistry();

    expect(registry.login).toMatchObject({
      id: 'login',
      name: '登录页',
      width: 1920,
      height: 1080,
    });

    expect(registry.desktop).toMatchObject({
      id: 'desktop',
      name: '主页',
      width: config.desktop.width,
      height: 1080,
    });

    expect(registry['header-default'].name).toBe(getWebHeaderSemantics()['header-default'].name);
    expect(registry['header-menu']).toMatchObject({
      id: 'header-menu',
      htmlPath: '/src/templates/header-menu.html',
      width: 1920,
      height: 130,
    });
  });

  test('getTemplateConfig returns undefined for unknown template ids', () => {
    expect(getTemplateConfig('unknown-template')).toBeUndefined();
  });

  test('template registry structure is sourced from shared config', () => {
    expect(Object.keys(getTemplateRegistry())).toEqual(Object.keys(config));
    expect(getTemplateConfig('desktop')?.htmlPath).toBe(config.desktop.htmlPath);
  });
});
