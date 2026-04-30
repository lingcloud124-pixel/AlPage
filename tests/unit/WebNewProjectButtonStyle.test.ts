import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web new project button style', () => {
  test('uses outlined soft-fill styling with white text in dark mode and light surface with black text in light mode', () => {
    const styles = fs.readFileSync(path.join(projectRoot, 'web/src/styles.css'), 'utf8');

    expect(styles).toContain('.sidebar-new-chat-full {');
    expect(styles).toContain('background: #eef4ff;');
    expect(styles).toContain('color: #2f6bff;');
    expect(styles).toContain('border: 0.5px solid #dbe7ff;');
  });
});
