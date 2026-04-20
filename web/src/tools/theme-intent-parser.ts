export interface ThemeIntent {
  originalInput: string;
  templateType: 'light-ui' | 'dark-ui';
  category: 'festival' | 'corporate' | 'technology' | 'education' | 'nature' | 'general';
  subCategory?: string;
  styleHints: string[];
  toneHints: string[];
  colorHints: string[];
  uiUseCase: 'login' | 'desktop' | 'both';
  categoryScores: Record<'festival' | 'corporate' | 'technology' | 'education' | 'nature' | 'general', number>;
}

type ThemeCategory = ThemeIntent['category'];

const CATEGORY_RULES: Array<{
  category: Exclude<ThemeCategory, 'general'>;
  keywords: string[];
}> = [
  { category: 'festival', keywords: ['春节', '中秋', '国庆', '清明', '端午', '冬至', '元宵', '腊八', '七夕', '重阳', 'festival', 'holiday', 'celebration', 'seasonal', 'spring festival', 'chinese new year', 'lunar new year', 'cny', 'red envelope', 'lantern', '灯笼', '烟花', 'firework', '春联', '对联', '剪纸', 'paper cut', '年味', '贺岁'] },
  { category: 'technology', keywords: ['科技', '未来', 'ai', '人工智能', '数字', '互联网', 'technology', 'digital', 'futuristic', 'cyber', 'neon', 'server', 'interface', 'data'] },
  { category: 'corporate', keywords: ['企业', '品牌', '宣传', '周年', '发布', '冲刺', 'enterprise', 'corporate', 'brand', 'campaign', 'business', 'professional'] },
  { category: 'education', keywords: ['教育', '培训', '校园', '招生', '学习', 'education', 'training', 'campus', 'learning', 'school', 'academic'] },
  { category: 'nature', keywords: ['自然', '春天', '森林', '山水', '海边', '绿色', 'summer', 'spring', 'fresh', 'natural', 'leaves', 'leaf', 'water', 'ripples', 'sunlight', 'outdoor', 'breeze', 'greenery', 'landscape', 'sky', 'sea', 'forest', 'mountain', 'mint', 'airy'] },
];

function createEmptyScores(): Record<'festival' | 'corporate' | 'technology' | 'education' | 'nature' | 'general', number> {
  return {
    festival: 0,
    corporate: 0,
    technology: 0,
    education: 0,
    nature: 0,
    general: 0,
  };
}

function boost(scores: Record<'festival' | 'corporate' | 'technology' | 'education' | 'nature' | 'general', number>, category: Exclude<ThemeCategory, 'general'>, amount: number): void {
  scores[category] += amount;
}

function pickCategory(scores: Record<'festival' | 'corporate' | 'technology' | 'education' | 'nature' | 'general', number>): ThemeCategory {
  const ordered: Array<Exclude<ThemeCategory, 'general'>> = ['festival', 'nature', 'corporate', 'education', 'technology'];
  let bestCategory: ThemeCategory = 'general';
  let bestScore = 0;

  for (const category of ordered) {
    if (scores[category] > bestScore) {
      bestCategory = category;
      bestScore = scores[category];
    }
  }

  return bestScore > 0 ? bestCategory : 'general';
}

function inferSubCategory(text: string, category: ThemeCategory): string | undefined {
  const lower = text.toLowerCase();

  if (category === 'festival') {
    if (/(中秋|moon|月饼|mooncake|嫦娥|赏月)/i.test(text)) return 'mid-autumn';
    if (/(端午|dragon boat|龙舟|粽子|zongzi|qu yuan)/i.test(text)) return 'dragon-boat';
    if (/(国庆|national day|十月一)/i.test(text)) return 'national-day';
    if (/(清明|qingming|扫墓|踏青)/i.test(text)) return 'qingming-fest';
    if (/(春节|spring festival|chinese new year|lunar new year|cny|新年|过年|除夕|年味|贺岁|春联|red envelope|灯笼|lantern|firework|烟花|剪纸)/i.test(text)) return 'spring-festival';
    if (/(元宵|lantern festival|元宵节|汤圆|花灯)/i.test(text)) return 'lantern-fest';
    return 'festival-generic';
  }

  if (category !== 'nature') return undefined;

  if (/(summer|cooling|cool|water|ripples|mint|airy|clear water|breeze|fresh green)/i.test(text)) {
    return 'summer-cool';
  }
  if (/(清明|qingming|willow|mist|misty|spring drizzle|柳|烟雨)/i.test(text)) {
    return 'qingming';
  }
  if (/(coast|coastal|sea|ocean|beach|shore|海边|海岸|海风|沙滩)/i.test(text)) {
    return 'coastal';
  }
  if (/(forest|woods|mountain|mountains|trail|path|森林|山野|山林|小径)/i.test(text)) {
    return 'forest';
  }

  return 'nature-generic';
}

export function parseThemeIntent(
  rawPrompt: string,
  templateType: 'light-ui' | 'dark-ui',
): ThemeIntent {
  const text = rawPrompt.trim();
  const lower = text.toLowerCase();
  const categoryScores = createEmptyScores();

  for (const rule of CATEGORY_RULES) {
    for (const keyword of rule.keywords) {
      if (lower.includes(keyword.toLowerCase())) {
        boost(categoryScores, rule.category, keyword.length > 4 ? 2 : 1);
      }
    }
  }

  if (/(summer|spring|fresh|natural|water|ripples|leaves|sunlight|outdoor|mint|airy)/i.test(text)) {
    boost(categoryScores, 'nature', 4);
  }
  if (/(enterprise|corporate|business|professional)/i.test(text)) {
    boost(categoryScores, 'corporate', 2);
  }
  if (/(technology|digital|futuristic|server|neon|data)/i.test(text)) {
    boost(categoryScores, 'technology', 3);
  }
  if (/(spring festival|chinese new year|lunar new year|cny|春节|中秋|国庆|清明|端午|元宵|重阳|七夕|腊八|灯笼|lantern|firework|烟花|年味|贺岁|春联|剪纸|red envelope)/i.test(text)) {
    boost(categoryScores, 'festival', 10);
  }
  if (/(festive|celebrat|holiday|庆典|庆祝|节庆|佳节)/i.test(text)) {
    boost(categoryScores, 'festival', 4);
  }

  const colorHints: string[] = [];
  if (lower.includes('红') || lower.includes('red')) colorHints.push('red');
  if (lower.includes('金') || lower.includes('gold')) colorHints.push('gold');
  if (lower.includes('绿') || lower.includes('green') || lower.includes('mint')) colorHints.push('green');
  if (lower.includes('蓝') || lower.includes('blue')) colorHints.push('blue');
  if (lower.includes('紫') || lower.includes('purple')) colorHints.push('purple');
  if (lower.includes('粉') || lower.includes('pink')) colorHints.push('pink');

  const styleHints: string[] = [];
  if (lower.includes('科技') || lower.includes('technology')) styleHints.push('tech');
  if (lower.includes('写实') || lower.includes('photorealistic')) styleHints.push('photorealistic');
  if (lower.includes('极简') || lower.includes('minimal')) styleHints.push('minimal');
  if (lower.includes('高级') || lower.includes('premium')) styleHints.push('premium');
  if (lower.includes('企业') || lower.includes('corporate')) styleHints.push('corporate');

  const toneHints: string[] = [];
  if (lower.includes('温暖') || lower.includes('暖') || lower.includes('warm')) toneHints.push('warm');
  if (lower.includes('清新') || lower.includes('fresh') || lower.includes('airy')) toneHints.push('fresh');
  if (lower.includes('庄重') || lower.includes('formal')) toneHints.push('formal');
  if (lower.includes('活泼') || lower.includes('lively')) toneHints.push('lively');
  if (lower.includes('专业') || lower.includes('professional')) toneHints.push('professional');

  const category = pickCategory(categoryScores);

  return {
    originalInput: text,
    templateType,
    category,
    subCategory: inferSubCategory(text, category),
    styleHints,
    toneHints,
    colorHints,
    uiUseCase: 'login',
    categoryScores,
  };
}
