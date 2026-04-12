/**
 * OA 主题设计 Agent 结构化知识库
 * 包含行业配色惯例、预设语义描述、页眉推荐、版本兼容性
 */

import { getWebHeaderSemantics } from '../theme/header-semantics';
import versionCompatibilityConfig from '../../../config/web-version-compatibility.json';
import headerGuidesConfig from '../../../config/web-header-guides.json';

// ============ 行业配色惯例 ============

interface IndustryColorGuide {
  keywords: string[];
  primaryHue: string;
  recommendedPresets: string[];
  avoid: string;
  description: string;
}

const INDUSTRY_MAP: IndustryColorGuide[] = [
  {
    keywords: ['金融', '银行', '证券', '保险', '基金', '投资', '财务'],
    primaryHue: '深蓝 H210-230',
    recommendedPresets: ['corporate-blue', 'interstellar'],
    avoid: '避免过于活泼的颜色（粉、亮绿）',
    description: '金融行业偏好深蓝色系，传达信任、专业、稳重',
  },
  {
    keywords: ['科技', 'AI', '互联网', '软件', 'IT', '数字化', '智能化', '信息技术'],
    primaryHue: '蓝紫 H220-270',
    recommendedPresets: ['interstellar', 'panda-night', '1024'],
    avoid: '避免过于传统的保守配色',
    description: '科技行业偏好蓝紫/深色系，传达创新、未来感',
  },
  {
    keywords: ['医疗', '健康', '医院', '医药', '生物', '制药', '诊所'],
    primaryHue: '绿色/蓝色 H140-220',
    recommendedPresets: ['dragon-boat-fresh', 'corporate-blue'],
    avoid: '避免红色（在医疗环境有警告含义）',
    description: '医疗健康行业偏好绿色/蓝色，传达安全、健康、平静',
  },
  {
    keywords: ['教育', '学校', '大学', '培训', '学院', '学习'],
    primaryHue: '蓝橙 H200-220 或 H20-40',
    recommendedPresets: ['corporate-blue', 'childrens-day'],
    avoid: '避免过于暗沉压抑的配色',
    description: '教育行业偏好蓝色或橙色，传达知识、活力、希望',
  },
  {
    keywords: ['制造', '工厂', '工业', '生产', '机械', '自动化'],
    primaryHue: '灰蓝 H200-220',
    recommendedPresets: ['corporate-blue', 'work-hard'],
    avoid: '避免过于花哨的配色',
    description: '制造业偏好灰蓝/灰色系，传达严谨、高效、专业',
  },
  {
    keywords: ['政务', '政府', '公共', '机关', '事业单位', '党建', '党员'],
    primaryHue: '红色 H0-15',
    recommendedPresets: ['national-day', 'spring-festival'],
    avoid: '避免过于活泼或不够庄重的配色',
    description: '政务行业偏好红色系，传达庄重、权威、爱国',
  },
  {
    keywords: ['零售', '电商', '商城', '购物', '消费', '超市'],
    primaryHue: '橙红 H10-40',
    recommendedPresets: ['childrens-day', 'watermelon-harvest'],
    avoid: '避免过于冷淡的配色',
    description: '零售电商偏好暖色系，传达活力、热情、购买欲',
  },
  {
    keywords: ['能源', '环保', '新能源', '电力', '石油', '碳中和', '绿色'],
    primaryHue: '绿色 H120-160',
    recommendedPresets: ['dragon-boat-fresh', 'qingming'],
    avoid: '避免与环保理念冲突的工业灰暗色',
    description: '能源环保偏好绿色系，传达自然、低碳、可持续',
  },
  {
    keywords: ['文化', '传媒', '出版', '创意', '设计', '广告', '艺术'],
    primaryHue: '多元 H灵活',
    recommendedPresets: ['cherry-blossom', 'peach-blossom', 'panda-night'],
    avoid: '避免过于保守单调的配色',
    description: '文化传媒偏好有个性的配色，传达创意、活力、多元',
  },
  {
    keywords: ['地产', '建筑', '物业', '房产', '房地产'],
    primaryHue: '金棕 H30-50',
    recommendedPresets: ['mount-tai-summit', 'happy-xishuangbanna'],
    avoid: '避免过于冷硬的配色',
    description: '地产行业偏好金棕/暖色系，传达温馨、品质、信赖',
  },
  {
    keywords: ['物流', '运输', '快递', '仓储', '供应链', '货运'],
    primaryHue: '蓝橙 H200-220 或 H20-40',
    recommendedPresets: ['corporate-blue', 'overtime-worker'],
    avoid: '避免过于花哨不实用的配色',
    description: '物流运输偏好蓝橙系，传达效率、速度、可靠',
  },
  {
    keywords: ['餐饮', '食品', '酒店', '旅游', '度假', '美食'],
    primaryHue: '暖橙红 H10-40',
    recommendedPresets: ['maldives-vacation', 'happy-xishuangbanna', 'watermelon-harvest'],
    avoid: '避免冷色系（影响食欲）',
    description: '餐饮旅游偏好暖色系，传达温暖、舒适、愉悦',
  },
];

// ============ 预设语义描述 ============

interface PresetDescription {
  id: string;
  name: string;
  tags: string[];
  templateType: 'light-ui' | 'dark-ui';
  primaryColor: string;
  scenario: string;
}

const PRESET_DESCRIPTIONS: PresetDescription[] = [
  { id: 'spring-festival', name: '春节', tags: ['春节', '新年', '红色', '喜庆', '传统', '节日', '中国'], templateType: 'light-ui', primaryColor: '#D32F2F', scenario: '中国新年/春节/传统节日' },
  { id: 'national-day', name: '国庆节', tags: ['国庆', '红色', '庄重', '爱国', '节日'], templateType: 'light-ui', primaryColor: '#C62828', scenario: '国庆节/国家庆典/庄重场合' },
  { id: 'national-day-dark', name: '国庆节(暗色)', tags: ['国庆', '红色', '暗色', '科技'], templateType: 'dark-ui', primaryColor: '#C62828', scenario: '国庆节暗色版/庄重科技风' },
  { id: 'christmas', name: '圣诞节', tags: ['圣诞', '红绿', '节日', '欢乐', '冬季'], templateType: 'light-ui', primaryColor: '#E53935', scenario: '圣诞节/冬季节日/欢乐场合' },
  { id: 'mid-autumn', name: '中秋节', tags: ['中秋', '金橙', '团圆', '月亮', '节日', '秋季'], templateType: 'light-ui', primaryColor: '#FF9800', scenario: '中秋节/秋季/团圆主题' },
  { id: 'dragon-boat', name: '端午节', tags: ['端午', '青绿', '传统', '粽子', '节日'], templateType: 'light-ui', primaryColor: '#2E7D32', scenario: '端午节/传统节日/清新主题' },
  { id: 'dragon-boat-fresh', name: '端午节-清新', tags: ['端午', '清新', '卡通', '绿色', '活泼'], templateType: 'light-ui', primaryColor: '#4CAF50', scenario: '端午节清新版/环保/自然主题' },
  { id: 'qingming', name: '清明节', tags: ['清明', '青绿', '淡雅', '春天', '自然'], templateType: 'light-ui', primaryColor: '#7BA894', scenario: '清明节/春季/淡雅主题' },
  { id: 'childrens-day', name: '儿童节', tags: ['儿童', '橙黄', '欢快', '活泼', '童趣'], templateType: 'light-ui', primaryColor: '#FF9800', scenario: '儿童节/活泼主题/欢乐场合' },
  { id: 'winter-solstice', name: '冬至', tags: ['冬至', '温暖', '冬季', '传统'], templateType: 'light-ui', primaryColor: '#FF9800', scenario: '冬至/冬季温暖主题' },
  { id: 'women-day', name: '妇女节', tags: ['妇女', '女性', '粉色', '温柔'], templateType: 'light-ui', primaryColor: '#E91E63', scenario: '妇女节/女性主题/温柔风格' },
  { id: '1024', name: '程序员节', tags: ['程序员', '科技', '代码', '蓝紫', '1024'], templateType: 'light-ui', primaryColor: '#6366F1', scenario: '程序员节/科技主题/IT文化' },
  { id: 'gaokao', name: '高考', tags: ['高考', '考试', '青春', '奋斗', '加油'], templateType: 'light-ui', primaryColor: '#FF9800', scenario: '高考/考试/加油鼓励主题' },
  { id: 'work-hard', name: '奋斗', tags: ['奋斗', '加油', '工作', '拼搏', '职场'], templateType: 'light-ui', primaryColor: '#FF6D00', scenario: '奋斗/拼搏/职场激励主题' },
  { id: '20th-anniversary', name: '二十周年', tags: ['周年', '庆典', '纪念', '金色', '庆祝'], templateType: 'light-ui', primaryColor: '#D4AF37', scenario: '公司周年/庆典/纪念活动' },
  { id: 'interstellar', name: '星际探索', tags: ['星际', '宇宙', '科幻', '星空', '深蓝紫', '探索'], templateType: 'dark-ui', primaryColor: '#1A2845', scenario: '科幻/太空/探索主题/Dark-UI科技风' },
  { id: 'panda-night', name: '熊猫夜晚', tags: ['熊猫', '夜晚', '梦幻', '星空', '紫色'], templateType: 'dark-ui', primaryColor: '#4A3F6B', scenario: '熊猫/梦幻夜景/Dark-UI可爱风' },
  { id: 'overtime-worker', name: '深夜加班', tags: ['加班', '深夜', '工作', '夜班', '深蓝灰'], templateType: 'dark-ui', primaryColor: '#2D3A4A', scenario: '深夜工作/夜班主题/Dark-UI沉稳风' },
  { id: 'corporate-blue', name: '企业蓝', tags: ['企业', '专业', '蓝色', '商务', '稳重', '办公'], templateType: 'light-ui', primaryColor: '#1565C0', scenario: '企业办公/专业商务/通用主题' },
  { id: 'cherry-blossom', name: '樱花', tags: ['樱花', '粉色', '春天', '浪漫', '清新', '日本'], templateType: 'light-ui', primaryColor: '#FFB7C5', scenario: '樱花/春天/浪漫主题' },
  { id: 'peach-blossom', name: '桃花', tags: ['桃花', '粉色', '春季', '温柔'], templateType: 'light-ui', primaryColor: '#E8B4C8', scenario: '桃花/春季/温柔主题' },
  { id: 'ice-wonderland', name: '冰雪世界', tags: ['冰雪', '冬天', '冷色', '冰蓝', '洁白'], templateType: 'light-ui', primaryColor: '#B3E5FC', scenario: '冰雪/冬季/清凉主题' },
  { id: 'maldives-vacation', name: '马尔代夫度假', tags: ['度假', '海岛', '热带', '蓝色', '放松'], templateType: 'light-ui', primaryColor: '#00BCD4', scenario: '度假/海岛/热带风情' },
  { id: 'mount-tai-summit', name: '泰山日出', tags: ['泰山', '日出', '金色', '壮观', '山', '自然'], templateType: 'light-ui', primaryColor: '#FFA726', scenario: '登山/日出/壮丽自然' },
  { id: 'happy-xishuangbanna', name: '西双版纳', tags: ['热带', '雨林', '绿色', '自然', '云南'], templateType: 'light-ui', primaryColor: '#66BB6A', scenario: '热带/雨林/绿色自然主题' },
  { id: 'sanya', name: '三亚', tags: ['三亚', '海滩', '海洋', '热带', '蓝色'], templateType: 'light-ui', primaryColor: '#00BCD4', scenario: '海滩/海洋/热带度假' },
  { id: 'summer-cool', name: '夏日清凉', tags: ['夏天', '清凉', '薄荷', '冷色', '清爽'], templateType: 'light-ui', primaryColor: '#26A69A', scenario: '夏季/清凉/薄荷主题' },
  { id: 'watermelon-harvest', name: '西瓜丰收', tags: ['西瓜', '丰收', '水果', '夏季', '红色绿色'], templateType: 'light-ui', primaryColor: '#E53935', scenario: '夏季/丰收/水果主题' },
  { id: 'yellow-duck', name: '小黄鸭', tags: ['黄色', '可爱', '童趣', '活泼'], templateType: 'light-ui', primaryColor: '#FFD600', scenario: '可爱/童趣/活泼主题' },
  { id: 'superman-superhero', name: '超级英雄', tags: ['英雄', '超人', '力量', '暖橙'], templateType: 'light-ui', primaryColor: '#BF613F', scenario: '英雄/力量/热血主题' },
  { id: 'basketball-match', name: '篮球比赛', tags: ['篮球', '运动', '竞技', '橙色'], templateType: 'light-ui', primaryColor: '#FF6D00', scenario: '篮球/运动/竞技主题' },
  { id: 'football-match', name: '足球比赛', tags: ['足球', '运动', '竞技', '绿色'], templateType: 'light-ui', primaryColor: '#2E7D32', scenario: '足球/运动/竞技主题' },
  { id: 'dark-ui-spring', name: '深色春意', tags: ['春天', '深色', '绿色', '清新', 'Dark-UI'], templateType: 'dark-ui', primaryColor: '#2C615C', scenario: '春季/Dark-UI/清新科技风' },
  { id: 'shenergy-enterprise', name: '申能企业', tags: ['企业', '定制', '申能'], templateType: 'light-ui', primaryColor: '#1565C0', scenario: '申能企业专属主题' },
  { id: 'national-day-generated', name: '国庆节(AI生成)', tags: ['国庆', '红色', 'AI生成'], templateType: 'light-ui', primaryColor: '#C62828', scenario: '国庆节AI生成变体' },
];

// ============ 页眉推荐 ============

interface HeaderGuide {
  id: string;
  name: string;
  description: string;
  suitableFor: string[];
}

const HEADER_GUIDES: HeaderGuide[] = (headerGuidesConfig as HeaderGuide[]).map((guide) => {
  const semantics = getWebHeaderSemantics()[guide.id];
  return semantics ? { ...guide, name: semantics.name } : guide;
});

// ============ 版本兼容性 ============

interface VersionInfo {
  version: string;
  supportedHeaders: string[];
  notes: string;
}

const VERSION_COMPATIBILITY: VersionInfo[] = versionCompatibilityConfig as VersionInfo[];

// ============ 搜索函数 ============

export function findMatchingPresets(description: string, templateType?: 'light-ui' | 'dark-ui'): PresetDescription[] {
  const lower = description.toLowerCase();
  const scored = PRESET_DESCRIPTIONS
    .filter(p => !templateType || p.templateType === templateType)
    .map(p => {
      const score = p.tags.reduce((acc, tag) => acc + (lower.includes(tag.toLowerCase()) ? 1 : 0), 0);
      return { preset: p, score };
    })
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, 4).map(s => s.preset);
}

export function findIndustryGuide(description: string): IndustryColorGuide | null {
  for (const guide of INDUSTRY_MAP) {
    if (guide.keywords.some(kw => description.includes(kw))) {
      return guide;
    }
  }
  return null;
}

export function getRecommendedHeaders(scenario: string): HeaderGuide[] {
  return HEADER_GUIDES.filter(h => h.suitableFor.some(s => scenario.includes(s)));
}

export function getAllPresetDescriptions(): PresetDescription[] {
  return PRESET_DESCRIPTIONS;
}

export function getHeaderGuides(): HeaderGuide[] {
  return HEADER_GUIDES;
}

export function getIndustryMap(): IndustryColorGuide[] {
  return INDUSTRY_MAP;
}

export function getVersionCompatibility(): VersionInfo[] {
  return VERSION_COMPATIBILITY;
}

export function formatKnowledgeForPrompt(context: {
  userDescription?: string;
  templateType: 'light-ui' | 'dark-ui';
}): string {
  const parts: string[] = [];

  if (context.userDescription) {
    const industry = findIndustryGuide(context.userDescription);
    if (industry) {
      parts.push(`### 行业识别: ${industry.description}`);
      parts.push(`推荐色系: ${industry.primaryHue}`);
      parts.push(`${industry.avoid}`);
      const matchingPresets = industry.recommendedPresets
        .map(id => PRESET_DESCRIPTIONS.find(p => p.id === id))
        .filter((p): p is PresetDescription => !!p && p.templateType === context.templateType);
      if (matchingPresets.length > 0) {
        parts.push(`行业推荐预设: ${matchingPresets.map(p => p.name).join('、')}`);
      }
    }

    const matchedPresets = findMatchingPresets(context.userDescription, context.templateType);
    if (matchedPresets.length > 0) {
      parts.push(`### 语义匹配预设`);
      for (const p of matchedPresets) {
        parts.push(`- ${p.name} (${p.id}): ${p.scenario}, 主色 ${p.primaryColor}`);
      }
    }
  }

  return parts.join('\n');
}
