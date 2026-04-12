import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('python script smoke', () => {
  test('export-pen-images.py prints usage instead of crashing when args are missing', () => {
    const scriptPath = path.join(projectRoot, 'scripts', 'export-pen-images.py');

    try {
      execFileSync('python3', [scriptPath], {
        cwd: projectRoot,
        encoding: 'utf8',
        stdio: 'pipe',
      });
    } catch (error: any) {
      const output = `${error.stdout ?? ''}${error.stderr ?? ''}`;
      expect(output).toContain('用法: python3');
      expect(output).not.toContain('NameError');
      return;
    }

    throw new Error('Expected script to exit with usage error');
  });
});
