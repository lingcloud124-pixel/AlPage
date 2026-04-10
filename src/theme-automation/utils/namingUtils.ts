import { ThemePackNames } from '../types/WorkflowTypes.js';

const FESTIVAL_KEYWORDS = [
  '清明', '春节', '新年', '元宵', '端午', '中秋', '国庆', '圣诞',
  '五一', '元旦', '七夕', '重阳', '腊八', '除夕',
  '春天', '夏天', '秋天', '冬天', '春季', '夏季', '秋季', '冬季'
];

export function extractFestival(themeName: string): string {
  for (const keyword of FESTIVAL_KEYWORDS) {
    if (themeName.includes(keyword)) {
      return keyword;
    }
  }
  return '主题';
}

export function extractYear(themeName: string): number {
  const yearMatch = themeName.match(/\d{4}/);
  return yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();
}

export function generateThemePackNames(baseName: string, year?: number): ThemePackNames {
  const festival = extractFestival(baseName);
  const yearValue = year || extractYear(baseName);
  
  return {
    mk: `主题-MK-${yearValue}${festival}`,
    v12: `主题-V12-${yearValue}${festival}`,
    v13_v13_5: `主题-V13〜V13.5-${yearValue}${festival}`,
    v14_v16: `主题-V14〜V16-${yearValue}${festival}`,
    v17: `主题-V17-${yearValue}${festival}`,
    
    login_mk: `登录-MK-${yearValue}${festival}`,
    login_v12: `登录-V12-${yearValue}${festival}`,
    login_v13: `登录-V13-${yearValue}${festival}`,
    login_v13_5: `登录-V13.5-${yearValue}${festival}`,
    login_v14: `登录-V14-${yearValue}${festival}`,
    login_v15: `登录-V15-${yearValue}${festival}`,
    login_v16: `登录-V16-${yearValue}${festival}`,
    login_v17: `登录-V17-${yearValue}${festival}`,
    
    kk: `KK-${festival}-${yearValue}`
  };
}

export function parseExistingPackNames(manifestThemes: Array<{ name: string }>): ThemePackNames | null {
  const themes = manifestThemes.map(t => t.name);
  
  const mkTheme = themes.find(t => t.includes('MK') && !t.includes('登录'));
  const v12Theme = themes.find(t => t.includes('V12') && !t.includes('登录'));
  const v13Theme = themes.find(t => t.includes('V13〜V13.5') && !t.includes('登录'));
  const v14Theme = themes.find(t => t.includes('V14〜V16') && !t.includes('登录'));
  const v17Theme = themes.find(t => t.includes('V17') && !t.includes('登录') && !t.includes('V13〜V13.5'));
  
  const loginMkTheme = themes.find(t => t.includes('登录-MK'));
  const loginV12Theme = themes.find(t => t.includes('登录-V12'));
  const loginV13Theme = themes.find(t => t.includes('登录-V13') && !t.includes('V13.5'));
  const loginV13_5Theme = themes.find(t => t.includes('登录-V13.5'));
  const loginV14Theme = themes.find(t => t.includes('登录-V14'));
  const loginV15Theme = themes.find(t => t.includes('登录-V15'));
  const loginV16Theme = themes.find(t => t.includes('登录-V16'));
  const loginV17Theme = themes.find(t => t.includes('登录-V17'));
  
  const kkTheme = themes.find(t => t.includes('KK-'));
  
  if (!mkTheme || !v12Theme) {
    return null;
  }
  
  return {
    mk: mkTheme,
    v12: v12Theme || '',
    v13_v13_5: v13Theme || '',
    v14_v16: v14Theme || '',
    v17: v17Theme || '',
    login_mk: loginMkTheme || '',
    login_v12: loginV12Theme || '',
    login_v13: loginV13Theme || '',
    login_v13_5: loginV13_5Theme || '',
    login_v14: loginV14Theme || '',
    login_v15: loginV15Theme || '',
    login_v16: loginV16Theme || '',
    login_v17: loginV17Theme || '',
    kk: kkTheme || ''
  };
}

export function formatThemePackName(type: string, year: number, festival: string): string {
  const loginTypes = ['MK', 'V12', 'V13', 'V13.5', 'V14', 'V15', 'V16', 'V17'];
  
  if (type === 'KK') {
    return `KK-${festival}-${year}`;
  }
  
  if (loginTypes.includes(type) && type !== 'KK') {
    return `登录-${type}-${year}${festival}`;
  }
  
  if (type === 'V13〜V13.5' || type === 'V13-V13.5') {
    return `主题-V13〜V13.5-${year}${festival}`;
  }
  
  if (type === 'V14〜V16' || type === 'V14-V16') {
    return `主题-V14〜V16-${year}${festival}`;
  }
  
  return `主题-${type}-${year}${festival}`;
}

export function getPackType(packName: string): string {
  if (packName.includes('KK-')) {
    return 'KK';
  }
  
  if (packName.includes('登录')) {
    if (packName.includes('MK')) return 'MK';
    if (packName.includes('V12')) return 'V12';
    if (packName.includes('V13.5')) return 'V13.5';
    if (packName.includes('V13')) return 'V13';
    if (packName.includes('V14')) return 'V14';
    if (packName.includes('V15')) return 'V15';
    if (packName.includes('V16')) return 'V16';
    if (packName.includes('V17')) return 'V17';
  }
  
  if (packName.includes('主题')) {
    if (packName.includes('MK')) return 'MK';
    if (packName.includes('V12')) return 'V12';
    if (packName.includes('V13〜V13.5') || packName.includes('V13-V13.5')) return 'V13〜V13.5';
    if (packName.includes('V14〜V16') || packName.includes('V14-V16')) return 'V14〜V16';
    if (packName.includes('V17')) return 'V17';
  }
  
  return 'UNKNOWN';
}

export function isValidPackName(packName: string): boolean {
  const type = getPackType(packName);
  
  if (type === 'UNKNOWN') {
    return false;
  }
  
  const yearMatch = packName.match(/\d{4}/);
  if (!yearMatch) {
    return false;
  }
  
  return true;
}