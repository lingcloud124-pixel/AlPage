import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('server export job persistence contracts', () => {
  test('database keeps export jobs across restarts and creates persistent tables', () => {
    const dbSource = fs.readFileSync(path.join(projectRoot, 'server/src/db.ts'), 'utf8');

    expect(dbSource).toContain('CREATE TABLE IF NOT EXISTS theme_export_jobs');
    expect(dbSource).not.toContain('DROP TABLE IF EXISTS theme_export_jobs');
  });

  test('export job store uses durable storage instead of process memory', () => {
    const storeSource = fs.readFileSync(path.join(projectRoot, 'server/src/export-jobs-memory-store.ts'), 'utf8');

    expect(storeSource).not.toContain('const jobs = new Map');
    expect(storeSource).toContain('theme_export_jobs');
    expect(storeSource).toContain('saveDb');
  });

  test('runner re-queues in-flight jobs on startup for recovery', () => {
    const runnerSource = fs.readFileSync(path.join(projectRoot, 'server/src/export-job-runner.ts'), 'utf8');

    expect(runnerSource).toContain('requeueInFlightExportJobs');
  });
});
