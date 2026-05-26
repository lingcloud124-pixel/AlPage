import { timingSafeEqual } from 'crypto';
import { Router, Request, Response } from 'express';
import { logger } from '../logger.js';
import { getStoredAdminPassword, setStoredAdminPassword } from '../db.js';
import { decryptIfNeeded, encryptIfNeeded } from '../crypto.js';

const router = Router();

function safeCompare(leftValue: string, rightValue: string): boolean {
  const left = Buffer.from(leftValue);
  const right = Buffer.from(rightValue);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
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

    const stored = getStoredAdminPassword();
    const currentPassword = stored
      ? decryptIfNeeded(stored)
      : process.env.ADMIN_PASSWORD;

    if (currentPassword) {
      if (typeof oldPassword !== 'string' || !safeCompare(oldPassword, currentPassword)) {
        res.status(401).json({ error: '当前密码不正确' });
        return;
      }
    }

    const trimmedNew = newPassword.trim();

    setStoredAdminPassword(encryptIfNeeded(trimmedNew));
    process.env.ADMIN_PASSWORD = trimmedNew;

    logger.info('Admin password updated (persisted to database)');

    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to update admin password', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
