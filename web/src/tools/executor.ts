import type { ToolCall, ToolResult } from '../types';
import { generateImage } from '../agent/chat-client';
import { buildConfirmedProjectSnapshot, createServerExportJob } from '../export/online-export';
import { fetchExportJobStatus } from '../export/export-status-client';
import { getCurrentProjectId, loadProject } from '../project-manager';
import { resolvePrimaryContrast, validateColorScheme } from './contrast-validator';
import {
  buildThemeGenerationReport,
  DEFAULT_FALLBACK_BRAND_COLOR,
  deriveColorsFromPrimary,
  normalizePrimaryForTemplate,
  pickFallbackPaletteColorByHue,
  rankPrimaryCandidates,
  resolvePreferredHueHint,
  type DerivedColors,
} from '../theme/color-utils';
import { resolveEnterprisePrimaryFromText, snapToEnterpriseGreen } from '../theme/enterprise-primary-mapper';
import { resolveFestivalColorRule } from '../theme/festival-color-rules';
import { buildThemeImageAssignments } from '../templates/theme-images';
import { updateProjectVisualContext, loadProjectVisualContext } from './project-visual-context-store';
import { loadCustomerVisualProfile } from './customer-visual-profile-store';

const COLOR_VARS = [
  'primary-color', 'primary-color-hover', 'alter-color', 'alter-color-hover-on',
  'primary-color-opacity-10', 'primary-color-opacity-20', 'primary-color-opacity-30',
  'header-font-color', 'auxiliary-gray', 'auxiliary-gray-dark',
  'body-bg-color', 'tlayout-header-bg-extend-color', 'portal-header-bg-extend-color', 'portal-header-complex-bg-extend-color',
  'login-bg-color', 'panel-bg-color', 'sidebar-panel-bg', 'sidebar-color', 'sidebar-icon-color',
  'border-color', 'border-icon-color', 'gradient-start', 'gradient-mid',
];

const CSS_VAR_MAP: Record<string, string> = {};
COLOR_VARS.forEach(v => { CSS_VAR_MAP[v] = `--${v}`; });

/**
 * 超时包装器 — 防止任何 Promise 永久挂起
 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`工具 "${label}" 执行超时（${ms}ms）`)), ms)
    ),
  ]);
}

function normalizeThemeToolError(message: string): string {
  if (
    /输入图片审核未通过/u.test(message)
    || /暂不支持.*图片/u.test(message)
    || /不支持.*图片/u.test(message)
  ) {
    return '当前仅支持文字生图，暂不支持基于上传图片继续生成';
  }
  return message;
}

function getThemeTarget(): HTMLElement {
  return document.getElementById('previewPanel') ?? document.documentElement;
}

function applyThemeImages(templateId: string, imageUrl: string): void {
  const target = getThemeTarget();
  for (const [name, value] of Object.entries(buildThemeImageAssignments(templateId, imageUrl))) {
    target.style.setProperty(name, value);
  }
}

function updateColors(colors: Record<string, string>): ToolResult {
  let updated = 0;
  const target = getThemeTarget();
  for (const [key, value] of Object.entries(colors)) {
    const cssVar = CSS_VAR_MAP[key] ?? (key.startsWith('--') ? key : `--${key}`);
    if (/^#[0-9a-fA-F]{6}$/.test(value)) {
      target.style.setProperty(cssVar, value);
      updated++;
    }
  }
  return { success: true, data: { updated } };
}

function getAllCurrentColors(): Record<string, string> {
  const target = getThemeTarget();
  const computed = getComputedStyle(target);
  const vars: Record<string, string> = {};
  for (const v of COLOR_VARS) {
    const val = computed.getPropertyValue(`--${v}`).trim();
    if (val) vars[v] = val;
  }
  return vars;
}

function getHueDistanceDegrees(a: number, b: number): number {
  const delta = Math.abs(a - b) % 360;
  return Math.min(delta, 360 - delta);
}

export function quantizedBucketToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(c => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('');
}

function buildCandidateOutcome(
  primaryHex: string,
  templateType: 'light-ui' | 'dark-ui',
  options?: { preservePrimary?: boolean },
): {
  primaryHex: string;
  derivedColors: DerivedColors;
  report: ReturnType<typeof buildThemeGenerationReport>;
} {
  const normalizedPrimary = options?.preservePrimary
    ? primaryHex
    : normalizePrimaryForTemplate(primaryHex, templateType);
  const contrastResolved = templateType === 'light-ui'
    ? resolvePrimaryContrast(normalizedPrimary)
    : { primary: normalizedPrimary, text: '#333333', adjusted: false };
  const derivedColors = deriveColorsFromPrimary(contrastResolved.primary, templateType);
  if (templateType === 'light-ui') {
    derivedColors['primary-text-color'] = contrastResolved.text;
  }
  const report = buildThemeGenerationReport(contrastResolved.primary, derivedColors, templateType);
  return { primaryHex: contrastResolved.primary, derivedColors, report };
}

function resolveLockedPrimaryHex(primaryHint: string | undefined): string | null {
  if (!primaryHint) return null;
  const normalized = primaryHint.trim().toUpperCase();
  return /^#[0-9A-F]{6}$/.test(normalized) ? normalized : null;
}

function buildPromptWithPreferredHue(
  bgPrompt: string,
  preferredHueHint: string,
  templateType: 'light-ui' | 'dark-ui',
): string {
  const hint = resolvePreferredHueHint(preferredHueHint, templateType);
  if (!hint) return bgPrompt;

  if (/^#[0-9A-F]{6}$/.test(hint.label)) {
    return `${bgPrompt.trim().replace(/\s+$/, '')} Use ${hint.label} as the exact dominant brand color. This hex must define the final primary visual color and all supporting accents should align to it.`.trim();
  }

  const hueDirectiveMap: Record<string, string> = {
    red: 'Use a dominant festive red palette. Red must be the unmistakable primary visual color, with other accents only supporting it.',
    orange: 'Use a dominant warm orange palette. Orange must be the unmistakable primary visual color, with other accents only supporting it.',
    yellow: 'Use a dominant golden yellow palette. Gold must be the unmistakable primary visual color, with other accents only supporting it.',
    green: 'Use a dominant green palette. Green must be the unmistakable primary visual color, with other accents only supporting it.',
    teal: 'Use a dominant teal palette. Teal must be the unmistakable primary visual color, with other accents only supporting it.',
    blue: 'Use a dominant blue palette. Blue must be the unmistakable primary visual color, with other accents only supporting it.',
    purple: 'Use a dominant purple palette. Purple must be the unmistakable primary visual color, with other accents only supporting it.',
    pink: 'Use a dominant pink palette. Pink must be the unmistakable primary visual color, with other accents only supporting it.',
  };

  const directive = hueDirectiveMap[hint.label];
  if (!directive) return bgPrompt;
  return `${bgPrompt.trim().replace(/\s+$/, '')} ${directive}`.trim();
}

export interface ThemePreview {
  url: string;
  style: string;
  prompt: string;
  directionLabel: string;
  directionDescription: string;
}

interface ThemePreviewFailure {
  directionLabel: string;
  error: string;
}

export function pickBestThemeCandidate(
  dominantColors: string[],
  templateType: 'light-ui' | 'dark-ui',
  preferredHueHint?: string,
  semanticSourceText?: string,
): {
  primaryColor: string;
  derivedColors: DerivedColors;
  report: ReturnType<typeof buildThemeGenerationReport>;
  triedCandidates: Array<{ hex: string; score: number; passed: boolean }>;
  enforcedPreferredHue: boolean;
  enforcementReason?: string;
} {
  const explicitHex = typeof semanticSourceText === 'string'
    ? semanticSourceText.match(/#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/)?.[0]
    : undefined;
  if (explicitHex) {
    const normalizedHex = explicitHex.length === 4
      ? `#${explicitHex.slice(1).split('').map((char) => char + char).join('')}`.toUpperCase()
      : explicitHex.toUpperCase();
    const { primaryHex, derivedColors, report } = buildCandidateOutcome(
      normalizedHex,
      templateType,
      { preservePrimary: true },
    );
    return {
      primaryColor: primaryHex,
      derivedColors,
      report,
      triedCandidates: dominantColors.map((hex) => ({ hex, score: 0, passed: false })),
      enforcedPreferredHue: false,
      enforcementReason: `用户明确指定主题色 ${normalizedHex}，已优先使用该颜色。`,
    };
  }

  const lockedPrimaryHex = resolveLockedPrimaryHex(preferredHueHint);
  if (lockedPrimaryHex) {
    const { primaryHex, derivedColors, report } = buildCandidateOutcome(
      lockedPrimaryHex,
      templateType,
      { preservePrimary: true },
    );
    return {
      primaryColor: primaryHex,
      derivedColors,
      report,
      triedCandidates: dominantColors.map((hex) => ({ hex, score: 0, passed: false })),
      enforcedPreferredHue: true,
      enforcementReason: `快捷入口已锁定主题色 ${lockedPrimaryHex}，跳过图片提色候选选择。`,
    };
  }

  const festivalRule = resolveFestivalColorRule(semanticSourceText ?? '');
  const explicitHueHint = resolvePreferredHueHint(semanticSourceText ?? '', templateType)?.label;
  if (
    festivalRule
    && (!explicitHueHint || explicitHueHint === festivalRule.primaryHint)
  ) {
    const { primaryHex, derivedColors, report } = buildCandidateOutcome(
      festivalRule.primaryHex,
      templateType,
      { preservePrimary: true },
    );
    return {
      primaryColor: primaryHex,
      derivedColors,
      report,
      triedCandidates: dominantColors.map((hex) => ({ hex, score: 0, passed: false })),
      enforcedPreferredHue: false,
      enforcementReason: `命中节日安全主色：${festivalRule.id} → ${festivalRule.primaryHex}`,
    };
  }

  const semanticMatch = resolveEnterprisePrimaryFromText(semanticSourceText ?? '');
  if (semanticMatch?.confidence === 'high') {
    const { primaryHex, derivedColors, report } = buildCandidateOutcome(
      semanticMatch.presetHex,
      templateType,
      { preservePrimary: true },
    );
    return {
      primaryColor: primaryHex,
      derivedColors,
      report,
      triedCandidates: dominantColors.map((hex) => ({ hex, score: 0, passed: false })),
      enforcedPreferredHue: false,
      enforcementReason: semanticMatch.reason,
    };
  }

  const ranked = rankPrimaryCandidates(
    dominantColors,
    templateType,
    preferredHueHint,
    semanticMatch?.confidence === 'medium'
      ? {
          hex: semanticMatch.presetHex,
          family: semanticMatch.family,
          confidence: 'medium',
        }
      : undefined,
  );
  const hint = resolvePreferredHueHint(preferredHueHint, templateType);
  let candidatePool = ranked;
  const fallbackHex = hint?.fallbackHex
    ?? pickFallbackPaletteColorByHue(candidatePool[0]?.h)
    ?? DEFAULT_FALLBACK_BRAND_COLOR;

  if (ranked.length === 0) {
    const { primaryHex, derivedColors, report } = buildCandidateOutcome(fallbackHex, templateType);
    return {
      primaryColor: primaryHex,
      derivedColors,
      report,
      triedCandidates: [],
      enforcedPreferredHue: Boolean(hint),
      enforcementReason: hint ? `未识别到匹配 ${hint.label} 的候选主色，已按确认主色校正。` : undefined,
    };
  }

  if (hint) {
    const hueMatched = ranked.filter((candidate) => getHueDistanceDegrees(candidate.h, hint.targetHue) <= hint.tolerance);
    if (hueMatched.length === 0) {
      const { primaryHex, derivedColors, report } = buildCandidateOutcome(fallbackHex, templateType);
      return {
        primaryColor: primaryHex,
        derivedColors,
        report,
        triedCandidates: ranked.map((candidate) => ({
          hex: candidate.hex,
          score: candidate.score,
          passed: buildCandidateOutcome(candidate.hex, templateType).report.passed,
        })),
        enforcedPreferredHue: true,
        enforcementReason: `生成图片主色偏离已确认的 ${hint.label} 方向，已按确认主色强制校正。`,
      };
    }
    candidatePool = hueMatched;
  }

  const snappedBest = snapToEnterpriseGreen(candidatePool[0].hex);
  if (snappedBest) {
    const { derivedColors, report } = buildCandidateOutcome(
      snappedBest.snappedHex,
      templateType,
      { preservePrimary: true },
    );
    return {
      primaryColor: snappedBest.snappedHex,
      derivedColors,
      report,
      triedCandidates: candidatePool.map((candidate) => ({
        hex: candidate.hex,
        score: candidate.score,
        passed: buildCandidateOutcome(candidate.hex, templateType).report.passed,
      })),
      enforcedPreferredHue: false,
      enforcementReason: snappedBest.reason,
    };
  }

  let best = candidatePool[0];
  let bestOutcome = buildCandidateOutcome(best.hex, templateType);
  const triedCandidates = [{ hex: best.hex, score: best.score, passed: bestOutcome.report.passed }];

  for (const candidate of candidatePool.slice(1)) {
    if (bestOutcome.report.passed) break;
    const outcome = buildCandidateOutcome(candidate.hex, templateType);
    triedCandidates.push({ hex: candidate.hex, score: candidate.score, passed: outcome.report.passed });
    if (outcome.report.passed) {
      best = candidate;
      bestOutcome = outcome;
      break;
    }
  }

  return {
    primaryColor: bestOutcome.primaryHex,
    derivedColors: bestOutcome.derivedColors,
    report: bestOutcome.report,
    triedCandidates,
    enforcedPreferredHue: false,
  };
}

function resolveEffectivePreferredHueHint(
  preferredHueHint: string,
  bgPrompt: string,
  templateType: 'light-ui' | 'dark-ui',
): string {
  if (preferredHueHint.trim()) return preferredHueHint;
  return resolvePreferredHueHint(bgPrompt, templateType)?.label ?? '';
}

export async function analyzeImageAsync(imageUrl: string): Promise<ToolResult> {
  if (!imageUrl || typeof imageUrl !== 'string') {
    return { success: false, error: 'analyze_image 需要 imageUrl 参数' };
  }
  if (!imageUrl.startsWith('data:image/') && !imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
    return { success: false, error: `imageUrl 必须是 data URI 或 HTTP URL，不支持本地路径: "${imageUrl.substring(0, 80)}"` };
  }

  const loadPromise = new Promise<ToolResult>(async (resolve) => {
    let settled = false;
    const done = (fn: () => void) => {
      if (settled) return;
      settled = true;
      fn();
    };

    let analysisUrl = imageUrl;

    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      const proxyUrl = `/api/theme/proxy-image?url=${encodeURIComponent(imageUrl)}`;
      try {
        const resp = await fetch(proxyUrl);
        if (resp.ok) {
          const blob = await resp.blob();
          analysisUrl = URL.createObjectURL(blob);
        }
      } catch {
        try {
          const resp = await fetch(imageUrl, { mode: 'cors' });
          if (resp.ok) {
            const blob = await resp.blob();
            analysisUrl = URL.createObjectURL(blob);
          }
        } catch {
        }
      }
    }

    const img = new Image();
    img.onload = () => done(() => {
      try {
        const canvas = document.createElement('canvas');
        const targetW = 100;
        const targetH = Math.round((img.height / img.width) * targetW);
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, targetW, targetH);
        const imageData = ctx.getImageData(0, 0, targetW, targetH);
        const pixels = imageData.data;

        const colorBuckets: Record<string, number> = {};
        const step = 40;
        for (let i = 0; i < pixels.length; i += 4) {
          const r = Math.floor(pixels[i] / step) * step;
          const g = Math.floor(pixels[i + 1] / step) * step;
          const b = Math.floor(pixels[i + 2] / step) * step;
          const key = `${r},${g},${b}`;
          colorBuckets[key] = (colorBuckets[key] ?? 0) + 1;
        }

        const rgbToHsl = (r: number, g: number, b: number) => {
          const rn = r / 255, gn = g / 255, bn = b / 255;
          const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
          const l = (max + min) / 2;
          if (max === min) return { h: 0, s: 0, l };
          const d = max - min;
          const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          let h = 0;
          if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
          else if (max === gn) h = ((bn - rn) / d + 2) / 6;
          else h = ((rn - gn) / d + 4) / 6;
          return { h: h * 360, s: s * 100, l: l * 100 };
        };

        type BucketInfo = { key: string; count: number; r: number; g: number; b: number; hsl: { h: number; s: number; l: number } };
        const allBuckets: BucketInfo[] = Object.entries(colorBuckets).map(([key, count]) => {
          const [r, g, b] = key.split(',').map(Number);
          return { key, count, r, g, b, hsl: rgbToHsl(r, g, b) };
        });

        const saturated = allBuckets
          .filter(b => b.hsl.s >= 20 && b.hsl.l >= 20 && b.hsl.l <= 85)
          .sort((a, b) => {
            const scoreA = a.count * 100 + a.hsl.s * 0.4;
            const scoreB = b.count * 100 + b.hsl.s * 0.4;
            return scoreB - scoreA;
          });

        const neutral = allBuckets
          .filter(b => b.hsl.s < 20 || b.hsl.l < 20 || b.hsl.l > 85)
          .sort((a, b) => b.count - a.count);

        const sortedHex: string[] = [];
        const seenHues = new Set<number>();
        for (const b of saturated) {
          const hueKey = Math.round(b.hsl.h / 30);
          if (sortedHex.length >= 3) break;
          if (!seenHues.has(hueKey)) {
            sortedHex.push(quantizedBucketToHex(b.r, b.g, b.b));
            seenHues.add(hueKey);
          }
        }
        for (const b of neutral) {
          if (sortedHex.length >= 5) break;
          sortedHex.push(quantizedBucketToHex(b.r, b.g, b.b));
        }

        if (analysisUrl !== imageUrl) URL.revokeObjectURL(analysisUrl);
        resolve({ success: true, data: { dominantColors: sortedHex, source: 'client-canvas' } });
      } catch (e) {
        if (analysisUrl !== imageUrl) URL.revokeObjectURL(analysisUrl);
        resolve({ success: false, error: `图片分析失败: ${(e as Error).message}` });
      }
    });
    img.onerror = () => done(() => {
      if (analysisUrl !== imageUrl) URL.revokeObjectURL(analysisUrl);
      resolve({ success: false, error: '图片加载失败' });
    });
    img.src = analysisUrl;
  });

  return withTimeout(loadPromise, 15_000, 'analyze_image');
}

function parsePen(args: { penContent: string }): ToolResult {
  try {
    const pen = JSON.parse(args.penContent);
    const variables: Record<string, string> = {};
    if (pen.variables) {
      for (const [name, def] of Object.entries(pen.variables)) {
        const v = def as { themeTokens?: Record<string, string>; default?: string };
        if (v.themeTokens) {
          for (const [, color] of Object.entries(v.themeTokens)) {
            variables[name] = color as string;
          }
        } else if (v.default) {
          variables[name] = v.default;
        }
      }
    }
    return { success: true, data: { variables } };
  } catch (e) {
    return { success: false, error: `解析 .pen 文件失败: ${(e as Error).message}` };
  }
}

function saveColors(args: { colors: Record<string, string>; nameEn: string; name: string; templateType: string }): ToolResult {
  try {
    const key = `theme-studio-colors-${args.nameEn}`;
    localStorage.setItem(key, JSON.stringify({
      name: args.name,
      nameEn: args.nameEn,
      templateType: args.templateType,
      colors: args.colors,
      savedAt: Date.now(),
    }));
    return { success: true, data: { key } };
  } catch (e) {
    return { success: false, error: `保存失败: ${(e as Error).message}` };
  }
}

function loadColors(args: { nameEn: string }): ToolResult {
  try {
    const key = `theme-studio-colors-${args.nameEn}`;
    const stored = localStorage.getItem(key);
    if (!stored) return { success: false, error: `未找到配色方案: ${args.nameEn}` };
    return { success: true, data: JSON.parse(stored) };
  } catch (e) {
    return { success: false, error: `加载失败: ${(e as Error).message}` };
  }
}

const EXPORT_JOB_POLL_INTERVAL_MS = 1500;
const EXPORT_JOB_MAX_POLL_ATTEMPTS = 120;

function normalizeExportSelectedProducts(args: Record<string, unknown>): string[] {
  const rawProducts = Array.isArray(args.selectedProducts) ? args.selectedProducts : [];
  const products = rawProducts.filter((value): value is string => typeof value === 'string').map((value) => value.trim()).filter(Boolean);
  return products.length > 0 ? Array.from(new Set(products)) : ['mk'];
}

async function createBackendExportJob(projectId: string, selectedProducts: string[]) {
  const project = await loadProject(projectId);
  if (!project) {
    return { error: '当前项目不存在，请重新生成并确认主题。' } as const;
  }

  try {
    const snapshot = buildConfirmedProjectSnapshot(project);
    const exportJob = await createServerExportJob({
      projectId,
      projectSnapshot: snapshot,
      selectedProducts,
    });
    if (!exportJob.id) {
      return { error: '导出任务创建成功，但未返回 jobId。' } as const;
    }

    return {
      jobId: exportJob.id,
      status: typeof exportJob.status === 'string' ? exportJob.status : 'queued',
    } as const;
  } catch (error) {
    return { error: (error as Error).message } as const;
  }
}

async function runExportJobTool(
  tool: 'screenshot' | 'build' | 'verify',
  args: Record<string, unknown>,
  onProgress?: ProgressCallback,
): Promise<ToolResult> {
  const projectId = getCurrentProjectId();
  if (!projectId) {
    return { success: false, error: '当前没有可导出的项目，请先生成并确认主题。' };
  }

  const selectedProducts = normalizeExportSelectedProducts(args);
  const created = await createBackendExportJob(projectId, selectedProducts);
  if ('error' in created) {
    return { success: false, error: created.error };
  }

  const pollingUrl = `/api/theme/export-jobs/${created.jobId}`;
  onProgress?.({
    type: 'export_status',
    data: { tool, jobId: created.jobId, status: created.status, selectedProducts },
  });

  for (let attempt = 0; attempt < EXPORT_JOB_MAX_POLL_ATTEMPTS; attempt++) {
    const status = await fetchExportJobStatus(fetch, created.jobId);
    if (status) {
      onProgress?.({
        type: 'export_status',
        data: { tool, jobId: created.jobId, status: status.status, result: status },
      });

      if (status.status === 'completed') {
        return {
          success: true,
          data: {
            jobId: created.jobId,
            status: status.status,
            pollingUrl,
            result: status,
          },
        };
      }

      if (status.status === 'failed') {
        return {
          success: false,
          error: status.error ?? '导出任务失败，请检查服务日志。',
          data: {
            jobId: created.jobId,
            status: status.status,
            pollingUrl,
            result: status,
          },
        };
      }
    }

    await new Promise((resolve) => setTimeout(resolve, EXPORT_JOB_POLL_INTERVAL_MS));
  }

  return {
    success: false,
    error: `"${tool}" 任务超时，请稍后到导出记录中查看状态。`,
    data: {
      jobId: created.jobId,
      status: 'timeout',
      pollingUrl,
    },
  };
}

/**
 * 工具参数验证 — 在执行前拦截无效参数
 */
function validateToolArgs(tool: string, args: Record<string, unknown>): string | null {
  switch (tool) {
    case 'update_colors':
      if (!args.colors || typeof args.colors !== 'object') return 'update_colors 需要 colors 对象参数';
      return null;
    case 'analyze_image': {
      const url = args.imageUrl ?? args.imagePath ?? args.url;
      if (!url || typeof url !== 'string') return 'analyze_image 需要 imageUrl 参数';
      return null;
    }
    case 'parse_pen':
      if (!args.penContent && !args.penPath) return 'parse_pen 需要 penContent 参数';
      return null;
    case 'save_colors':
      if (!args.nameEn) return 'save_colors 需要 nameEn 参数';
      return null;
    case 'load_colors':
      if (!args.nameEn) return 'load_colors 需要 nameEn 参数';
      return null;
    case 'apply_selected_theme':
      if (!args.imageUrl && !args.selectedImageUrl && !args.url) return 'apply_selected_theme 需要 imageUrl 参数';
      return null;
    default:
      return null;
  }
}

export type ProgressCallback = (event: { type: string; data?: unknown }) => void;

export async function executeTool(toolCall: ToolCall, onProgress?: ProgressCallback): Promise<ToolResult> {
  const { tool, args } = toolCall;

  const validationError = validateToolArgs(tool, args);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const TOOL_TIMEOUT = tool === 'generate_theme_pipeline' || tool === 'generate_theme_previews' || tool === 'screenshot' || tool === 'build' || tool === 'verify'
    ? 300_000 : 15_000;

  const execute = async (): Promise<ToolResult> => {
    switch (tool) {
      case 'update_colors':
        return updateColors(args.colors as Record<string, string>);

      case 'analyze_image': {
        // 兼容 AI 可能使用的不同参数名
        const imageUrl = (args.imageUrl ?? args.imagePath ?? args.url ?? '') as string;
        return await analyzeImageAsync(imageUrl);
      }

      case 'parse_pen': {
        const content = (args.penContent ?? '') as string;
        if (!content) return { success: false, error: 'penContent 为空' };
        return parsePen({ penContent: content });
      }

      case 'save_colors':
        return saveColors(args as any);

      case 'load_colors':
        return loadColors(args as { nameEn: string });

      case 'generate_theme_previews': {
        const templateType = (args.templateType ?? 'light-ui') as 'light-ui' | 'dark-ui';
        const feedbackRegenerated = Boolean(args.themeFeedbackRegenerated);
        const preferredHueHint = resolveEffectivePreferredHueHint(
          (args.primaryHint ?? args.preferredHue ?? args.colorDirection ?? '') as string,
          '',
          templateType,
        );

        interface DirectionInput {
          label: string;
          prompt: string;
        }

        const rawDirections = args.directions as DirectionInput[] | undefined;
        if (!rawDirections || !Array.isArray(rawDirections) || rawDirections.length === 0) {
          return { success: false, error: 'generate_theme_previews 需要 directions 数组，每个方向包含 label 和 prompt' };
        }
        const directions = rawDirections.slice(0, 3);

        const total = directions.length;
        onProgress?.({ type: 'image_generating', data: { current: 0, total } });

        const results: Array<{
          url: string; style: string; prompt: string;
          directionLabel: string; directionDescription: string;
        }> = [];
        const failures: ThemePreviewFailure[] = [];

        for (let i = 0; i < directions.length; i++) {
          const dir = directions[i];
          let finalPrompt = dir.prompt ?? '';

          console.log(`[Skill验证] 方向${i + 1}: ${dir.label}`);
          console.log(`[Skill验证] prompt原文: ${finalPrompt}`);
          console.log(`[Skill验证] 字符数: ${finalPrompt.length}`);

          if (preferredHueHint) {
            finalPrompt = buildPromptWithPreferredHue(finalPrompt, preferredHueHint, templateType);
          }

          onProgress?.({ type: 'image_generating', data: { current: i + 1, total, label: dir.label } });

          const result = await generateImage(finalPrompt);

          if (!result.success) {
            failures.push({
              directionLabel: dir.label ?? `${String.fromCharCode(65 + i)}`,
              error: result.error ?? '未知错误',
            });
          }

          results.push({
            url: result.success && result.url ? result.url : '',
            style: `direction-${i}`,
            prompt: finalPrompt,
            directionLabel: dir.label ?? `${String.fromCharCode(65 + i)}`,
            directionDescription: '',
          });

          onProgress?.({ type: 'image_generated', data: { current: i + 1, total } });

          if (i < directions.length - 1) {
            await new Promise(r => setTimeout(r, 2000));
          }
        }

        const previews: ThemePreview[] = results.filter(r => r.url).map(r => ({
          url: r.url,
          style: r.style,
          prompt: r.prompt,
          directionLabel: r.directionLabel,
          directionDescription: r.directionDescription,
        }));

        if (previews.length === 0) {
          const failureSummary = failures.length > 0
            ? failures.map(({ directionLabel, error }) => `${directionLabel}: ${error}`).join('；')
            : '未返回具体错误';
          return {
            success: false,
            error: `所有预览图生成失败。${failureSummary}`,
            data: { failures },
          } as ToolResult;
        }

        return {
          success: true,
          data: {
            previews,
            themeAgentDebug: {
              toolCallPrompt: JSON.stringify(directions.map(d => d.label)),
              feedbackRegenerated,
              preferredHueHint,
              directions,
            },
            preferredHueHint,
          },
        };
      }

      case 'apply_selected_theme': {
        const imageUrl = (args.imageUrl ?? args.selectedImageUrl ?? args.url ?? '') as string;
        const templateType = (args.templateType ?? 'light-ui') as 'light-ui' | 'dark-ui';
        const preferredHueHint = (args.primaryHint ?? args.preferredHue ?? args.colorDirection ?? '') as string;
        const lockedPrimaryHex = resolveLockedPrimaryHex(preferredHueHint);
        if (!imageUrl) return { success: false, error: 'apply_selected_theme 需要 imageUrl 参数' };

        if (lockedPrimaryHex) {
          const colors = deriveColorsFromPrimary(lockedPrimaryHex, templateType);
          const report = buildThemeGenerationReport(lockedPrimaryHex, colors, templateType);
          const contrast = validateColorScheme({ ...colors });
          updateColors({ ...colors });
          applyThemeImages('login', imageUrl);
          applyThemeImages('desktop', imageUrl);
          return {
            success: true,
            data: {
              primaryColor: lockedPrimaryHex,
              imageUrl,
              applied: true,
              preferredHueHint,
              enforcedPreferredHue: true,
              enforcementReason: `快捷入口已锁定主题色 ${lockedPrimaryHex}，跳过图片分析。`,
              dominantColors: [],
              generationReport: report,
              triedCandidates: [],
              contrastValidation: contrast,
            },
          };
        }

        const analyzeResult = await analyzeImageAsync(imageUrl);
        const dominantColors = (analyzeResult.data as Record<string, unknown>)?.dominantColors as string[] | undefined;
        if (!analyzeResult.success || !dominantColors || dominantColors.length === 0) {
          const fallbackHex = resolvePreferredHueHint(preferredHueHint, templateType)?.fallbackHex
            ?? (templateType === 'dark-ui' ? '#1A2845' : '#1565C0');
          const colors = deriveColorsFromPrimary(fallbackHex, templateType);
          const report = buildThemeGenerationReport(fallbackHex, colors, templateType);
          const contrast = validateColorScheme({ ...colors });
          updateColors({ ...colors });
          applyThemeImages('login', imageUrl);
          applyThemeImages('desktop', imageUrl);
          return {
            success: true,
            data: {
              primaryColor: fallbackHex,
              imageUrl,
              applied: true,
              fallbackUsed: true,
              preferredHueHint,
              fallbackReason: analyzeResult.error ?? '未识别到可用主色候选',
              dominantColors: [],
              generationReport: report,
              contrastValidation: contrast,
            },
          };
        }

        const selected = pickBestThemeCandidate(
          dominantColors,
          templateType,
          preferredHueHint,
          String(args.semanticSourceText ?? args.prompt ?? ''),
        );
        const contrast = validateColorScheme({ ...selected.derivedColors });
        updateColors({ ...selected.derivedColors });
        applyThemeImages('login', imageUrl);
        applyThemeImages('desktop', imageUrl);

        return {
          success: true,
          data: {
            primaryColor: selected.primaryColor,
            imageUrl,
            applied: true,
            preferredHueHint,
            enforcedPreferredHue: selected.enforcedPreferredHue,
            enforcementReason: selected.enforcementReason,
            dominantColors,
            generationReport: selected.report,
            triedCandidates: selected.triedCandidates,
            contrastValidation: contrast,
          },
        };
      }

      case 'generate_theme_pipeline': {
        const rawBgPrompt = (args.prompt ?? args.description ?? '') as string;
        const templateType = (args.templateType ?? 'light-ui') as 'light-ui' | 'dark-ui';
        const feedbackRegenerated = Boolean(args.themeFeedbackRegenerated);
        const preferredHueHint = resolveEffectivePreferredHueHint(
          (args.primaryHint ?? args.preferredHue ?? args.colorDirection ?? '') as string,
          rawBgPrompt,
          templateType,
        );
        const lockedPrimaryHex = resolveLockedPrimaryHex(preferredHueHint);
        let finalPrompt = rawBgPrompt;

        if (preferredHueHint) {
          finalPrompt = buildPromptWithPreferredHue(finalPrompt, preferredHueHint, templateType);
        }

        if (!finalPrompt) return { success: false, error: 'generate_theme_pipeline 需要 prompt 参数' };

        onProgress?.({ type: 'image_generating' });

        const imgResult = await generateImage(finalPrompt);
        if (!imgResult.success || !imgResult.url) {
          return {
            success: false,
            error: normalizeThemeToolError(imgResult.error ?? '背景图生成失败'),
            fallback: 'direct-color-gen',
          } as ToolResult;
        }

        onProgress?.({ type: 'image_generated', data: { imageUrl: imgResult.url } });

        if (lockedPrimaryHex) {
          const colors = deriveColorsFromPrimary(lockedPrimaryHex, templateType);
          const report = buildThemeGenerationReport(lockedPrimaryHex, colors, templateType);
          const contrast = validateColorScheme({ ...colors });
          updateColors({ ...colors });
          applyThemeImages('login', imgResult.url);
          applyThemeImages('desktop', imgResult.url);
          const projectId = (globalThis as any).__themeStudioCurrentProjectId as string | undefined;
          if (projectId) {
            try { updateProjectVisualContext(projectId, { latestAcceptedScenePlan: undefined }); } catch {}
          }
          return {
            success: true,
            data: {
              primaryColor: lockedPrimaryHex,
              imageUrl: imgResult.url,
              applied: true,
              originalPrompt: rawBgPrompt,
              themeAgentDebug: { toolCallPrompt: rawBgPrompt, feedbackRegenerated, finalPrompt, preferredHueHint },
              preferredHueHint,
              enforcedPreferredHue: true,
              enforcementReason: `快捷入口已锁定主题色 ${lockedPrimaryHex}，跳过图片提色分析。`,
              dominantColors: [],
              generationReport: report,
              triedCandidates: [],
              contrastValidation: contrast,
            },
          };
        }

        const analyzeResult = await analyzeImageAsync(imgResult.url);
        const dominantColors = (analyzeResult.data as Record<string, unknown>)?.dominantColors as string[] | undefined;
        if (!analyzeResult.success || !dominantColors || dominantColors.length === 0) {
          const fallbackHex = resolvePreferredHueHint(preferredHueHint, templateType)?.fallbackHex
            ?? (templateType === 'dark-ui' ? '#1A2845' : '#1565C0');
          const colors = deriveColorsFromPrimary(fallbackHex, templateType);
          const report = buildThemeGenerationReport(fallbackHex, colors, templateType);
          const contrast = validateColorScheme({ ...colors });
          updateColors({ ...colors });
          applyThemeImages('login', imgResult.url);
          applyThemeImages('desktop', imgResult.url);
          const projectId = (globalThis as any).__themeStudioCurrentProjectId as string | undefined;
          if (projectId) {
          try { updateProjectVisualContext(projectId, { latestAcceptedScenePlan: undefined }); } catch {}
          }
          return {
            success: true,
            data: {
              primaryColor: fallbackHex,
              imageUrl: imgResult.url,
              applied: true,
              fallbackUsed: true,
              originalPrompt: rawBgPrompt,
              themeAgentDebug: { toolCallPrompt: rawBgPrompt, feedbackRegenerated, finalPrompt, preferredHueHint },
              preferredHueHint,
              fallbackReason: analyzeResult.error ?? '未识别到可用主色候选',
              enforcedPreferredHue: Boolean(preferredHueHint),
              dominantColors: [],
              generationReport: report,
              contrastValidation: contrast,
            },
          };
        }

        const selected = pickBestThemeCandidate(
          dominantColors,
          templateType,
          preferredHueHint,
          rawBgPrompt,
        );
        const contrast = validateColorScheme({ ...selected.derivedColors });
        updateColors({ ...selected.derivedColors });
        applyThemeImages('login', imgResult.url);
        applyThemeImages('desktop', imgResult.url);

        const projectId = (globalThis as any).__themeStudioCurrentProjectId as string | undefined;
        if (projectId) {
          try { updateProjectVisualContext(projectId, { latestAcceptedScenePlan: undefined }); } catch {}
        }

        return {
          success: true,
          data: {
            primaryColor: selected.primaryColor,
            imageUrl: imgResult.url,
            applied: true,
            originalPrompt: rawBgPrompt,
            themeAgentDebug: { toolCallPrompt: rawBgPrompt, feedbackRegenerated, finalPrompt, preferredHueHint },
            preferredHueHint,
            enforcedPreferredHue: selected.enforcedPreferredHue,
            enforcementReason: selected.enforcementReason,
            dominantColors,
            generationReport: selected.report,
            triedCandidates: selected.triedCandidates,
            contrastValidation: contrast,
          },
        };
      }

      case 'generate_background': {
        const bgPrompt = (args.prompt ?? args.description ?? '') as string;
        if (!bgPrompt) return { success: false, error: 'generate_background 需要 prompt 参数' };
        return await generateImage(bgPrompt);
      }

      case 'validate_colors': {
        const colors = (args.colors ?? {}) as Record<string, string>;
        if (Object.keys(colors).length === 0) {
          const currentVars = getAllCurrentColors();
          if (Object.keys(currentVars).length === 0) return { success: false, error: '无当前配色方案' };
          const result = validateColorScheme(currentVars);
          return { success: result.passed, data: result };
        }
        const result = validateColorScheme(colors);
        return { success: result.passed, data: result };
      }

      case 'screenshot':
      case 'build':
      case 'verify':
        return runExportJobTool(tool, args, onProgress);

      default:
        return { success: false, error: `未知工具: ${tool}` };
    }
  };

  return withTimeout(execute(), TOOL_TIMEOUT, tool);
}
