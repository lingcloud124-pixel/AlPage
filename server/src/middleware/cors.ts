import { RequestHandler } from 'express';
import { getSecurityConfig } from '../db.js';

const LOCAL_DEV_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
];

function mergeAllowedOrigins(configuredOrigins: string[] | undefined): string[] {
  const merged = new Set(LOCAL_DEV_ORIGINS);
  for (const origin of configuredOrigins ?? []) {
    if (typeof origin === 'string' && origin.trim()) {
      merged.add(origin.trim());
    }
  }
  return Array.from(merged);
}

export const dynamicCors: RequestHandler = (req, res, next) => {
  const securityConfig = getSecurityConfig();

  const defaultOrigins = [...LOCAL_DEV_ORIGINS];

  let allowedOrigins: string[] = defaultOrigins;

  if (securityConfig?.enabled_features?.cors !== false) {
    allowedOrigins = mergeAllowedOrigins(securityConfig?.cors_origins);
  } else {
    allowedOrigins = [];
  }

  const origin = req.headers.origin as string;

  if (!origin) {
    return next();
  }

  const isAllowed = allowedOrigins.some(allowed => {
    if (allowed === '*') return true;
    if (allowed === origin) return true;

    if (allowed.startsWith('*.') && allowed.length > 2) {
      const domain = allowed.slice(2);
      return origin.endsWith('.' + domain) || origin === 'https://' + domain || origin === 'http://' + domain;
    }

    return false;
  });

  if (isAllowed || allowedOrigins.length === 0) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Id, X-Admin-Password');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }

  next();
};
