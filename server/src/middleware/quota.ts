import { Request, Response, NextFunction } from 'express';
import { getSecurityConfig, getCurrentDate, getDailyUsageCounts, incrementUsageCount } from '../db.js';

export function quotaMiddleware(req: Request, res: Response, next: NextFunction) {
  const securityConfig = getSecurityConfig();
  const userId = (req as any).userId || 1;
  const currentDate = getCurrentDate();
  
  let usageType: 'image_gen' | 'chat_adjust' | null = null;
  
  if (req.path === '/image') {
    usageType = 'image_gen';
  } else if (req.path === '/chat') {
    usageType = 'chat_adjust';
  }
  
  if (!usageType) {
    return next();
  }
  
  if (securityConfig?.enabled_features?.quota !== false) {
    const imageLimit = securityConfig?.daily_image_gen_limit || 100;
    const chatLimit = securityConfig?.daily_chat_adjust_limit || 50;
    const currentCounts = getDailyUsageCounts(userId, currentDate);
    const currentCount = usageType === 'image_gen'
      ? currentCounts.imageGenCount
      : currentCounts.chatAdjustCount;
    const limit = usageType === 'image_gen' ? imageLimit : chatLimit;
    
    if (limit > 0 && currentCount >= limit) {
      return res.status(429).json({
        error: usageType === 'image_gen' 
          ? '每日生图配额已用完，请明天再试' 
          : '每日主题调整配额已用完，请明天再试'
      });
    }

    incrementUsageCount(userId, currentDate, usageType);
  }
  
  next();
}
