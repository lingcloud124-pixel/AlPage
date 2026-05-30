import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { readAllCSS } from '../helpers/read-css';

const projectRoot = process.cwd();

describe('portal confirm form HTML', () => {
  test('index.html contains portal confirm modal', () => {
    const html = fs.readFileSync(path.join(projectRoot, 'web/index.html'), 'utf8');

    expect(html).toContain('id="portalConfirmModal"');
    expect(html).toContain('id="portalConfirmCustomerName"');
    expect(html).toContain('id="portalConfirmIndustry"');
    expect(html).toContain('id="portalConfirmPurpose"');
    expect(html).toContain('id="portalConfirmSubmitBtn"');
    expect(html).toContain('id="portalConfirmCancelBtn"');
  });

  test('styles.css contains portal confirm form styles', () => {
    const css = readAllCSS();

    expect(css).toContain('.portal-confirm-form');
    expect(css).toContain('.portal-confirm-field');
  });
});
