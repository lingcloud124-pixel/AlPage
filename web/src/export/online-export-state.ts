import type { ServerExportJob } from '../types';
import type { Project } from '../project-manager';

export function appendServerExportJobToProject(project: Project, job: ServerExportJob): Project {
  return {
    ...project,
    serverExportJobs: [job, ...(project.serverExportJobs ?? [])],
    updatedAt: Math.max(project.updatedAt, job.updatedAt),
  };
}

export function upsertServerExportJobOnProject(project: Project, job: ServerExportJob): Project {
  const existingJobs = project.serverExportJobs ?? [];
  const nextJobs = existingJobs.some((item) => item.id === job.id)
    ? existingJobs.map((item) => (item.id === job.id ? job : item))
    : [job, ...existingJobs];

  return {
    ...project,
    serverExportJobs: nextJobs,
    updatedAt: Math.max(project.updatedAt, job.updatedAt),
  };
}
