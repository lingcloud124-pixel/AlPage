import { randomUUID } from 'crypto';
import { db, saveDb } from './db.js';

interface ConfirmedProjectSnapshot {
  projectId: string;
  name: string;
  nameEn: string;
  templateType: 'light-ui' | 'dark-ui';
  colors: Record<string, string>;
  bgImageUrl?: string;
  headerBgImageUrl?: string;
  visualContext?: unknown;
  sourceUpdatedAt: number;
  confirmedAt: number;
}

interface ConfirmedProjectVersion {
  id: string;
  projectId: string;
  createdAt: number;
  updatedAt: number;
  projectSnapshot: ConfirmedProjectSnapshot;
}

type ConfirmedVersionRow = {
  id: string;
  project_id: string;
  user_id: number;
  snapshot: string;
  created_at: number;
};

function parseSnapshot(value: string): ConfirmedProjectSnapshot {
  return JSON.parse(value) as ConfirmedProjectSnapshot;
}

function mapRowToConfirmedVersion(row: ConfirmedVersionRow | null | undefined): ConfirmedProjectVersion | undefined {
  if (!row) return undefined;
  return {
    id: row.id,
    projectId: row.project_id,
    createdAt: row.created_at,
    updatedAt: row.created_at,
    projectSnapshot: parseSnapshot(row.snapshot),
  };
}

export function createConfirmedVersionRecord(data: {
  projectId: string;
  userId: number;
  snapshot: ConfirmedProjectSnapshot;
}): ConfirmedProjectVersion {
  const createdAt = Date.now();
  const version: ConfirmedProjectVersion = {
    id: `confirmed-${createdAt}-${randomUUID().slice(0, 8)}`,
    projectId: data.projectId,
    createdAt,
    updatedAt: createdAt,
    projectSnapshot: data.snapshot,
  };

  const stmt = db.prepare(`
    INSERT INTO theme_confirmed_versions (
      id, project_id, user_id, snapshot, created_at
    ) VALUES (?, ?, ?, ?, ?)
  `);
  stmt.bind([
    version.id,
    version.projectId,
    data.userId,
    JSON.stringify(version.projectSnapshot),
    version.createdAt,
  ]);
  stmt.step();
  stmt.free();
  saveDb();
  return version;
}

export function getConfirmedVersionByIdAndUser(id: string, userId: number): ConfirmedProjectVersion | undefined {
  const stmt = db.prepare('SELECT * FROM theme_confirmed_versions WHERE id = ? AND user_id = ?');
  stmt.bind([id, userId]);
  const row = stmt.step() ? (stmt.getAsObject() as unknown as ConfirmedVersionRow) : null;
  stmt.free();
  return mapRowToConfirmedVersion(row);
}

export function listConfirmedVersionsByProject(projectId: string, userId: number): ConfirmedProjectVersion[] {
  const stmt = db.prepare(`
    SELECT * FROM theme_confirmed_versions
    WHERE project_id = ? AND user_id = ?
    ORDER BY created_at DESC
  `);
  stmt.bind([projectId, userId]);
  const versions: ConfirmedProjectVersion[] = [];
  while (stmt.step()) {
    const version = mapRowToConfirmedVersion(stmt.getAsObject() as unknown as ConfirmedVersionRow);
    if (version) versions.push(version);
  }
  stmt.free();
  return versions;
}
