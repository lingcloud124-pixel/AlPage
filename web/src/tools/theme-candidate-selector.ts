/**
 * 主题候选色选择器 — 从图片提取的主色候选中选出最佳主题色
 *
 * 从 executor.ts 拆分出来，包含 pickBestThemeCandidate 及其辅助函数。
 */
import type { ToolResult } from '../types';
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

function getHueDistanceDegrees(a: number, b: number): number {
  const delta = Math.abs(a - b) % 360;
  return Math.min(delta, 360 - delta);
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

export function resolveLockedPrimaryHex(primaryHint: string | undefined): string | null {
  if (!primaryHint) return null;
  const normalized = primaryHint.trim().toUpperCase();
  return /^#[0-9A-F]{6}$/.test(normalized) ? normalized : null;
}

export function buildPromptWithPreferredHue(
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

export function resolveEffectivePreferredHueHint(
  preferredHueHint: string,
  bgPrompt: string,
  templateType: 'light-ui' | 'dark-ui',
): string {
  if (preferredHueHint.trim()) return preferredHueHint;
  return resolvePreferredHueHint(bgPrompt, templateType)?.label ?? '';
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
