import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web packaging progress modal', () => {
  test('package progress modal and related styles removed from landing UI', () => {
    const html = fs.readFileSync(path.join(projectRoot, 'web/index.html'), 'utf8');

    expect(html).not.toContain('id="packageProgressNotice"');
    expect(html).not.toContain('兼容包导出中（约需1分钟），过程中不支持中断，请耐心等待');
    expect(html).not.toContain('id="packageModal"');
    expect(html).not.toContain('id="packageBtn"');
  });

  test('download failure shows error notification instead of anchor navigation', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/package-manager.ts'), 'utf8');

    expect(source).not.toMatch(/const a = document\.createElement\('a'\);\s*a\.href = dlUrl/);
    expect(source).toContain('showNotificationWithOptions');
    expect(source).toContain('triggerBlobDownload');
  });

  test('download button stays visible with loading state until save dialog is triggered', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/package-manager.ts'), 'utf8');
    const styles = fs.readFileSync(path.join(projectRoot, 'web/src/styles.css'), 'utf8');

    expect(source).toContain('setProgressDownloadButtonLoading');
    expect(source).toContain("downloadBtn.addEventListener('click', async () =>");
    expect(source).toContain('await triggerBlobDownload');
    expect(source).toContain("downloadBtn.style.display = 'none'");
    expect(source).toContain("button.dataset.loading = loading ? 'true' : 'false';");
    expect(styles).toContain('.package-progress-btn[data-loading="true"]');
    expect(styles).toContain('.package-progress-btn-spinner');
    expect(styles).toContain('animation: pkg-spin 0.75s linear infinite;');
    expect(styles).toContain('transform-origin: 50% 50%;');
    expect(styles).toContain('box-sizing: border-box;');
  });
});
