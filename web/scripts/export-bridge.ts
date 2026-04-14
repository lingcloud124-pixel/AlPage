import http from 'node:http';
import { execFile } from 'node:child_process';
import { buildAll } from './build.js';
import type { ExportJobRequest } from '../src/export/export-job';
import type { ExportBatchStatus } from '../src/types';

const EXPORT_BRIDGE_PORT = Number(process.env.THEME_STUDIO_EXPORT_BRIDGE_PORT || '5174');

interface ExportJobRecord {
  id: string;
  status: ExportBatchStatus;
  error?: string;
  exportDir?: string;
  projectDir?: string;
  updatedAt: number;
}

type UpdateJobStatus = (status: ExportBatchStatus, extras?: Partial<ExportJobRecord>) => void;
type JobHandler = (job: ExportJobRequest, updateStatus: UpdateJobStatus) => Promise<void>;

const exportQueue: ExportJobRequest[] = [];
const jobRecords = new Map<string, ExportJobRecord>();
let isProcessing = false;

export function buildRuntimeOptionsFromExportJob(job: ExportJobRequest) {
  return {
    ...job.buildOptions,
    exportDir: job.batch.exportDir,
  };
}

async function processNextJob(handleJob: JobHandler) {
  if (isProcessing) return;
  const nextJob = exportQueue.shift();
  if (!nextJob) return;

  isProcessing = true;
  const updateStatus: UpdateJobStatus = (status, extras = {}) => {
    jobRecords.set(nextJob.batch.id, {
      ...(jobRecords.get(nextJob.batch.id) ?? {
        id: nextJob.batch.id,
        updatedAt: Date.now(),
      }),
      status,
      updatedAt: Date.now(),
      exportDir: nextJob.batch.exportDir,
      projectDir: nextJob.batch.projectDir,
      ...extras,
    });
  };
  try {
    updateStatus('capturing');
    await handleJob(nextJob, updateStatus);
    updateStatus('completed');
  } catch (error) {
    updateStatus('failed', { error: (error as Error).message });
  } finally {
    isProcessing = false;
    if (exportQueue.length > 0) {
      void processNextJob(handleJob);
    }
  }
}

export function enqueueJob(job: ExportJobRequest, handleJob: JobHandler = async (queuedJob, updateStatus) => {
  await buildAll({
    ...buildRuntimeOptionsFromExportJob(queuedJob),
    onStatus: (status) => updateStatus(status),
  });
}) {
  jobRecords.set(job.batch.id, {
    id: job.batch.id,
    status: 'queued',
    exportDir: job.batch.exportDir,
    projectDir: job.batch.projectDir,
    updatedAt: Date.now(),
  });
  exportQueue.push(job);
  void processNextJob(handleJob);
}

function collectRequestBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function defaultOpenPath(targetPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile('open', [targetPath], (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

export function createExportBridgeServer(handleJob?: JobHandler, openPath: (targetPath: string) => Promise<void> = defaultOpenPath) {
  return http.createServer(async (req, res) => {
    if (req.method === 'POST' && req.url === '/jobs') {
      try {
        const body = await collectRequestBody(req);
        const job = JSON.parse(body) as ExportJobRequest;
        enqueueJob(job, handleJob);
        res.writeHead(202, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ accepted: true, jobId: job.batch.id }));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ accepted: false, error: (error as Error).message }));
      }
      return;
    }

    if (req.method === 'GET' && req.url?.startsWith('/jobs/')) {
      const jobId = req.url.replace('/jobs/', '');
      const job = jobRecords.get(jobId);
      if (!job) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'job_not_found' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, job }));
      return;
    }

    if (req.method === 'POST' && req.url === '/open') {
      try {
        const body = await collectRequestBody(req);
        const payload = JSON.parse(body) as { path?: string };
        if (!payload.path) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'missing_path' }));
          return;
        }
        await openPath(payload.path);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: (error as Error).message }));
      }
      return;
    }

    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, queueSize: exportQueue.length, processing: isProcessing }));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false }));
  });
}

if (process.argv[1]?.endsWith('export-bridge.ts')) {
  const server = createExportBridgeServer();
  server.listen(EXPORT_BRIDGE_PORT, '127.0.0.1', () => {
    console.log(`Theme Studio export bridge listening on http://127.0.0.1:${EXPORT_BRIDGE_PORT}`);
  });
}
