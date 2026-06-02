import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { readAllCSS } from '../helpers/read-css';

const projectRoot = process.cwd();

describe('web ui card surfaces', () => {
  test('styles recommendation blocks and export task surfaces as restrained dark system cards', () => {
    const styles = readAllCSS();

    expect(styles).toContain('backdrop-filter: blur(12px);');
    expect(styles).toContain('grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));');
    expect(styles).toContain('border-radius: 16px;');
    expect(styles).toContain('text-transform: uppercase;');
    expect(styles).toContain('letter-spacing: 0.08em;');
    expect(styles).toContain('#packageExportHistory');
  });
});
