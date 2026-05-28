import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web packaging progress modal', () => {
  test('loading state removes interrupt affordance and shows non-interruptible notice', () => {
    const html = fs.readFileSync(path.join(projectRoot, 'web/index.html'), 'utf8');
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/package-manager.ts'), 'utf8');
    const styles = fs.readFileSync(path.join(projectRoot, 'web/src/styles.css'), 'utf8');

    expect(html).not.toContain('id="packageProgressClose"');
    expect(html).toContain('id="packageProgressNotice"');
    expect(html).toContain('主题包生成中（约需1分钟），过程中不支持中断，请耐心等待');
    expect(source).toContain("notice?.classList.toggle('is-visible', isLoading);");
    expect(source).not.toContain("document.getElementById('packageProgressClose')");
    expect(styles).not.toContain('.package-progress-close');
    expect(styles).toContain('.package-progress-notice');
    expect(styles).toContain('.package-progress-notice.is-visible');
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
  });
});
