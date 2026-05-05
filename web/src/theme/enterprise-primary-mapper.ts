import { ENTERPRISE_PRIMARY_PALETTE, type EnterprisePrimaryPreset } from './enterprise-primary-palette';
import { hexToHsl } from './color-utils';

export interface EnterprisePrimaryMatch {
  presetHex: string;
  presetLabel: string;
  family: EnterprisePrimaryPreset['family'];
  confidence: 'high' | 'medium' | 'low';
  matchedTags: string[];
  reason: string;
}

export interface EnterpriseGreenSnapResult {
  originalHex: string;
  snappedHex: string;
  presetLabel: string;
  reason: string;
}

function normalizedIncludes(text: string, token: string): boolean {
  return text.toLowerCase().includes(token.toLowerCase());
}

function scorePreset(
  text: string,
  preset: EnterprisePrimaryPreset,
): { score: number; matchedTags: string[] } {
  let score = 0;
  const matchedTags: string[] = [];

  for (const tag of preset.semanticTags) {
    if (normalizedIncludes(text, tag)) {
      matchedTags.push(tag);
      score += tag.length >= 4 ? 14 : 8;
    }
  }

  for (const industry of preset.industries) {
    if (normalizedIncludes(text, industry)) {
      matchedTags.push(industry);
      score += 10;
    }
  }

  for (const mood of preset.moods) {
    if (normalizedIncludes(text, mood)) {
      matchedTags.push(mood);
      score += 6;
    }
  }

  score += preset.priority * 0.1;
  return { score, matchedTags: Array.from(new Set(matchedTags)) };
}

function inferConfidence(score: number, matchedTagCount: number): 'high' | 'medium' | 'low' {
  if (matchedTagCount >= 2 && score >= 24) return 'high';
  if (matchedTagCount >= 1 && score >= 14) return 'medium';
  return 'low';
}

function getHueDistanceDegrees(a: number, b: number): number {
  const delta = Math.abs(a - b) % 360;
  return Math.min(delta, 360 - delta);
}

function isEnterpriseGreenCandidate(hex: string): boolean {
  const { h, s, l } = hexToHsl(hex);
  return h >= 95 && h <= 155 && s >= 35 && l >= 48;
}

function scoreGreenPresetDistance(candidateHex: string, presetHex: string): number {
  const candidate = hexToHsl(candidateHex);
  const preset = hexToHsl(presetHex);
  return (
    getHueDistanceDegrees(candidate.h, preset.h) * 3
    + Math.abs(candidate.s - preset.s) * 0.8
    + Math.abs(candidate.l - preset.l) * 1.5
  );
}

export function resolveEnterprisePrimaryFromText(
  text: string,
): EnterprisePrimaryMatch | null {
  const source = text.trim();
  if (!source) return null;

  let best:
    | {
        preset: EnterprisePrimaryPreset;
        score: number;
        matchedTags: string[];
      }
    | null = null;

  for (const preset of ENTERPRISE_PRIMARY_PALETTE) {
    const ranked = scorePreset(source, preset);
    if (!best || ranked.score > best.score) {
      best = {
        preset,
        score: ranked.score,
        matchedTags: ranked.matchedTags,
      };
    }
  }

  if (!best || best.matchedTags.length === 0) return null;

  const confidence = inferConfidence(best.score, best.matchedTags.length);
  return {
    presetHex: best.preset.hex,
    presetLabel: best.preset.label,
    family: best.preset.family,
    confidence,
    matchedTags: best.matchedTags,
    reason: `命中企业安全色库：${best.preset.label}（${best.matchedTags.join(' / ')}）`,
  };
}

export function snapToEnterpriseGreen(hex: string): EnterpriseGreenSnapResult | null {
  if (!isEnterpriseGreenCandidate(hex)) return null;

  const greenPresets = ENTERPRISE_PRIMARY_PALETTE.filter((preset) => preset.family === 'green');
  if (greenPresets.length === 0) return null;

  let bestPreset = greenPresets[0];
  let bestScore = scoreGreenPresetDistance(hex, bestPreset.hex);

  for (const preset of greenPresets.slice(1)) {
    const score = scoreGreenPresetDistance(hex, preset.hex);
    if (score < bestScore) {
      bestPreset = preset;
      bestScore = score;
    }
  }

  if (bestPreset.hex.toUpperCase() === hex.toUpperCase()) return null;

  return {
    originalHex: hex,
    snappedHex: bestPreset.hex,
    presetLabel: bestPreset.label,
    reason: `候选绿色 ${hex.toUpperCase()} 已吸附到企业安全绿：${bestPreset.label}（${bestPreset.hex}）`,
  };
}
