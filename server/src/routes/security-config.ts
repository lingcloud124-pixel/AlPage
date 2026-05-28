import { Router, Request, Response } from 'express';
import { getSecurityConfig, updateSecurityConfig } from '../db.js';
import { logger } from '../logger.js';

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

function normalizeMultilineText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
  return normalized || undefined;
}

function normalizeExportPreviewMode(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const normalized = String(value).trim().toLowerCase();
  return ['auto', 'service', 'local'].includes(normalized) ? normalized : undefined;
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const config = getSecurityConfig();
    if (!config) {
      return res.status(404).json({ error: 'Security config not found' });
    }
    
    const { cors_origins, proxy_image_hosts, rate_limits, enabled_features, daily_image_gen_limit, daily_chat_adjust_limit, credits_per_conversation, credits_per_image, daily_credits_limit, backup_retention_count, export_retention_days, export_preview_mode, credits_tooltip_content, whitelist_enabled, whitelist_users, updated_at } = config;
    res.json({
      corsOrigins: cors_origins,
      proxyImageHosts: proxy_image_hosts,
      rateLimits: rate_limits,
      enabledFeatures: enabled_features,
      dailyImageGenLimit: daily_image_gen_limit,
      dailyChatAdjustLimit: daily_chat_adjust_limit,
      creditsPerConversation: credits_per_conversation ?? 1,
      creditsPerImage: credits_per_image ?? 1,
      dailyCreditsLimit: daily_credits_limit ?? 10,
      backupRetentionCount: backup_retention_count ?? 8,
      exportRetentionDays: export_retention_days ?? 7,
      exportPreviewMode: export_preview_mode ?? 'auto',
      creditsTooltipContent: credits_tooltip_content ?? '',
      whitelistEnabled: whitelist_enabled ? true : false,
      whitelistUsers: typeof whitelist_users === 'string' ? JSON.parse(whitelist_users) : [],
      updated_at
    });
  } catch (error) {
    logger.error('Error fetching security config', error);
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
    const creditsPerConversation = normalizePositiveInteger(req.body?.creditsPerConversation);
    const creditsPerImage = normalizePositiveInteger(req.body?.creditsPerImage);
    const dailyCreditsLimit = normalizePositiveInteger(req.body?.dailyCreditsLimit);
    const backupRetentionCount = normalizePositiveInteger(req.body?.backupRetentionCount);
    const exportRetentionDays = normalizePositiveInteger(req.body?.exportRetentionDays);
    const exportPreviewMode = normalizeExportPreviewMode(req.body?.exportPreviewMode);
    const creditsTooltipContent = normalizeMultilineText(req.body?.creditsTooltipContent);
    const whitelistEnabled = typeof req.body?.whitelistEnabled === 'boolean' ? req.body.whitelistEnabled : undefined;
    const whitelistUsers = Array.isArray(req.body?.whitelistUsers)
      ? req.body.whitelistUsers.map((u: any) => String(u).trim()).filter(Boolean)
      : undefined;
    
    await updateSecurityConfig(corsOrigins, proxyImageHosts, rateLimits, enabledFeatures, dailyImageGenLimit, dailyChatAdjustLimit, creditsPerConversation, creditsPerImage, dailyCreditsLimit, backupRetentionCount, exportRetentionDays, exportPreviewMode, creditsTooltipContent, whitelistEnabled, whitelistUsers);
    
    const updatedConfig = getSecurityConfig();
    const { cors_origins: updatedCors, proxy_image_hosts: updatedProxy, rate_limits: updatedLimits, enabled_features: updatedFeatures, daily_image_gen_limit: updatedImageLimit, daily_chat_adjust_limit: updatedChatLimit, credits_per_conversation: updatedCreditsPerConv, credits_per_image: updatedCreditsPerImage, daily_credits_limit: updatedDailyCredits, backup_retention_count: updatedBackupRetentionCount, export_retention_days: updatedExportRetentionDays, export_preview_mode: updatedExportPreviewMode, credits_tooltip_content: updatedCreditsTooltipContent, whitelist_enabled: updatedWhitelistEnabled, whitelist_users: updatedWhitelistUsers, updated_at } = updatedConfig;
    
    res.json({
      success: true,
      corsOrigins: updatedCors,
      proxyImageHosts: updatedProxy,
      rateLimits: updatedLimits,
      enabledFeatures: updatedFeatures,
      dailyImageGenLimit: updatedImageLimit,
      dailyChatAdjustLimit: updatedChatLimit,
      creditsPerConversation: updatedCreditsPerConv ?? 1,
      creditsPerImage: updatedCreditsPerImage ?? 1,
      dailyCreditsLimit: updatedDailyCredits ?? 10,
      backupRetentionCount: updatedBackupRetentionCount ?? 8,
      exportRetentionDays: updatedExportRetentionDays ?? 7,
      exportPreviewMode: updatedExportPreviewMode ?? 'auto',
      creditsTooltipContent: updatedCreditsTooltipContent ?? '',
      whitelistEnabled: updatedWhitelistEnabled ? true : false,
      whitelistUsers: typeof updatedWhitelistUsers === 'string' ? JSON.parse(updatedWhitelistUsers) : [],
      updated_at
    });
  } catch (error) {
    logger.error('Error updating security config', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
