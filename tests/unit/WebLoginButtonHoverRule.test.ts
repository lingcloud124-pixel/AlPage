import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web login button hover rule', () => {
  test('login submit button hover follows primary hover instead of alter color in light-ui', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/templates/login.css'), 'utf8');

    expect(source).toContain('.login-submit-btn:hover');
    expect(source).toContain("background-color: var(--login-accent-hover-color, var(--primary-color-hover));");
    expect(source).not.toContain("background-color: var(--login-accent-hover-color, var(--hover-login-btn-bg, var(--alter-color)));");
  });
});
