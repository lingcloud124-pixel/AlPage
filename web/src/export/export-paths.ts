export interface ExportBatchPathOptions {
  exportRoot: string;
  projectNameEn: string;
  timestamp: number;
}

export function normalizeExportRoot(value: string): string {
  return value.trim().replace(/[\\/]+$/, '');
}

function joinPath(...parts: string[]): string {
  return parts
    .map((part, index) => (index === 0 ? part : part.replace(/^\/+/, '')))
    .filter(Boolean)
    .join('/')
    .replace(/\/{2,}/g, '/');
}

function formatTimestamp(timestamp: number): string {
  const d = new Date(timestamp);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mi = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

export function buildExportBatchPaths(options: ExportBatchPathOptions) {
  const exportRoot = normalizeExportRoot(options.exportRoot);
  const projectDir = joinPath(exportRoot, 'projects', options.projectNameEn);
  const exportDir = joinPath(projectDir, 'exports', formatTimestamp(options.timestamp));

  return {
    exportRoot,
    projectDir,
    exportDir,
  };
}

