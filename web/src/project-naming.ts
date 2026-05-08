type ProjectIdentity = {
  id?: string;
  nameEn?: string;
  themeName?: string;
  name?: string;
};

const DIRECT_THEME_PATTERNS: Array<{ slug: string; patterns: RegExp[] }> = [
  { slug: 'shenergy-enterprise', patterns: [/申能/u, /\bshenergy\b/i] },
  { slug: 'happy-xishuangbanna', patterns: [/西双版纳/u, /\bxishuangbanna\b/i] },
  { slug: 'maldives-vacation', patterns: [/马尔代夫/u, /\bmaldives\b/i] },
  { slug: 'mount-tai-summit', patterns: [/泰山/u, /\bmount\s*tai\b/i] },
  { slug: 'superman-superhero', patterns: [/超级英雄/u, /超人/u, /\bsuper(hero|man)\b/i] },
  { slug: 'yellow-duck', patterns: [/小黄鸭/u, /\byellow duck\b/i] },
  { slug: 'watermelon-harvest', patterns: [/西瓜/u, /\bwatermelon\b/i] },
  { slug: 'cherry-blossom', patterns: [/樱花/u, /\bcherry blossom\b/i, /\bsakura\b/i] },
  { slug: 'peach-blossom', patterns: [/桃花/u, /\bpeach blossom\b/i] },
  { slug: 'basketball-match', patterns: [/篮球/u, /\bbasketball\b/i] },
  { slug: 'football-match', patterns: [/足球/u, /\bfootball\b/i, /\bsoccer\b/i] },
  { slug: 'interstellar', patterns: [/星际/u, /宇宙/u, /太空/u, /\binterstellar\b/i, /\bspace\b/i] },
  { slug: 'ice-wonderland', patterns: [/冰雪/u, /冰川/u, /雪境/u, /\bice\b/i, /\bsnow\b/i] },
  { slug: 'panda-night', patterns: [/熊猫/u, /\bpanda\b/i] },
  { slug: 'sanya', patterns: [/三亚/u, /\bsanya\b/i] },
  { slug: 'gaokao', patterns: [/高考/u, /\bgaokao\b/i] },
  { slug: 'christmas', patterns: [/圣诞/u, /\bchristmas\b/i] },
  { slug: 'mid-autumn', patterns: [/中秋/u, /\bmid[- ]autumn\b/i, /\bmoon festival\b/i] },
  { slug: 'dragon-boat', patterns: [/端午/u, /龙舟/u, /\bdragon boat\b/i] },
  { slug: 'spring-festival', patterns: [/春节/u, /新春/u, /过年/u, /\bspring festival\b/i, /\blunar new year\b/i] },
  { slug: 'winter-solstice', patterns: [/冬至/u, /\bwinter solstice\b/i] },
  { slug: 'women-day', patterns: [/妇女节/u, /女神节/u, /\bwomen'?s day\b/i] },
  { slug: 'childrens-day', patterns: [/儿童节/u, /六一/u, /\bchildren'?s day\b/i] },
  { slug: '20th-anniversary', patterns: [/20周年/u, /二十周年/u, /\b20th anniversary\b/i] },
  { slug: '1024', patterns: [/1024/u, /程序员节/u] },
  { slug: 'qingming', patterns: [/清明/u, /\bqingming\b/i] },
  { slug: 'national-day', patterns: [/国庆/u, /\bnational day\b/i] },
  { slug: 'army-day', patterns: [/八一/u, /建军节/u, /\barmy day\b/i] },
  { slug: 'dark-ui-spring', patterns: [/暗夜春/u, /春.*暗色/u, /暗色.*春/u, /\bdark\b.*\bspring\b/i, /\bspring\b.*\bdark\b/i] },
  { slug: 'corporate-blue', patterns: [/企业蓝/u, /\bcorporate blue\b/i] },
  { slug: 'overtime-worker', patterns: [/加班/u, /夜班/u, /深夜/u, /\bovertime\b/i, /\bnight shift\b/i] },
  { slug: 'work-hard', patterns: [/奋斗/u, /拼搏/u, /加油干/u, /\bwork hard\b/i] },
];

const GENERIC_TOKEN_PATTERNS: Array<{ token: string; patterns: RegExp[] }> = [
  { token: 'dark', patterns: [/暗色/u, /深色/u, /夜景/u, /夜晚/u, /\bdark\b/i, /\bnight\b/i] },
  { token: 'light', patterns: [/亮色/u, /浅色/u, /\blight\b/i] },
  { token: 'spring', patterns: [/春/u, /\bspring\b/i] },
  { token: 'summer', patterns: [/夏/u, /\bsummer\b/i] },
  { token: 'autumn', patterns: [/秋/u, /\bautumn\b/i, /\bfall\b/i] },
  { token: 'winter', patterns: [/冬/u, /\bwinter\b/i] },
  { token: 'festival', patterns: [/节/u, /\bfestival\b/i, /\bholiday\b/i] },
  { token: 'enterprise', patterns: [/企业/u, /商务/u, /办公/u, /\benterprise\b/i, /\bcorporate\b/i] },
  { token: 'tech', patterns: [/科技/u, /\btech\b/i, /\bfuture\b/i] },
  { token: 'ocean', patterns: [/海/u, /海洋/u, /\bocean\b/i, /\bsea\b/i] },
  { token: 'mountain', patterns: [/山/u, /\bmountain\b/i] },
  { token: 'forest', patterns: [/森林/u, /林/u, /\bforest\b/i] },
  { token: 'flower', patterns: [/花/u, /\bflower\b/i, /\bblossom\b/i] },
  { token: 'blue', patterns: [/蓝/u, /\bblue\b/i] },
  { token: 'green', patterns: [/绿/u, /\bgreen\b/i] },
  { token: 'red', patterns: [/红/u, /\bred\b/i] },
  { token: 'gold', patterns: [/金/u, /\bgold(en)?\b/i] },
];

const ASCII_STOPWORDS = new Set([
  'a', 'an', 'and', 'app', 'bg', 'for', 'image', 'make', 'me', 'of', 'page',
  'please', 'style', 'theme', 'ui', 'with', 'workspace',
]);

const PINYIN_CHAR_MAP: Record<string, string> = {
  春: 'chun',
  夏: 'xia',
  秋: 'qiu',
  冬: 'dong',
  清: 'qing',
  明: 'ming',
  国: 'guo',
  庆: 'qing',
  端: 'duan',
  午: 'wu',
  中: 'zhong',
  樱: 'ying',
  花: 'hua',
  桃: 'tao',
  山: 'shan',
  海: 'hai',
  星: 'xing',
  空: 'kong',
  企: 'qi',
  业: 'ye',
  蓝: 'lan',
  红: 'hong',
  绿: 'lv',
  金: 'jin',
  熊: 'xiong',
  猫: 'mao',
  夜: 'ye',
  申: 'shen',
  能: 'neng',
  三: 'san',
  亚: 'ya',
  西: 'xi',
  双: 'shuang',
  版: 'ban',
  纳: 'na',
  泰: 'tai',
  科: 'ke',
  技: 'ji',
};

function uniq(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

export function normalizeNameEn(value: string | undefined | null): string {
  if (!value) return '';
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/['"`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 64);

  return slug;
}

function extractDirectThemeSlug(text: string): string | null {
  for (const matcher of DIRECT_THEME_PATTERNS) {
    if (matcher.patterns.some((pattern) => pattern.test(text))) {
      if (matcher.slug === 'national-day' && /暗色|深色|dark/i.test(text)) {
        return 'national-day-dark';
      }
      return matcher.slug;
    }
  }

  return null;
}

function extractGenericTokens(text: string): string[] {
  const tokens = GENERIC_TOKEN_PATTERNS
    .filter((matcher) => matcher.patterns.some((pattern) => pattern.test(text)))
    .map((matcher) => matcher.token);

  const asciiWords = (text.match(/[a-z0-9]+/gi) ?? [])
    .map((word) => word.toLowerCase())
    .filter((word) => !ASCII_STOPWORDS.has(word));

  return uniq([...tokens, ...asciiWords]).slice(0, 4);
}

function transliterateChineseText(text: string): string {
  const transliterated = (text.match(/[\u4e00-\u9fff]/gu) ?? [])
    .map((char) => PINYIN_CHAR_MAP[char] ?? '')
    .join('-');

  return normalizeNameEn(transliterated);
}

export function deriveNameEnFromText(text: string | undefined | null): string {
  const source = (text ?? '').trim();
  if (!source) return 'project';

  const directMatch = extractDirectThemeSlug(source);
  if (directMatch) return directMatch;

  const normalized = normalizeNameEn(source);
  if (normalized && /[a-z]/.test(normalized) && !/^\d+$/.test(normalized)) {
    return normalized;
  }

  const tokens = extractGenericTokens(source);
  if (tokens.length > 0) {
    return normalizeNameEn(tokens.join('-')) || 'project';
  }

  const transliterated = transliterateChineseText(source);
  return transliterated || 'project';
}

export function getProjectNameEnBase(project: ProjectIdentity): string {
  const stored = normalizeNameEn(project.nameEn);
  if (stored) {
    const prefix = project.id ? `${normalizeNameEn(project.id)}-` : '';
    return prefix && stored.startsWith(prefix) ? stored.slice(prefix.length) || 'project' : stored;
  }

  return deriveNameEnFromText(project.themeName || project.name || '');
}

function shouldIncludeProjectIdInExportSlug(projectId: string): boolean {
  if (!projectId) return false;
  if (/^\d+$/.test(projectId)) return false;
  if (/^\d+-/.test(projectId)) return false;
  return true;
}

export function buildProjectExportNameEn(project: ProjectIdentity): string {
  const base = getProjectNameEnBase(project);
  const safeBase = base && !/^\d+$/.test(base) ? base : 'project';
  const projectId = normalizeNameEn(project.id);
  if (!shouldIncludeProjectIdInExportSlug(projectId)) {
    return safeBase;
  }
  return `${projectId}-${safeBase}`;
}
