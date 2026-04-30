import { execFileSync } from 'node:child_process';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('python mk login slug length', () => {
  test('build_mk_login_slug caps internal login part code length for standard importers', () => {
    const script = `
import json
from theme_builder import build_mk_login_slug

slug = build_mk_login_slug(
    "login26-festival-spring",
    "very-long-standard-import-part-code-that-exceeds-limit"
)
print(json.dumps({"slug": slug, "length": len(slug)}))
`;

    const result = JSON.parse(
      execFileSync('python3', ['-c', script], {
        cwd: projectRoot,
        encoding: 'utf8',
      }),
    );

    expect(result.slug.startsWith('login26-festival-')).toBe(true);
    expect(result.length).toBeLessThanOrEqual(36);
  });
});
