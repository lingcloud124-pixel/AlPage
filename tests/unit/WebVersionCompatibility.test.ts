import { describe, expect, test } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import { getVersionCompatibility } from '../../web/src/agent/knowledge-base';

describe('web version compatibility', () => {
  const projectRoot = process.cwd();

  test('reads version compatibility rules from shared config', () => {
    const versions = getVersionCompatibility();
    const config = JSON.parse(
      fs.readFileSync(path.join(projectRoot, 'config', 'web-version-compatibility.json'), 'utf8'),
    );

    expect(versions).toStrictEqual(config);
  });
});
