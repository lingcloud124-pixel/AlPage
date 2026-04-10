import { mkdtempSync } from 'fs';
import * as fs from 'fs-extra';
import { tmpdir } from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { VariableMapper } from '../../src/core/VariableMapper.js';

describe('VariableMapper', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    vi.restoreAllMocks();
    for (const dir of tempDirs.splice(0)) {
      await fs.remove(dir);
    }
  });

  it('loads variable mapping without depending on process cwd', () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), 'variable-mapper-test-'));
    tempDirs.push(tempDir);
    vi.spyOn(process, 'cwd').mockReturnValue(tempDir);

    const mapper = new VariableMapper();

    expect(mapper.getEKPVersions()).toContain('v17');
  });
});
