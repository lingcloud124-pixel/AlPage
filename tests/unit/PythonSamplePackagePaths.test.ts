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

  test('mk package rebuild keeps the sample wrapper directory for importer compatibility', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'theme_builder.py'), 'utf8');

    expect(source).toContain('name_en: str,');
    expect(source).toContain('name_en=name_en,');
    expect(source).toContain('repack_dir(theme_extract_dir, theme_output, inner_theme_dir.name)');
    expect(source).toContain('repack_dir(login_extract_dir, login_output, inner_login_dir.name)');
    expect(source).toContain("import format stays identical to the sample package");
    expect(source).toContain('MK login packages must keep the template wrapper directory unchanged.');
  });

  test('mk package rebuild rewrites internal package identifiers away from the sample slug', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'theme_builder.py'), 'utf8');

    expect(source).toContain('build_mk_theme_slug');
    expect(source).toContain('build_mk_login_slug');
    expect(source).toContain('Updated MK theme package identifiers');
    expect(source).toContain('Updated MK login package identifiers');
    expect(source).toContain('("@user-login/login26-festival-spring", new_login_package)');
  });

  test('mk header and navigation slices are excluded from icon recolor after replacement', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'theme_builder.py'), 'utf8');

    expect(source).toContain('exclude_names=[');
    expect(source).toContain('"header-banner.png"');
    expect(source).toContain('"header-classic.png"');
    expect(source).toContain('"header-icon.png"');
    expect(source).toContain('"header-sideheader.png"');
    expect(source).toContain('"header-simple.png"');
    expect(source).toContain('"header-tabs.png"');
  });

  test('ekp simple header frame falls back to the generated simple header slice instead of the sample asset name', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'theme_builder.py'), 'utf8');

    expect(source).toContain('"header_simple_frame_bg.png": images.get("headerSimpleFrame", images.get("headerSimple"))');
    expect(source).not.toContain('"header_simple_frame_bg.png": images.get("headerSimpleFrame", "header_simple_frame_bg.png")');
  });

  test('image_down fallback applies sidebar gradient after bottom crop', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'theme_builder.py'), 'utf8');

    expect(source).toContain('def replace_image_bottom_crop_with_sidebar_gradient(');
    expect(source).toContain('_resolve_light_sidebar_overlay_color');
    expect(source).toContain('(0.2 - 1.0)');
    expect(source).toContain('template_type=template_type,');
    expect(source).toContain('colors=colors,');
    expect(source).toContain('replace_image_bottom_crop_with_sidebar_gradient(');
  });

  test('build verifier compares zip entry paths exactly instead of flattening wrapper directories', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'scripts', 'verify-build.py'), 'utf8');

    expect(source).toContain('normalize_mk_structure_paths');
    expect(source).toContain('prefix.startswith("主题-MK-") or prefix.startswith("登录-MK-")');
    expect(source).toContain('if gen_files == ref_files:');
    expect(source).toContain('only_ref = sorted(set(ref_files) - set(gen_files))');
    expect(source).toContain('only_gen = sorted(set(gen_files) - set(ref_files))');
  });
});
