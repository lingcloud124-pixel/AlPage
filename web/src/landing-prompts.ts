export interface LandingPromptPreset {
  label?: string;
  prompt: string;
  primaryHint?: string;
}

export interface LandingPromptEntry {
  label: string;
  prompt: string;
  primaryHint?: string;
}

export const DEFAULT_LANDING_PROMPT_ENTRIES: LandingPromptEntry[] = [
  {
    label: '做一套春节氛围主题，热闹一点',
    prompt: '萌系3D卡通风格，营造新年喜庆且温馨的视觉氛围。大透视构图，极低的仰视角度，超广角镜头拍摄的人物，呈现狮子头与镜头互动，画面以巨大狮子头主导视觉，主体是一个穿着华丽的传统服装的舞狮福娃一跃而起，将狮子头抛向镜头，表情开心。狮子头极度靠近镜头（占据画面2/3以上），人物在画面中后方较小，形成强烈的大小对比和视觉冲击力。以正红色为背景，人物周围悬浮着金币和金元宝和红包，增加了画面的艺术效果和动感，整体色调以暖红、暖黄为主，营造出热闹喜庆的春节聚餐氛围，细节丰富，光影温暖。突出鱼眼镜头效果，夸张的透视比例关系。采用 3D渲染风格，类似皮克斯动画质感，画面左面有金色艺术字体"Happy New Year"，搭配祥云元素装饰。和金色"HAPPY CHINESE NEW YEAR" 小字。16:9，1080P。',
    primaryHint: '#C90808',
  },
  {
    label: '生成一套科技感企业门户皮肤',
    prompt: '主色神空蓝，未来感 流动彩带光束带 由远到近环绕 背景模糊的光晕 4K超高清细节。16:9，1080P。',
    primaryHint: '#0E50D6',
  },
  {
    label: '想要一个高级蓝色商务主题',
    prompt: '流畅极少蓝白色渐变小笔刷发光在变换、空间感，光线追踪，浩渺感，孤独感，全景视角，透白渐变背景，流光溢彩，C4d建模。16:9，1080P。',
    primaryHint: '#138AEB',
  },
  {
    label: '来一套国风政务风格主题包',
    prompt: '创作一幅大气简约的国风国庆主题海报，采用纵向构图，背景为红橙渐变的暖色调，带有细腻的光影层次以营造喜庆氛围。画面中景呈现被暖光笼罩的古代风格古典宫殿建筑；背景是朦胧的金色山水轮廓，天空点缀着绽放的烟花；前景有一条蜿蜒的金色光带（似河流或道路）向宫殿延伸，增强空间纵深感；整体风格融合国风意境与现代光影设计，既显庄重又具热烈的国庆庆典感。16:9，1080P。',
    primaryHint: '#DA0404',
  },
];

export const LEGACY_LANDING_PROMPTS: Record<string, LandingPromptPreset> = {
  '做一套春节氛围主题，热闹一点': {
    prompt: '萌系3D卡通风格，营造新年喜庆且温馨的视觉氛围。大透视构图，极低的仰视角度，超广角镜头拍摄的人物，呈现狮子头与镜头互动，画面以巨大狮子头主导视觉，主体是一个穿着华丽的传统服装的舞狮福娃一跃而起，将狮子头抛向镜头，表情开心。狮子头极度靠近镜头（占据画面2/3以上），人物在画面中后方较小，形成强烈的大小对比和视觉冲击力。以正红色为背景，人物周围悬浮着金币和金元宝和红包，增加了画面的艺术效果和动感，整体色调以暖红、暖黄为主，营造出热闹喜庆的春节聚餐氛围，细节丰富，光影温暖。突出鱼眼镜头效果，夸张的透视比例关系。采用 3D渲染风格，类似皮克斯动画质感，画面左面有金色艺术字体"Happy New Year"，搭配祥云元素装饰。和金色"HAPPY CHINESE NEW YEAR" 小字。16:9，1080P。',
    primaryHint: '#C90808',
  },
  '生成一套科技感企业门户皮肤': {
    prompt: '主色神空蓝，未来感 流动彩带光束带 由远到近环绕 背景模糊的光晕 4K超高清细节。16:9，1080P。',
    primaryHint: '#0E50D6',
  },
  '想要一个高级蓝色商务主题': {
    prompt: '流畅极少蓝白色渐变小笔刷发光在变换、空间感，光线追踪，浩渺感，孤独感，全景视角，透白渐变背景，流光溢彩，C4d建模。16:9，1080P。',
    primaryHint: '#138AEB',
  },
  '来一套国风政务风格主题包': {
    prompt: '创作一幅大气简约的国风国庆主题海报，采用纵向构图，背景为红橙渐变的暖色调，带有细腻的光影层次以营造喜庆氛围。画面中景呈现被暖光笼罩的古代风格古典宫殿建筑；背景是朦胧的金色山水轮廓，天空点缀着绽放的烟花；前景有一条蜿蜒的金色光带（似河流或道路）向宫殿延伸，增强空间纵深感；整体风格融合国风意境与现代光影设计，既显庄重又具热烈的国庆庆典感。16:9，1080P。',
    primaryHint: '#DA0404',
  },
  '做一个绿色生态办公主题': {
    prompt: '月球表面，未来感太空站矗立，金属质感建筑线条流畅，内部全息投影显示量子计算数据，智能机器人在通道穿梭。太空种植区绿意盎然，能源循环系统高效运转，充满科技与生活融合的未来感。16:9，1080P。',
    primaryHint: '#14981F',
  },
  '生成新能源行业办公主题': {
    prompt: '高科技，蓝白色为主色，绿色点缀，玻璃透明质感，虚拟电厂场景图，主要建筑为火电厂房、烟囱、冷凝塔，风力发电机、光伏板绿树，高分辨率，16:9，1080P。',
    primaryHint: '#0CAC8E',
  },
  '需要一个 AI 未来科技风格主题': {
    prompt: '未来科技感kv背景，天空蓝色渐变，画面面左侧是一个由光线构成的智能科技"AI"立体字体，周围环绕着适当数据洪流，有公路的元素，背景中夹杂着代表人工智能的二进制代码图案，画面核心是适用于Al技术发布会，8K分辨率，高级感，OC渲染，Blender，C4D，超清，中心构图，大师级配色，穿插蓝紫色配色。16:9，1080P。',
    primaryHint: '#2C19B9',
  },
  '生成一套金融行业办公主题': {
    prompt: '科技感背景设计，矢量风格，数字化，文字信息位于画面左侧：左侧主体为一个悬浮蓝金渐变半透明发光的环形仪表盘造型的科技感金融数据结构，由多个蓝金半透明渐变方块组合而成的 K 线与交易链路复杂结构，蓝金渐变主色调，金色光线和小型数据币形方块围绕金融结构，科技光效、光线、光泽，背景是简单的蓝金渐变光轨曲线夹杂动态粒子且投映出蓝金渐变光，整体画面动感流畅，光影层次丰富，蓝金调为主，营造出专业、安全、高端、创新的金融科技氛围。16:9，1080P。',
    primaryHint: '#9E7A37',
  },
};

let _cachedEntries: LandingPromptEntry[] | null = null;
let _cachedEnabled: boolean | null = null;

async function fetchServerLandingPrompts(): Promise<{ entries: LandingPromptEntry[] | null; enabled: boolean }> {
  try {
    const res = await fetch('/api/landing-prompts-config');
    if (!res.ok) return { entries: null, enabled: true };
    const data = await res.json();
    const rawEntries = data.entries;
    const enabled = data.enabled !== false;
    if (!Array.isArray(rawEntries) || rawEntries.length === 0) return { entries: null, enabled };
    const entries = rawEntries.filter(
      (e: any) => e && typeof e.label === 'string' && e.label.trim() && typeof e.prompt === 'string' && e.prompt.trim()
    ).map((e: any) => ({
      label: e.label.trim(),
      prompt: e.prompt.trim(),
      primaryHint: typeof e.primaryHint === 'string' ? e.primaryHint.trim() : '',
    }));
    return { entries, enabled };
  } catch {
    return { entries: null, enabled: true };
  }
}

export async function getLandingPromptEntriesAsync(): Promise<LandingPromptEntry[]> {
  if (_cachedEntries) return _cachedEntries.map((e) => ({ ...e }));
  const { entries } = await fetchServerLandingPrompts();
  _cachedEntries = entries ?? DEFAULT_LANDING_PROMPT_ENTRIES;
  return _cachedEntries.map((e) => ({ ...e }));
}

export async function isLandingPromptsEnabledAsync(): Promise<boolean> {
  if (_cachedEnabled !== null) return _cachedEnabled;
  const { enabled } = await fetchServerLandingPrompts();
  _cachedEnabled = enabled;
  return enabled;
}

export function getLandingPromptEntries(): LandingPromptEntry[] {
  return (_cachedEntries ?? DEFAULT_LANDING_PROMPT_ENTRIES).map((e) => ({ ...e }));
}

export function getDefaultLandingPromptEntries(): LandingPromptEntry[] {
  return DEFAULT_LANDING_PROMPT_ENTRIES.map((e) => ({ ...e }));
}

export function renderLandingPromptButtons(container: HTMLElement): void {
  container.innerHTML = '';
  for (const entry of getLandingPromptEntries()) {
    const button = document.createElement('button');
    button.className = 'landing-starter-pill theme-btn landing-prompt-trigger';
    button.dataset.prompt = entry.label;
    button.textContent = entry.label;
    container.appendChild(button);
  }
}

export async function renderLandingPromptButtonsAsync(container: HTMLElement): Promise<void> {
  const section = container.closest('.landing-section') as HTMLElement | null;
  const enabled = await isLandingPromptsEnabledAsync();

  if (!enabled) {
    if (section) section.style.display = 'none';
    return;
  }
  if (section) section.style.display = '';

  renderLandingPromptButtons(container);
  const entries = await getLandingPromptEntriesAsync();
  container.innerHTML = '';
  for (const entry of entries) {
    const button = document.createElement('button');
    button.className = 'landing-starter-pill theme-btn landing-prompt-trigger';
    button.dataset.prompt = entry.label;
    button.textContent = entry.label;
    container.appendChild(button);
  }
}

export function resolveLegacyLandingPrompt(labelOrPrompt: string): string {
  return resolveLegacyLandingPreset(labelOrPrompt).prompt ?? labelOrPrompt;
}

export function resolveLegacyLandingPreset(labelOrPrompt: string): LandingPromptPreset {
  const entries = _cachedEntries ?? DEFAULT_LANDING_PROMPT_ENTRIES;
  const customEntry = entries.find((entry) => entry.label === labelOrPrompt);
  if (customEntry) {
    return {
      label: customEntry.label,
      prompt: customEntry.prompt,
      primaryHint: customEntry.primaryHint,
    };
  }
  const preset = LEGACY_LANDING_PROMPTS[labelOrPrompt];
  return preset ?? { prompt: labelOrPrompt };
}
