export type ImageIntentRole = 'primary' | 'reference';

export interface ImageIntentResult {
  role: ImageIntentRole;
  reason: string;
  matchedPhrase?: string;
}

const PRIMARY_STRONG_PHRASES = [
  '用这张图',
  '就用这个',
  '用这个图',
  '用它',
  '这张就行',
  '用这个做背景',
  '用这个生成',
  '用这个出图',
  '用这个替换',
  '按这个来',
  '把图片作为主题',
  '把这张图作为主题',
  '把这个图作为主题',
  '把图片作为背景',
  '把这张图作为背景',
  '把这个图作为背景',
  '把图片作为主视觉',
  '把这张图作为主视觉',
  '把这个图作为主视觉',
] as const;

const PRIMARY_CONTEXT_PHRASES = [
  '背景图',
  '封面图',
  '首页图',
  '主视觉',
  '主kv',
  'banner图',
  '登录页背景',
] as const;

const REFERENCE_STRONG_PHRASES = [
  '参考这张图',
  '按这个风格',
  '用这个风格',
  '像这个一样',
  '参考这个',
  '照这个做',
  '仿这个',
  '类似这个',
  '借鉴这个',
] as const;

const REFERENCE_SCENE_PHRASES = [
  '餐卡这张图',
  '这个是餐卡',
  '这个是按钮',
  '这个是图标',
  '这个是卡片',
  '这个是样式',
  '这个是布局',
  '这个是风格',
  '这个是背景风格',
] as const;

const REFERENCE_STYLE_HINTS = [
  '风格',
  '配色',
  '颜色',
  '感觉',
  '氛围',
  '样式',
  '视觉',
  '设计',
  'ui',
  '排版',
  '质感',
  '光影',
] as const;

const WEAK_IMAGE_REFERENTS = [
  '这张图',
  '这个图',
  '这个',
  '它',
  '这一张',
  '当前这张',
] as const;

const PRIMARY_ACTION_HINTS = [
  '用',
  '做',
  '替换',
  '生成',
  '出图',
  '作为背景',
  '做背景',
  '作为主题',
  '作为主视觉',
] as const;

function includesAny(input: string, phrases: readonly string[]): string | undefined {
  return phrases.find((phrase) => input.includes(phrase));
}

export function classifyImageIntent(message: string): ImageIntentResult {
  const normalized = message.trim().toLowerCase();
  if (!normalized) {
    return { role: 'reference', reason: '未提供文字描述，默认按参考图处理。' };
  }

  const primaryStrong = includesAny(normalized, PRIMARY_STRONG_PHRASES);
  if (primaryStrong) {
    return { role: 'primary', reason: '命中主图强指令词。', matchedPhrase: primaryStrong };
  }

  const primaryContext = includesAny(normalized, PRIMARY_CONTEXT_PHRASES);
  if (primaryContext) {
    return { role: 'primary', reason: '命中主图语义词，优先作为主视觉处理。', matchedPhrase: primaryContext };
  }

  const referenceStrong = includesAny(normalized, REFERENCE_STRONG_PHRASES);
  if (referenceStrong) {
    return { role: 'reference', reason: '命中参考图强指令词。', matchedPhrase: referenceStrong };
  }

  const referenceScene = includesAny(normalized, REFERENCE_SCENE_PHRASES);
  if (referenceScene) {
    return { role: 'reference', reason: '命中场景指向词，默认按参考图处理。', matchedPhrase: referenceScene };
  }

  const weakReferent = includesAny(normalized, WEAK_IMAGE_REFERENTS);
  if (weakReferent) {
    const hasPrimaryAction = PRIMARY_ACTION_HINTS.some((phrase) => normalized.includes(phrase));
    if (hasPrimaryAction) {
      return { role: 'primary', reason: '弱指代词结合执行动作，按主图处理。', matchedPhrase: weakReferent };
    }
    const hasReferenceStyleHint = REFERENCE_STYLE_HINTS.some((phrase) => normalized.includes(phrase));
    if (hasReferenceStyleHint) {
      return { role: 'reference', reason: '弱指代词结合风格描述，按参考图处理。', matchedPhrase: weakReferent };
    }
  }

  const hasReferenceStyleHint = REFERENCE_STYLE_HINTS.some((phrase) => normalized.includes(phrase));
  if (hasReferenceStyleHint) {
    return { role: 'reference', reason: '命中风格类关键词，按参考图处理。' };
  }

  return { role: 'reference', reason: '未命中主图规则，默认按参考图处理。' };
}
