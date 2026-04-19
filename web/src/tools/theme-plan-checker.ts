import type { ThemeScenePlan } from './theme-scene-planner';

export interface ThemePlanCheckItem {
  label: string;
  passed: boolean;
  reason?: string;
}

export interface ThemePlanCheckResult {
  passed: boolean;
  checks: ThemePlanCheckItem[];
}

function containsAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword.toLowerCase()));
}

export function checkThemeScenePlan(plan: ThemeScenePlan): ThemePlanCheckResult {
  const text = plan.sceneSentence + ' ' + plan.styleKeywords;
  const checks: ThemePlanCheckItem[] = [];

  checks.push({
    label: '明确视觉焦点',
    passed: containsAny(text, ['focal', 'anchor', 'hero', 'focus', 'clear focal point']),
    reason: '描述需要明确视觉焦点或左侧锚点。',
  });

  checks.push({
    label: '多元素与层次',
    passed: containsAny(text, ['multiple', 'layered', 'supporting', 'foreground', 'midground', 'background', 'layers', 'depth']),
    reason: '画面应包含层次感描述。',
  });

  checks.push({
    label: '右侧 UI 留白',
    passed: containsAny(text, ['right', 'transition', 'ui', 'soft']),
    reason: '必须包含右侧软过渡描述。',
  });

  checks.push({
    label: '非普通壁纸',
    passed: containsAny(text, ['enterprise', 'professional', 'product', 'corporate', 'business']),
    reason: '必须强调企业背景图属性。',
  });

  checks.push({
    label: '描述充分',
    passed: plan.sceneSentence.length > 60,
    reason: '主题描述过短，可能导致图像语义太弱。',
  });

  checks.push({
    label: '企业审美',
    passed: containsAny(text, ['enterprise', 'professional', 'premium', 'corporate', 'polished', 'refined']),
    reason: '需要体现企业级审美方向。',
  });

  checks.push({
    label: '明亮积极',
    passed: containsAny(text, ['bright', 'fresh', 'warm', 'uplifting', 'airy', 'light', 'daylight']),
    reason: '需要体现明亮积极的情绪。',
  });

  return {
    passed: checks.every((item) => item.passed),
    checks,
  };
}
