import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('admin card template editor contracts', () => {
  test('admin page exposes a template editor drawer and default props form fields', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'server/admin/index.html'), 'utf8');

    expect(source).toContain('cardTemplateEditorDrawer');
    expect(source).toContain('cardTemplateItemsJson');
    expect(source).toContain('cardTemplateHeadline');
    expect(source).toContain('cardTemplateSummary');
    expect(source).toContain('cardTemplateLinksJson');
  });

  test('card library cards expose an edit action and editor open handler', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'server/admin/index.html'), 'utf8');

    expect(source).toContain('编辑模板');
    expect(source).toContain('openCardTemplateEditor');
    expect(source).toContain('saveCardTemplateEditor');
  });

  test('saving a template editor payload includes defaultProps', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'server/admin/index.html'), 'utf8');

    expect(source).toContain('defaultProps: {');
    expect(source).toContain('previewImageUrl');
  });
});
