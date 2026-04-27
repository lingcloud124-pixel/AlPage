import { randomUUID } from 'crypto';

export type ExportJobStatus =
  | 'queued'
  | 'preparing'
  | 'capturing'
  | 'packaging'
  | 'verifying'
  | 'completed'
  | 'failed';

export interface MemoryExportJob {
  id: string;
  userId: number;
  status: ExportJobStatus;
  selectedProducts: string[];
  snapshot: Record<string, unknown>;
  error: string | null;
  result: Record<string, unknown> | null;
  createdAt: number;
  updatedAt: number;
}

const jobs = new Map<string, MemoryExportJob>();

export function createExportJob(data: {
  userId: number;
  selectedProducts: string[];
  snapshot: Record<string, unknown>;
}): MemoryExportJob {
  const job: MemoryExportJob = {
    id: `job-${Date.now()}-${randomUUID().slice(0, 8)}`,
    userId: data.userId,
    status: 'queued',
    selectedProducts: data.selectedProducts,
    snapshot: data.snapshot,
    error: null,
    result: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  jobs.set(job.id, job);
  return job;
}

export function getExportJobById(jobId: string): MemoryExportJob | undefined {
  return jobs.get(jobId);
}

export function getExportJobByIdAndUser(jobId: string, userId: number): MemoryExportJob | undefined {
  const job = jobs.get(jobId);
  if (!job || job.userId !== userId) return undefined;
  return job;
}

export function listQueuedExportJobs(limit: number = 10): MemoryExportJob[] {
  return Array.from(jobs.values())
    .filter(j => j.status === 'queued')
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(0, limit);
}

export function updateExportJob(
  jobId: string,
  updates: Partial<Pick<MemoryExportJob, 'status' | 'error' | 'result'>>,
): MemoryExportJob | null {
  const job = jobs.get(jobId);
  if (!job) return null;
  if (updates.status !== undefined) job.status = updates.status;
  if (updates.error !== undefined) job.error = updates.error;
  if (updates.result !== undefined) job.result = updates.result;
  job.updatedAt = Date.now();
  return job;
}
