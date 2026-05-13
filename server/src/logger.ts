import { createWriteStream, mkdirSync, existsSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';

const LOG_DIR = join(process.cwd(), 'data', 'logs');
const MAX_LOG_FILES = 7;

let stream: ReturnType<typeof createWriteStream> | null = null;

function getLogFilePath(): string {
  const d = new Date();
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return join(LOG_DIR, `app-${date}.log`);
}

function ensureStream(): void {
  const target = getLogFilePath();
  if (stream && (stream.path as string) === target) return;
  if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });
  if (stream) stream.end();
  stream = createWriteStream(target, { flags: 'a' });
  rotateLogs();
}

function rotateLogs(): void {
  try {
    if (!existsSync(LOG_DIR)) return;
    const files = readdirSync(LOG_DIR)
      .filter(f => f.startsWith('app-') && f.endsWith('.log'))
      .sort();
    while (files.length > MAX_LOG_FILES) {
      unlinkSync(join(LOG_DIR, files.shift()!));
    }
  } catch {}
}

function timestamp(): string {
  return new Date().toISOString();
}

function write(level: string, msg: string, meta?: unknown): void {
  const entry = `[${timestamp()}] ${level} ${msg}${meta ? ' ' + JSON.stringify(meta) : ''}\n`;
  process.stdout.write(entry);
  try {
    ensureStream();
    stream!.write(entry);
  } catch {}
}

export const logger = {
  info(msg: string, meta?: unknown) { write('INFO ', msg, meta); },
  warn(msg: string, meta?: unknown) { write('WARN ', msg, meta); },
  error(msg: string, meta?: unknown) { write('ERROR', msg, meta); },
  request(method: string, path: string, status: number, ms: number) {
    write('REQ  ', `${method} ${path} → ${status} (${ms}ms)`);
  },
};
