import { getPreferenceSummary, type UserPreferences } from './user-preferences';
import { formatKnowledgeForPrompt } from './knowledge-base';
import { buildCardLibraryPromptSummary } from '../portal-agent';
import promptTemplate from './portal-agent-prompt.txt?raw';

let cachedTemplate: string | null = null;

async function loadPromptTemplate(): Promise<string> {
  if (cachedTemplate) return cachedTemplate;
  const resp = await fetch('/agent-prompts/portal-agent-prompt.txt');
  cachedTemplate = await resp.text();
  return cachedTemplate;
}

export function clearPromptCache(): void {
  cachedTemplate = null;
}

export function getSystemPrompt(context: {
  templateType: 'light-ui' | 'dark-ui';
  currentColors?: Record<string, string>;
  availablePresets: string[];
  userPreferences?: UserPreferences;
  userMessage?: string;
  cardTemplates?: import('../api/card-templates').CardTemplateListItem[];
}): string {
  const isDarkUI = context.templateType === 'dark-ui';
  const hasPrefs = context.userPreferences && (
    context.userPreferences.industry ||
    (context.userPreferences.styleKeywords && context.userPreferences.styleKeywords.length > 0) ||
    context.userPreferences.preferredTone ||
    context.userPreferences.preferredMode
  );

  const preferenceHint = hasPrefs
    ? '你已经了解该用户的偏好（见下方「用户偏好」），如果用户的新需求中没有明确说改变的方面，沿用已知偏好，但仍要优先确认本次客户信息是否完整。'
    : '用户暂无历史偏好记录，需要完整沟通客户信息。';

  const colorRules = isDarkUI ? getDarkUIColorRules() : getLightUIColorRules();

  const knowledge = formatKnowledgeForPrompt({
    userDescription: context.userMessage,
    templateType: context.templateType,
  });

  const userPrefs = context.userPreferences
    ? (() => {
        const summary = getPreferenceSummary();
        return summary
          ? `\n## 用户偏好（跨项目记忆）\n${summary}\n\n如果存在「用户偏好」信息，请主动利用这些信息优化推荐。不要重复询问用户已经提供过的行业和风格偏好。\n`
          : '';
      })()
    : '';

  const cardLibrary = context.cardTemplates
    ? buildCardLibraryPromptSummary(context.cardTemplates)
    : '';

  // Synchronous assembly — template text is inlined here as a fallback
  // but the primary path reads from the .txt file at build time.
  // For now we use the synchronous approach since chat-manager calls this synchronously.
  return buildPromptSync({
    preferenceHint,
    isDarkUI,
    templateType: context.templateType,
    currentColors: context.currentColors,
    colorRules,
    knowledge,
    userPrefs,
    cardLibrary,
  });
}

function getDarkUIColorRules(): string {
  return `**色调偏移公式**：
- Primary = 背景主色调 H
- Primary-hover = H + 26° (亮度≈85%，极浅色，L值≈214-216)
- Header-font = H + 22° (亮度≈90%，浅色文字)
- Alter-color = darken(primary, 15-20%)
- Alter-color-hover-on = darken(primaryHover, 15%)

**亮度排序**（从深到浅，必须严格遵守）：
alter(47-59) < primary(64-68) < alter-hover(97-100) < primary-hover(214-216) < header-font(180+)

**关键约束（违反任何一条即不合格）**：
1. sidebar-panel-bg 必须等于 header-font-color（同一色值）
2. primary-hover 必须是极浅色（HSL亮度214-216）
3. 文字使用浅色，背景使用深色
4. 边框使用纯灰色 #EEEEEE
5. login-bg-color 使用深色（主色或alter色）
6. 所有色值必须是有效的6位十六进制格式 #RRGGBB`;
}

function getLightUIColorRules(): string {
  return `**透明度计算**（白色混合法）：
- primary-opacity-10 = blendWhite(primary, 0.1) = 主色10% + 白色90%
- primary-opacity-20 = blendWhite(primary, 0.2) = 主色20% + 白色80%
- primary-opacity-30 = blendWhite(primary, 0.3) = 主色30% + 白色70%

**Light-UI 固化规则**：
- alter-color = darken(primary, 11%)
- primary-hover = adjust(primary, L + 8%, S + 4%)
- alter-color-hover-on = mix(#FFFFFF, primary, 62.5%)
- tlayout / portal / complex header extend = mix(#FFFFFF, primary, 5%) + 轻微暖化
- login-bg-color = mix(#FFFFFF, primary, 4%) + 轻微暖化
- sidebar-panel-bg = mix(#FFFFFF, primary, 5%) + 微暖偏移
- sidebar-icon-color = mix(#8A8A8A, primary, 20%)
- border-icon-color = mix(#D8D8D8, primary, 5%)

**亮度排序**（从浅到深，必须严格遵守）：
primary-hover(65-80%) > primary(45-60%) > alter(35-50%) > alter-hover(25-40%)

**关键约束（违反任何一条即不合格）**：
1. header-font-color 固定为深色 #333333
2. 主色应为中浅色（HSL亮度45-60%）
3. 使用白色混合计算透明度变体
4. login-bg-color 使用浅色/白色系，且不再与 header-extend 强制相等
5. sidebar-color 固定为 #000000，sidebar-icon-color 不直接等于主色
6. border-color 固定为 #D8D8D8
5. 所有色值必须是有效的6位十六进制格式 #RRGGBB`;
}

// Inlined prompt template for synchronous usage.
// The full text lives in portal-agent-prompt.txt; only the structural skeleton is here.
function buildPromptSync(parts: {
  preferenceHint: string;
  isDarkUI: boolean;
  templateType: string;
  currentColors?: Record<string, string>;
  colorRules: string;
  knowledge: string;
  userPrefs: string;
  cardLibrary: string;
}): string {
  // Import the prompt template synchronously via Vite raw import
  return PROMPT_TEMPLATE
    .replace('{{PREFERENCE_HINT}}', parts.preferenceHint)
    .replace('{{UI_MODE}}', parts.isDarkUI ? 'Dark-UI' : 'Light-UI')
    .replace('{{TEMPLATE_TYPE}}', parts.templateType)
    .replace('{{CURRENT_COLORS}}', parts.currentColors ? `当前颜色: ${JSON.stringify(parts.currentColors)}` : '无当前颜色方案')
    .replace('{{COLOR_RULES}}', parts.colorRules)
    .replace('{{CARD_LIBRARY}}', parts.cardLibrary || '')
    .replace('{{KNOWLEDGE}}', parts.knowledge ? `\n## 智能推荐（基于知识库）\n${parts.knowledge}\n` : '')
    .replace('{{USER_PREFERENCES}}', parts.userPrefs);
}

// Prompt template — raw text imported at build time via Vite ?raw suffix
// Vite serves .txt files as strings when using the ?raw query
const PROMPT_TEMPLATE: string = promptTemplate;
