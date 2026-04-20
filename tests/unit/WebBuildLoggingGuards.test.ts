import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web build logging guards', () => {
  test('avoids silent catches in the build script so local failures remain diagnosable', () => {
    const buildScript = fs.readFileSync(path.join(projectRoot, 'web/scripts/build.ts'), 'utf8');

    expect(buildScript).not.toContain('} catch {}');
    expect(buildScript).toContain('无法自动打开输出目录，请手动查看');
  });
});
