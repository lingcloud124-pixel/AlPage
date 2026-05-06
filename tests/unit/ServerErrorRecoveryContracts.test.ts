import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('server error recovery contracts', () => {
  test('runner marks asset preparation, packaging, and verification failures as failed jobs with diagnostic context', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'server/src/export-job-runner.ts'), 'utf8');

    expect(source).toContain('Asset preparation failed:');
    expect(source).toContain('Packaging failed:');
    expect(source).toContain('Verification failed:');
    expect(source).toContain("status: 'failed'");
    expect(source).toContain('artifactPath: batchDir');
    expect(source).toContain('metadataDir');
    expect(source).toContain('packagesDir');
  });

  test('export job route rejects incomplete requests, unsupported products, and premature downloads', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'server/src/routes/export-jobs.ts'), 'utf8');
    const validationSource = fs.readFileSync(path.join(projectRoot, 'server/src/export-job-validation.ts'), 'utf8');

    expect(source).toContain('projectId, projectSnapshot and selectedProducts are required');
    expect(validationSource).toContain('selectedProducts 包含不支持的产品');
    expect(source).toContain('Export job is not ready for download');
    expect(source).toContain("return res.status(400).json({ error: selectedProductsResult.error });");
  });

  test('runner re-queues interrupted in-flight jobs so one failed task does not block subsequent work', () => {
    const runnerSource = fs.readFileSync(path.join(projectRoot, 'server/src/export-job-runner.ts'), 'utf8');
    const storeSource = fs.readFileSync(path.join(projectRoot, 'server/src/export-jobs-memory-store.ts'), 'utf8');

    expect(runnerSource).toContain('requeueInFlightExportJobs()');
    expect(storeSource).toContain("const nextError = job.error ?? 'Job interrupted before completion; re-queued on service startup'");
    expect(storeSource).toContain("stmt.bind(['queued', nextError, Date.now(), job.id]);");
  });
});
