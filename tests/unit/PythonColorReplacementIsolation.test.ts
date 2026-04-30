import { execFileSync } from 'node:child_process';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('python color replacement isolation', () => {
  test('keeps alter-color independent from login background when defaults share the same source color', () => {
    const script = `
import json
from theme_builder import inject_color_into_css

content = """$alter-color:#144E48;
$login-bg-color:#144E48;
.header-simple.use-theme .ele-layout-hf .ele-header-portal-wrapper:hover { color:#144E48 !important; }
$portal-header-bg-extend-color:#FBFCF2;
"""

colors = {
    "primary-color": "#D91000",
    "alter-color": "#a30b00",
    "alter-color-hover-on": "#e76a60",
    "login-bg-color": "#fef5f3",
    "portal-header-bg-extend-color": "#fff2ef",
}

print(json.dumps({
    "output": inject_color_into_css(content, "#D91000", colors=colors)
}))
`;

    const result = JSON.parse(
      execFileSync('python3', ['-c', script], {
        cwd: projectRoot,
        encoding: 'utf8',
      }),
    ) as { output: string };

    expect(result.output).toContain('$alter-color:#A30B00;');
    expect(result.output).toContain('$login-bg-color:#FEF5F3;');
    expect(result.output).toContain('color:#A30B00 !important;');
    expect(result.output).toContain('$portal-header-bg-extend-color:#FFF2EF;');
  });

  test('preserves explicit opacity variants instead of reusing package defaults', () => {
    const script = `
import json
from theme_builder import inject_color_into_css

content = """$primary-color-opacity-10:#E9F1EB;
$primary-color-opacity-20:#D3E2D8;
$primary-color-opacity-30:#BDD4C4;
"""

colors = {
    "primary-color": "#D91000",
    "primary-color-opacity-10": "#fbe7e6",
    "primary-color-opacity-20": "#f7cfcc",
    "primary-color-opacity-30": "#f4b7b3",
}

print(json.dumps({
    "output": inject_color_into_css(content, "#D91000", colors=colors)
}))
`;

    const result = JSON.parse(
      execFileSync('python3', ['-c', script], {
        cwd: projectRoot,
        encoding: 'utf8',
      }),
    ) as { output: string };

    expect(result.output).toContain('$primary-color-opacity-10:#FBE7E6;');
    expect(result.output).toContain('$primary-color-opacity-20:#F7CFCC;');
    expect(result.output).toContain('$primary-color-opacity-30:#F4B7B3;');
  });
});
