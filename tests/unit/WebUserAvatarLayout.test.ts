import { describe, expect, test } from 'vitest';
import { readAllCSS } from '../helpers/read-css';

describe('web user avatar layout', () => {
  test('keeps avatar initial and user name on one row with truncation', () => {
    const styles = readAllCSS();
    const groupBlock = styles.match(/\.user-avatar-group\s*\{([^}]*)\}/)?.[1] ?? '';
    const nameBlock = styles.match(/\.user-avatar-name\s*\{([^}]*)\}/)?.[1] ?? '';

    expect(groupBlock).toContain('display: inline-flex;');
    expect(groupBlock).toContain('align-items: center;');
    expect(groupBlock).toContain('white-space: nowrap;');
    expect(groupBlock).toContain('min-width: 0;');
    expect(nameBlock).toContain('overflow: hidden;');
    expect(nameBlock).toContain('text-overflow: ellipsis;');
    expect(nameBlock).toContain('white-space: nowrap;');
  });
});
