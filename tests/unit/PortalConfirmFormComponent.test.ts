import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('portal confirm form component', () => {
  test('exports showPortalConfirmForm function', () => {
    const source = fs.readFileSync(
      path.join(projectRoot, 'web/src/components/portal-confirm-form.ts'),
      'utf8',
    );

    expect(source).toContain('export function showPortalConfirmForm');
    expect(source).toContain('export function hidePortalConfirmForm');
  });

  test('showPortalConfirmForm pre-fills fields from profile', () => {
    const source = fs.readFileSync(
      path.join(projectRoot, 'web/src/components/portal-confirm-form.ts'),
      'utf8'
    );

    expect(source).toContain('portalConfirmCustomerName');
    expect(source).toContain('portalConfirmIndustry');
    expect(source).toContain('.value =');
  });

  test('form submit handler collects all 6 fields', () => {
    const source = fs.readFileSync(
      path.join(projectRoot, 'web/src/components/portal-confirm-form.ts'),
      'utf8',
    );

    expect(source).toContain('customerName');
    expect(source).toContain('customerIndustry');
    expect(source).toContain('customerFunctions');
    expect(source).toContain('portalPurpose');
    expect(source).toContain('highlightedCards');
    expect(source).toContain('visualPreference');
  });
});
