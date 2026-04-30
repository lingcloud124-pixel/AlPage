import { timingSafeEqual } from 'crypto';
import { Router, Request, Response } from 'express';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { logger } from '../logger.js';

const router = Router();

function safeCompare(leftValue: string, rightValue: string): boolean {
  const left = Buffer.from(leftValue);
  const right = Buffer.from(rightValue);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function resolveEnvPath(): string | null {
  const candidates = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '..', '.env'),
  ];
  for (const p of candidates) {
    try {
      readFileSync(p, 'utf-8');
      return p;
    } catch {
    }
  }
  return null;
}

function updateEnvFileKey(filePath: string, key: string, value: string): void {
  const content = readFileSync(filePath, 'utf-8');
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`^${escapedKey}=.*$`, 'm');
  if (regex.test(content)) {
    const updated = content.replace(regex, `${key}=${value}`);
    writeFileSync(filePath, updated, 'utf-8');
  } else {
    const updated = content.endsWith('\n') ? `${content}${key}=${value}\n` : `${content}\n${key}=${value}\n`;
    writeFileSync(filePath, updated, 'utf-8');
  }
}

router.put('/', async (req: Request, res: Response) => {
  try {
    const { oldPassword, newPassword } = req.body || {};

    if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length === 0) {
      res.status(400).json({ error: '新密码不能为空' });
      return;
    }

    if (newPassword.trim().length < 4) {
      res.status(400).json({ error: '新密码长度至少为4位' });
      return;
    }

    const currentPassword = process.env.ADMIN_PASSWORD;

    if (currentPassword) {
      if (typeof oldPassword !== 'string' || !safeCompare(oldPassword, currentPassword)) {
        res.status(401).json({ error: '当前密码不正确' });
        return;
      }
    }

    const trimmedNew = newPassword.trim();

    process.env.ADMIN_PASSWORD = trimmedNew;

    const envPath = resolveEnvPath();
    if (envPath) {
      updateEnvFileKey(envPath, 'ADMIN_PASSWORD', trimmedNew);
      logger.info('Admin password updated (persisted to .env)');
    } else {
      logger.warn('Admin password updated in memory only — no .env file found to persist');
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to update admin password', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
