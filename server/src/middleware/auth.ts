import { Request, Response, NextFunction } from 'express';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const userId = req.headers['x-user-id'] as string || '1';
  (req as any).userId = parseInt(userId, 10) || 1;
  next();
}

export function adminAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  
  if (!adminPassword) {
    return next();
  }
  
  const authorization = req.headers.authorization;
  if (typeof authorization === 'string' && authorization.startsWith('Bearer ')) {
    const bearerToken = authorization.slice(7);
    if (bearerToken === adminPassword) {
      return next();
    }
  }

  const providedPassword = req.headers['x-admin-password'] as string;
  if (providedPassword === adminPassword) {
    return next();
  }
  
  const queryPassword = req.query.admin_password as string;
  if (queryPassword === adminPassword) {
    return next();
  }
  
  res.status(401).json({ error: 'Unauthorized: Invalid admin password' });
}
