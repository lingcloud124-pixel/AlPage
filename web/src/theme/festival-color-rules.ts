export interface FestivalColorRule {
  id: string;
  aliases: RegExp[];
  primaryHint: 'red' | 'orange' | 'yellow' | 'green' | 'teal' | 'blue' | 'purple' | 'pink';
  primaryHex: string;
  accentHexes: string[];
  moodKeywords: string[];
  uiTemperament: string[];
}

export const FESTIVAL_COLOR_RULES: FestivalColorRule[] = [
  {
    id: 'new-year-day',
    aliases: [/元旦/u, /\bnew year's day\b/i, /\bnew year day\b/i],
    primaryHint: 'blue',
    primaryHex: '#1565C0',
    accentHexes: ['#C69214', '#FFFFFF', '#6A1B9A'],
    moodKeywords: ['新起点', '现代', '未来', '庆典'],
    uiTemperament: ['科技感', '现代感'],
  },
  {
    id: 'spring-festival',
    aliases: [/春节/u, /新春/u, /过年/u, /\bspring festival\b/i, /\blunar new year\b/i],
    primaryHint: 'red',
    primaryHex: '#C62828',
    accentHexes: ['#C69214', '#EF6C00'],
    moodKeywords: ['热闹', '团圆', '烟火', '喜庆'],
    uiTemperament: ['高饱和', '节庆氛围'],
  },
  {
    id: 'lantern-festival',
    aliases: [/元宵/u, /灯会/u, /花灯/u, /\blantern festival\b/i],
    primaryHint: 'red',
    primaryHex: '#C62828',
    accentHexes: ['#C69214', '#F7B731'],
    moodKeywords: ['灯会', '团圆', '灯笼'],
    uiTemperament: ['温暖', '夜景感'],
  },
  {
    id: 'valentine',
    aliases: [/情人节/u, /\bvalentine'?s day\b/i],
    primaryHint: 'pink',
    primaryHex: '#D81B60',
    accentHexes: ['#FFFFFF', '#D4B07B'],
    moodKeywords: ['浪漫', '爱意', '梦幻'],
    uiTemperament: ['柔和渐变'],
  },
  {
    id: 'women-day',
    aliases: [/妇女节/u, /女神节/u, /\bwomen'?s day\b/i],
    primaryHint: 'pink',
    primaryHex: '#C14D8A',
    accentHexes: ['#FFFFFF', '#D4B07B'],
    moodKeywords: ['优雅', '温柔', '现代女性'],
    uiTemperament: ['轻奢', '简洁'],
  },
  {
    id: 'qingming',
    aliases: [/清明/u, /\bqingming\b/i],
    primaryHint: 'green',
    primaryHex: '#5F9B78',
    accentHexes: ['#8CA0B3', '#F2ECDD'],
    moodKeywords: ['春意', '自然', '追思'],
    uiTemperament: ['低饱和', '东方感'],
  },
  {
    id: 'labour-day',
    aliases: [/劳动节/u, /五一/u, /\blabou?r day\b/i, /\bmay day\b/i],
    primaryHint: 'orange',
    primaryHex: '#D65A1F',
    accentHexes: ['#1F4E8C', '#FFFFFF'],
    moodKeywords: ['活力', '奋斗', '城市'],
    uiTemperament: ['明亮', '工业感'],
  },
  {
    id: 'youth-day',
    aliases: [/青年节/u, /\byouth day\b/i],
    primaryHint: 'blue',
    primaryHex: '#1565C0',
    accentHexes: ['#11A6B8', '#FFFFFF'],
    moodKeywords: ['青春', '未来', '科技'],
    uiTemperament: ['清爽科技风'],
  },
  {
    id: 'mother-day',
    aliases: [/母亲节/u, /\bmother'?s day\b/i],
    primaryHint: 'pink',
    primaryHex: '#B76A7F',
    accentHexes: ['#F5F1E8', '#D4B07B'],
    moodKeywords: ['温暖', '亲情', '柔和'],
    uiTemperament: ['温馨轻拟物'],
  },
  {
    id: 'childrens-day',
    aliases: [/儿童节/u, /六一/u, /\bchildren'?s day\b/i],
    primaryHint: 'yellow',
    primaryHex: '#E3A81F',
    accentHexes: ['#1565C0', '#D81B60', '#FFFFFF'],
    moodKeywords: ['快乐', '童趣', '活力'],
    uiTemperament: ['插画感', '卡通感'],
  },
  {
    id: 'father-day',
    aliases: [/父亲节/u, /\bfather'?s day\b/i],
    primaryHint: 'blue',
    primaryHex: '#274C77',
    accentHexes: ['#7A8694', '#7D5A3A'],
    moodKeywords: ['稳重', '责任', '成熟'],
    uiTemperament: ['商务简约'],
  },
  {
    id: 'dragon-boat',
    aliases: [/端午/u, /龙舟/u, /粽子/u, /\bdragon boat\b/i, /\bzongzi\b/i],
    primaryHint: 'green',
    primaryHex: '#2F6B45',
    accentHexes: ['#C69214', '#F5F1E8'],
    moodKeywords: ['东方', '传统', '自然'],
    uiTemperament: ['国风', '新中式'],
  },
  {
    id: 'qixi',
    aliases: [/七夕/u, /\bqixi\b/i],
    primaryHint: 'pink',
    primaryHex: '#A157C5',
    accentHexes: ['#274C77', '#C5CED8'],
    moodKeywords: ['浪漫', '银河', '东方爱情'],
    uiTemperament: ['梦幻渐变'],
  },
  {
    id: 'party-day',
    aliases: [/建党节/u, /\bparty day\b/i],
    primaryHint: 'red',
    primaryHex: '#C62828',
    accentHexes: ['#C69214'],
    moodKeywords: ['庄严', '历史', '荣耀'],
    uiTemperament: ['红金史诗感'],
  },
  {
    id: 'army-day',
    aliases: [/建军节/u, /\barmy day\b/i],
    primaryHint: 'green',
    primaryHex: '#4B5D3A',
    accentHexes: ['#C62828', '#C69214', '#5C6773'],
    moodKeywords: ['铁血', '力量', '荣誉'],
    uiTemperament: ['硬朗', '金属感'],
  },
  {
    id: 'teacher-day',
    aliases: [/教师节/u, /\bteacher'?s day\b/i],
    primaryHint: 'blue',
    primaryHex: '#274C77',
    accentHexes: ['#2F6B45', '#F5F1E8', '#C69214'],
    moodKeywords: ['知识', '沉稳', '书卷气'],
    uiTemperament: ['典雅商务风'],
  },
  {
    id: 'mid-autumn',
    aliases: [/中秋/u, /\bmid[- ]autumn\b/i, /\bmoon festival\b/i],
    primaryHint: 'blue',
    primaryHex: '#274C77',
    accentHexes: ['#C69214', '#F3F6FB'],
    moodKeywords: ['月夜', '团圆', '东方美学'],
    uiTemperament: ['夜景', '光影感'],
  },
  {
    id: 'national-day',
    aliases: [/国庆/u, /\bnational day\b/i],
    primaryHint: 'red',
    primaryHex: '#C62828',
    accentHexes: ['#C69214', '#D7A53A'],
    moodKeywords: ['盛大', '山河', '庆典'],
    uiTemperament: ['红金大场景'],
  },
  {
    id: 'double-eleven',
    aliases: [/双11/u, /双十一/u, /\bdouble 11\b/i, /\b11\.11\b/i],
    primaryHint: 'red',
    primaryHex: '#C62828',
    accentHexes: ['#1F2937', '#EF6C00'],
    moodKeywords: ['促销', '冲击', '速度'],
    uiTemperament: ['高对比营销风'],
  },
  {
    id: 'christmas',
    aliases: [/圣诞/u, /\bchristmas\b/i],
    primaryHint: 'red',
    primaryHex: '#B23A32',
    accentHexes: ['#2F6B45', '#C69214', '#FFFFFF'],
    moodKeywords: ['雪景', '礼物', '温暖'],
    uiTemperament: ['欧式节庆风'],
  },
  {
    id: 'new-year-eve',
    aliases: [/跨年/u, /\bnew year'?s eve\b/i, /倒计时/u],
    primaryHint: 'blue',
    primaryHex: '#274C77',
    accentHexes: ['#6A1B9A', '#C69214', '#11A6B8'],
    moodKeywords: ['烟花', '城市', '倒计时'],
    uiTemperament: ['都市未来感'],
  },
];

export function resolveFestivalColorRule(text: string | undefined): FestivalColorRule | null {
  if (!text) return null;
  const source = text.trim();
  if (!source) return null;

  for (const rule of FESTIVAL_COLOR_RULES) {
    if (rule.aliases.some((pattern) => pattern.test(source))) {
      return rule;
    }
  }

  return null;
}
