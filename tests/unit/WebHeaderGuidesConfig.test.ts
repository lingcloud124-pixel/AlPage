import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

import { getHeaderGuides } from '../../web/src/agent/knowledge-base';

describe('web header guides config', () => {
  test('header guide metadata is sourced from shared config', () => {
    const projectRoot = process.cwd();
    const config = JSON.parse(
      fs.readFileSync(path.join(projectRoot, 'config', 'web-header-guides.json'), 'utf8'),
    );

    expect(getHeaderGuides()).toStrictEqual(config);
  });
});
