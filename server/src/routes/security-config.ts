import { Router, Request, Response } from 'express';
import { getSecurityConfig, updateSecurityConfig } from '../db.js';

const router = Router();

function normalizeStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value
    .map(item => String(item).trim())
    .filter(Boolean);
}

function normalizePositiveInteger(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return Math.floor(parsed);
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const config = getSecurityConfig();
    if (!config) {
      return res.status(404).json({ error: 'Security config not found' });
    }
    
    const { cors_origins, proxy_image_hosts, rate_limits, enabled_features, daily_image_gen_limit, daily_chat_adjust_limit, updated_at } = config;
    res.json({
      corsOrigins: cors_origins,
      proxyImageHosts: proxy_image_hosts,
      rateLimits: rate_limits,
      enabledFeatures: enabled_features,
      dailyImageGenLimit: daily_image_gen_limit,
      dailyChatAdjustLimit: daily_chat_adjust_limit,
      updated_at
    });
  } catch (error) {
    console.error('Error fetching security config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/', async (req: Request, res: Response) => {
  try {
    const corsOrigins = normalizeStringArray(req.body?.corsOrigins);
    const proxyImageHosts = normalizeStringArray(req.body?.proxyImageHosts);
    const rateLimits = req.body?.rateLimits && typeof req.body.rateLimits === 'object'
      ? req.body.rateLimits
      : undefined;
    const enabledFeatures = req.body?.enabledFeatures && typeof req.body.enabledFeatures === 'object'
      ? req.body.enabledFeatures
      : undefined;
    const dailyImageGenLimit = normalizePositiveInteger(req.body?.dailyImageGenLimit);
    const dailyChatAdjustLimit = normalizePositiveInteger(req.body?.dailyChatAdjustLimit);
    
    await updateSecurityConfig(corsOrigins, proxyImageHosts, rateLimits, enabledFeatures, dailyImageGenLimit, dailyChatAdjustLimit);
    
    const updatedConfig = getSecurityConfig();
    const { cors_origins: updatedCors, proxy_image_hosts: updatedProxy, rate_limits: updatedLimits, enabled_features: updatedFeatures, daily_image_gen_limit: updatedImageLimit, daily_chat_adjust_limit: updatedChatLimit, updated_at } = updatedConfig;
    
    res.json({
      success: true,
      corsOrigins: updatedCors,
      proxyImageHosts: updatedProxy,
      rateLimits: updatedLimits,
      enabledFeatures: updatedFeatures,
      dailyImageGenLimit: updatedImageLimit,
      dailyChatAdjustLimit: updatedChatLimit,
      updated_at
    });
  } catch (error) {
    console.error('Error updating security config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
