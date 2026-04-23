import { RequestHandler } from 'express';
import { getSecurityConfig } from '../db.js';

export const dynamicCors: RequestHandler = (req, res, next) => {
  const securityConfig = getSecurityConfig();
  
  const defaultOrigins = ['http://localhost:5173'];
  
  let allowedOrigins: string[] = defaultOrigins;
  
  if (securityConfig?.enabled_features?.cors !== false) {
    allowedOrigins = securityConfig?.cors_origins || defaultOrigins;
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