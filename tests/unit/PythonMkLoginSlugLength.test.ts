import { execFileSync } from 'node:child_process';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('python mk login slug length', () => {
  test('build_mk_login_slug caps the variable slug part to 5 characters for standard product imports', () => {
    const script = `
import json
from theme_builder import build_mk_login_slug

slug = build_mk_login_slug(
    "login26-festival-spring",
    "very-long-standard-import-part-code-that-exceeds-limit"
)
prefix = "login26-festival-"
print(json.dumps({"slug": slug, "length": len(slug), "suffix": slug[len(prefix):]}))
`;

    const result = JSON.parse(
      execFileSync('python3', ['-c', script], {
        cwd: projectRoot,
        encoding: 'utf8',
      }),
    );

    expect(result.slug.startsWith('login26-festival-')).toBe(true);
    expect(result.suffix).toBe('very-');
    expect(result.suffix.length).toBeLessThanOrEqual(5);
  });

  test('build_mk_theme_slug caps the variable slug part to 5 characters for standard product imports', () => {
    const script = `
import json
from theme_builder import build_mk_theme_slug

slug = build_mk_theme_slug(
    "mk-festival-26-spring",
    "very-long-standard-import-part-code-that-exceeds-limit"
)
prefix = "mk-festival-"
print(json.dumps({"slug": slug, "suffix": slug[len(prefix):]}))
`;

    const result = JSON.parse(
      execFileSync('python3', ['-c', script], {
        cwd: projectRoot,
        encoding: 'utf8',
      }),
    );

    expect(result.slug.startsWith('mk-festival-')).toBe(true);
    expect(result.suffix).toBe('very-');
    expect(result.suffix.length).toBeLessThanOrEqual(5);
  });
});
