import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('python sample package paths', () => {
  test('theme builder uses the checked-in light/dark sample package directories', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'theme_builder.py'), 'utf8');

    expect(source).toContain('"light-ui": LOCAL_SAMPLES_DIR / "light"');
    expect(source).toContain('"dark-ui": LOCAL_SAMPLES_DIR / "dark"');
    expect(source).toContain('"theme": "mk-festival-26-spring主题包.zip"');
    expect(source).toContain('"login": "mk-festival-spring-登录包.zip"');
    expect(source).not.toContain('LOCAL_SAMPLES_DIR / "light样例包"');
    expect(source).not.toContain('LOCAL_SAMPLES_DIR / "dark样例包"');
  });

  test('build verifier uses the same sample package directories and references', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'scripts', 'verify-build.py'), 'utf8');

    expect(source).toContain('"light-ui": LOCAL_SAMPLES_DIR / "light"');
    expect(source).toContain('"dark-ui": LOCAL_SAMPLES_DIR / "dark"');
    expect(source).toContain('("主题-MK-", "mk-festival-26-spring主题包.zip")');
    expect(source).toContain('("登录-MK-", "mk-festival-spring-登录包.zip")');
    expect(source).not.toContain('LOCAL_SAMPLES_DIR / "light样例包"');
    expect(source).not.toContain('LOCAL_SAMPLES_DIR / "dark样例包"');
    expect(source).not.toContain('assets/references/samples/主题样例包');
  });

  test('build verifier treats the configured theme color as allowed even if it matches a template color', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'scripts', 'verify-build.py'), 'utf8');

    expect(source).toContain('def detect_theme_color_from_output_dir');
    expect(source).toContain('allowed_theme_colors');
    expect(source).toContain('if color in allowed_theme_colors:');
    expect(source).toContain('verify_color_injection(gen_path, theme_color)');
  });
});
