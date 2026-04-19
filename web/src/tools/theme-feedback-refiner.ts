export interface ThemeFeedbackAdjustment {
  lighting?: string;
  composition?: string;
  style?: string;
  moodShift?: string[];
  addElements?: string[];
  removeElements?: string[];
  strengthenUiConstraint?: boolean;
  increaseVisualDensity?: boolean;
  reduceVisualDensity?: boolean;
  reinforceEnterpriseTone?: boolean;
  preferredSubCategory?: string;
}

function includesAny(text: string, tokens: string[]): boolean {
  const lower = text.toLowerCase();
  return tokens.some((token) => lower.includes(token.toLowerCase()));
}

export function parseThemeFeedback(feedback: string): ThemeFeedbackAdjustment {
  const text = feedback.trim();
  const lower = text.toLowerCase();
  const adjustment: ThemeFeedbackAdjustment = {};

  if (includesAny(lower, ['太暗', '太黑', '压抑', '阴沉', '不够亮', 'dark', 'dim'])) {
    adjustment.lighting = 'brighter, cleaner daylight with more transparent atmosphere and less oppressive contrast';
    adjustment.moodShift = [...(adjustment.moodShift ?? []), 'brighter', 'more positive'];
  }

  if (includesAny(lower, ['太空', '太空了', '太少元素', '不够丰富', '太简单', 'empty', 'sparse'])) {
    adjustment.increaseVisualDensity = true;
    adjustment.addElements = [...(adjustment.addElements ?? []), 'supporting thematic elements', 'midground depth cues', 'secondary visual accents'];
  }

  if (includesAny(lower, ['太乱', '太杂', '花', 'cluttered', 'messy'])) {
    adjustment.reduceVisualDensity = true;
    adjustment.composition = 'cleaner composition with fewer competing elements and clearer focal hierarchy';
    adjustment.removeElements = [...(adjustment.removeElements ?? []), 'unnecessary decorative clutter'];
  }

  if (includesAny(lower, ['不像企业', '不够企业', '太职业化', '不够专业', 'enterprise', 'corporate'])) {
    adjustment.reinforceEnterpriseTone = true;
    adjustment.style = 'more enterprise-ready, polished, restrained and product-usable visual direction';
  }

  if (includesAny(lower, ['太像壁纸', '像壁纸', '不像主题', '不像产品背景', 'wallpaper'])) {
    adjustment.strengthenUiConstraint = true;
    adjustment.composition = 'stronger left-side focal composition with clearer product-background structure and more intentional right-side UI reserve';
  }

  if (includesAny(lower, ['夏季感不强', '不够夏天', '不够清凉', '太像清明', 'summer feeling weak'])) {
    adjustment.preferredSubCategory = 'summer-cool';
    adjustment.addElements = [...(adjustment.addElements ?? []), 'clear water textures', 'summer breeze cues', 'translucent fresh leaves', 'bright seasonal cooling details'];
    adjustment.removeElements = [...(adjustment.removeElements ?? []), 'willow branches', 'qingming mist mountain cues'];
  }

  if (includesAny(lower, ['太像清明', '太春天', '不是清明', 'qingming'])) {
    adjustment.removeElements = [...(adjustment.removeElements ?? []), 'willow branches', 'misty qingming hills'];
  }

  if (includesAny(lower, ['主体不明显', '焦点不够', '没有重点', 'focal', 'focus'])) {
    adjustment.composition = 'clearer hero subject and stronger left-side focal hierarchy';
  }

  if (includesAny(lower, ['不要人物', '不要人', 'no people'])) {
    adjustment.removeElements = [...(adjustment.removeElements ?? []), 'people', 'human figures'];
  }

  return adjustment;
}
