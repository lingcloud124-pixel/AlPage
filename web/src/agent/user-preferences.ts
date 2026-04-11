export interface UserPreferences {
  industry?: string;
  styleKeywords?: string[];
  preferredTone?: 'warm' | 'cool' | 'neutral';
  preferredMode?: 'light-ui' | 'dark-ui';
  usedPresets?: string[];
  lastUsedPreset?: string;
  projectCount?: number;
  averageSessionLength?: number;
  firstSeen?: number;
  lastUpdated?: number;
}

const STORAGE_KEY = 'theme-studio-user-preferences';
const MAX_TRACKED_PRESETS = 20;

export function loadUserPreferences(): UserPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as UserPreferences;
  } catch {
    return {};
  }
}

export function saveUserPreferences(prefs: Partial<UserPreferences>): void {
  const current = loadUserPreferences();
  const merged: UserPreferences = {
    ...current,
    ...prefs,
    lastUpdated: Date.now(),
  };
  if (!merged.firstSeen) {
    merged.firstSeen = Date.now();
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch (e) {
    console.warn('Failed to save user preferences:', e);
  }
}

export function clearUserPreferences(): void {
  localStorage.removeItem(STORAGE_KEY);
}

const INDUSTRY_PATTERN = /(?:我在|我是|我[(（][^)）]*[)）]在|我们是|我们是一家|就职于|从事)([^\s,，。；;！!？?]{1,8}?)(?:公司|行业|领域|集团|企业|部门|机构|单位|工作室|事务所|厂|院|校|所|中心|团队|组织)?(?:公司|行业|领域|工作|就职)?/;

const INDUSTRY_SUFFIX_PATTERN = /([^\s,，。；;！!？?]{1,8}?)(?:公司|行业|领域|企业|集团|部门|机构|单位|工作室|事务所|厂|院|校|所|中心)/;

const STYLE_KEYWORDS = [
  '简约', '大气', '科技感', '活泼', '稳重', '商务', '清新', '高端',
  '低调', '年轻', '专业', '温馨', '酷炫', '典雅', '现代', '复古',
  '可爱', '严肃', '时尚', '经典', '活力', '文艺', '沉稳', '朴素',
  '奢华', '极简', '扁平', '立体', '渐变', '拟物',
];

const TONE_PATTERNS: Array<{ pattern: RegExp; tone: 'warm' | 'cool' | 'neutral' }> = [
  { pattern: /暖色|暖调|暖色系|偏暖|温暖色调/, tone: 'warm' },
  { pattern: /冷色|冷调|冷色系|偏冷|冷峻色调/, tone: 'cool' },
  { pattern: /中性色|中性调|自然色|中性色系/, tone: 'neutral' },
];

const DARK_KEYWORDS = /深色|暗色|暗黑|科技|夜间|黑暗|深色模式|暗色模式|夜间模式|深色主题|暗色主题/;
const LIGHT_KEYWORDS = /明亮|清新|浅色|白天|浅色模式|明亮模式|白天模式|浅色主题|明亮主题/;

export function extractPreferencesFromMessage(message: string): Partial<UserPreferences> | null {
  const result: Partial<UserPreferences> = {};
  let found = false;

  const industryMatch = message.match(INDUSTRY_PATTERN);
  if (industryMatch && industryMatch[1]) {
    result.industry = industryMatch[1];
    found = true;
  } else {
    const suffixMatch = message.match(INDUSTRY_SUFFIX_PATTERN);
    if (suffixMatch && suffixMatch[1]) {
      result.industry = suffixMatch[1];
      found = true;
    }
  }

  const matchedStyles: string[] = [];
  for (const kw of STYLE_KEYWORDS) {
    if (message.includes(kw)) {
      matchedStyles.push(kw);
    }
  }
  if (matchedStyles.length > 0) {
    const existing = loadUserPreferences().styleKeywords || [];
    const merged = [...new Set([...existing, ...matchedStyles])];
    result.styleKeywords = merged.slice(-15);
    found = true;
  }

  for (const { pattern, tone } of TONE_PATTERNS) {
    if (pattern.test(message)) {
      result.preferredTone = tone;
      found = true;
      break;
    }
  }

  if (DARK_KEYWORDS.test(message)) {
    result.preferredMode = 'dark-ui';
    found = true;
  } else if (LIGHT_KEYWORDS.test(message)) {
    result.preferredMode = 'light-ui';
    found = true;
  }

  return found ? result : null;
}

export function trackPresetUsage(presetId: string): void {
  const prefs = loadUserPreferences();
  const used = prefs.usedPresets || [];
  const filtered = used.filter(p => p !== presetId);
  filtered.push(presetId);
  const trimmed = filtered.slice(-MAX_TRACKED_PRESETS);
  saveUserPreferences({
    usedPresets: trimmed,
    lastUsedPreset: presetId,
  });
}

export function trackProjectCreated(): void {
  const prefs = loadUserPreferences();
  saveUserPreferences({
    projectCount: (prefs.projectCount || 0) + 1,
  });
}

export function getPreferenceSummary(): string {
  const prefs = loadUserPreferences();
  if (!prefs.industry && (!prefs.styleKeywords || prefs.styleKeywords.length === 0) && !prefs.preferredTone && !prefs.preferredMode && (!prefs.usedPresets || prefs.usedPresets.length === 0)) {
    return '';
  }

  const lines: string[] = [];
  if (prefs.industry) lines.push(`- 行业: ${prefs.industry}`);
  if (prefs.styleKeywords && prefs.styleKeywords.length > 0) {
    lines.push(`- 风格偏好: ${prefs.styleKeywords.join('、')}`);
  }
  if (prefs.preferredTone) {
    const toneMap: Record<string, string> = { warm: '暖色', cool: '冷色', neutral: '中性色' };
    lines.push(`- 色调倾向: ${toneMap[prefs.preferredTone] || prefs.preferredTone}`);
  }
  if (prefs.preferredMode) {
    const modeMap: Record<string, string> = { 'dark-ui': '深色模式', 'light-ui': '浅色模式' };
    lines.push(`- 常用模式: ${modeMap[prefs.preferredMode] || prefs.preferredMode}`);
  }
  if (prefs.usedPresets && prefs.usedPresets.length > 0) {
    const recent = prefs.usedPresets.slice(-5);
    lines.push(`- 历史使用预设: ${recent.join('、')}`);
  }
  if (prefs.projectCount && prefs.projectCount > 0) {
    lines.push(`- 使用次数: ${prefs.projectCount} 个项目`);
  }

  return lines.join('\n');
}
