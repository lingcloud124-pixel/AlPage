import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('model config provider contract', () => {
  test('db schema includes provider-aware image credential fields', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'server/src/db.ts'), 'utf8');

    expect(source).toContain('image_provider TEXT NOT NULL DEFAULT');
    expect(source).toContain('image_access_key_id TEXT NOT NULL DEFAULT');
    expect(source).toContain('image_secret_access_key TEXT NOT NULL DEFAULT');
  });

  test('model-config route exposes provider-aware image fields', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'server/src/routes/model-config.ts'), 'utf8');

    expect(source).toContain('imageProvider');
    expect(source).toContain('imageAccessKeyId');
    expect(source).toContain('imageSecretAccessKey');
  });

  test('admin panel includes Jimeng credential inputs', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'server/admin/index.html'), 'utf8');

    expect(source).toContain('imageProvider');
    expect(source).toContain('imageAccessKeyId');
    expect(source).toContain('imageSecretAccessKey');
  });
});
