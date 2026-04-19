import type { ThemeScenePlan } from './theme-scene-planner';
import type { ThemeIntent } from './theme-intent-parser';

/**
 * 图片生成后的质量自动评审。
 *
 * 在浏览器环境中无法做真正的 CV 分析（无 ML 模型），
 * 因此评审逻辑基于：
 *   1. 主色提取结果（dominant colors）→ 色彩丰富度、亮度、饱和度
 *   2. scenePlan 与 intent 的规划质量 → 是否满足 OA 背景图约束
 *   3. 生成报告 + 对比度校验结果 → 已有数据复用
 *
 * 评审不会阻塞生成流程，只在返回结果中附加评审摘要，
 * 供 chat-manager 展示给用户参考。
 */

export interface ImageReviewCheckItem {
  label: string;
  passed: boolean;
  severity: 'critical' | 'warning' | 'info';
  reason?: string;
}

export interface ImageReviewResult {
  /** 总体评分 0-100 */
  score: number;
  /** 是否达到可接受阈值（score >= 50） */
  acceptable: boolean;
  /** 各项评审明细 */
  checks: ImageReviewCheckItem[];
  /** 一句话摘要 */
  summary: string;
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
}

export function reviewGeneratedImage(params: {
  dominantColors: string[];
  scenePlan: ThemeScenePlan;
  intent: ThemeIntent;
  templateType: 'light-ui' | 'dark-ui';
  generationReport?: { passed: boolean; checks?: Array<{ label: string; passed: boolean }> };
  contrastValidation?: { passed: boolean; failures?: string[] };
  enforcedPreferredHue?: boolean;
  fallbackUsed?: boolean;
}): ImageReviewResult {
  const {
    dominantColors,
    scenePlan,
    intent,
    templateType,
    generationReport,
    contrastValidation,
    enforcedPreferredHue,
    fallbackUsed,
  } = params;

  const checks: ImageReviewCheckItem[] = [];
  let score = 100;

  // ── 1. 色彩丰富度 ──
  if (dominantColors.length >= 3) {
    const hues = dominantColors.map((c) => hexToHsl(c).h);
    const uniqueHueRanges = new Set(hues.map((h) => Math.floor(h / 60)));
    if (uniqueHueRanges.size >= 2) {
      checks.push({ label: '色彩丰富度', passed: true, severity: 'info', reason: `识别到 ${dominantColors.length} 种主色，跨越 ${uniqueHueRanges.size} 个色相区间。` });
    } else {
      checks.push({ label: '色彩丰富度', passed: true, severity: 'info', reason: '色彩集中在单一色相区间，适合主题一致性。' });
    }
  } else if (dominantColors.length >= 1) {
    score -= 5;
    checks.push({ label: '色彩丰富度', passed: true, severity: 'warning', reason: `仅识别到 ${dominantColors.length} 种主色，色彩层次可能偏单调。` });
  } else {
    score -= 20;
    checks.push({ label: '色彩丰富度', passed: false, severity: 'critical', reason: '未识别到任何主色。' });
  }

  // ── 2. 亮度适配 ──
  if (dominantColors.length > 0) {
    const avgLightness = dominantColors.reduce((sum, c) => sum + hexToHsl(c).l, 0) / dominantColors.length;
    if (templateType === 'light-ui' && avgLightness < 25) {
      score -= 15;
      checks.push({ label: '亮度适配', passed: false, severity: 'warning', reason: `Light-UI 模板下主色平均亮度仅 ${avgLightness}%，整体可能偏暗。` });
    } else if (templateType === 'dark-ui' && avgLightness > 75) {
      score -= 10;
      checks.push({ label: '亮度适配', passed: false, severity: 'warning', reason: `Dark-UI 模板下主色平均亮度 ${avgLightness}%，整体可能偏亮。` });
    } else {
      checks.push({ label: '亮度适配', passed: true, severity: 'info', reason: `主色平均亮度 ${avgLightness.toFixed(0)}%，适配 ${templateType}。` });
    }
  }

  // ── 3. 饱和度检查 ──
  if (dominantColors.length > 0) {
    const maxSaturation = Math.max(...dominantColors.map((c) => hexToHsl(c).s));
    if (maxSaturation > 90) {
      score -= 5;
      checks.push({ label: '饱和度控制', passed: true, severity: 'info', reason: `最高饱和度 ${maxSaturation}%，色彩浓郁但仍在可接受范围。` });
    } else {
      checks.push({ label: '饱和度控制', passed: true, severity: 'info', reason: '饱和度适中。' });
    }
  }

  // ── 4. 主题色偏差 ──
  if (enforcedPreferredHue) {
    score -= 5;
    checks.push({ label: '主题色偏差', passed: true, severity: 'warning', reason: '生成图片主色与确认方向不一致，已强制校正。建议后续关注色彩匹配度。' });
  }

  // ── 5. 回退使用 ──
  if (fallbackUsed) {
    score -= 10;
    checks.push({ label: '提色稳定性', passed: false, severity: 'warning', reason: '本次提色未稳定完成，已回退应用默认主色。图片质量可能受影响。' });
  }

  // ── 6. 生成报告复用 ──
  if (generationReport) {
    const failedChecks = (generationReport.checks ?? []).filter((c) => !c.passed);
    if (failedChecks.length > 0) {
      score -= failedChecks.length * 5;
      checks.push({
        label: '规则校验',
        passed: generationReport.passed,
        severity: failedChecks.length > 2 ? 'warning' : 'info',
        reason: `${failedChecks.length} 项规则未通过：${failedChecks.map((c) => c.label).join('、')}。`,
      });
    } else {
      checks.push({ label: '规则校验', passed: true, severity: 'info', reason: '全部生成规则校验通过。' });
    }
  }

  // ── 7. 对比度校验复用 ──
  if (contrastValidation) {
    if (!contrastValidation.passed) {
      score -= 10;
      checks.push({
        label: 'WCAG 对比度',
        passed: false,
        severity: 'warning',
        reason: contrastValidation.failures?.length
          ? `对比度风险：${contrastValidation.failures.join('；')}。`
          : '存在对比度风险。',
      });
    } else {
      checks.push({ label: 'WCAG 对比度', passed: true, severity: 'info', reason: 'WCAG 2.1 对比度校验通过。' });
    }
  }

  // ── 8. Prompt 与意图一致性 ──
  const promptKeywords = [intent.category, intent.subCategory, ...intent.styleHints, ...intent.toneHints]
    .filter(Boolean)
    .map((k) => k!.toLowerCase());
  const planText = `${scenePlan.sceneSentence} ${scenePlan.styleKeywords}`.toLowerCase();
  const matchedKeywords = promptKeywords.filter((k) => planText.includes(k));
  if (promptKeywords.length > 0 && matchedKeywords.length === 0) {
    score -= 10;
    checks.push({ label: '意图一致性', passed: false, severity: 'warning', reason: '场景规划未体现用户意图关键词，可能跑题。' });
  } else if (promptKeywords.length > 0) {
    checks.push({ label: '意图一致性', passed: true, severity: 'info', reason: `场景规划覆盖了 ${matchedKeywords.length}/${promptKeywords.length} 个意图关键词。` });
  }

  // ── 计算最终结果 ──
  score = Math.max(0, Math.min(100, score));
  const acceptable = score >= 50;
  const passedCount = checks.filter((c) => c.passed).length;
  const warningCount = checks.filter((c) => c.severity === 'warning').length;
  const criticalCount = checks.filter((c) => c.severity === 'critical' && !c.passed).length;

  let summary: string;
  if (score >= 85) {
    summary = `✅ 评审优秀（${score}分）— ${passedCount} 项通过，无重大问题。`;
  } else if (score >= 70) {
    summary = `👍 评审良好（${score}分）— ${passedCount} 项通过，${warningCount} 项需关注。`;
  } else if (score >= 50) {
    summary = `⚡ 评审及格（${score}分）— ${passedCount} 项通过，${warningCount} 项警告，建议微调。`;
  } else {
    summary = `⚠️ 评审偏低（${score}分）— ${criticalCount} 项严重问题，建议重新生成或大幅调整。`;
  }

  return { score, acceptable, checks, summary };
}
