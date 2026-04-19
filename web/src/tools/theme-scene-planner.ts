import conditionalRules from '../agent/prompts/theme-agent-conditional-rules.json';
import type { ThemeIntent } from './theme-intent-parser';
import type { CustomerVisualProfile } from './customer-visual-profile-store';

export interface ThemeScenePlan {
  sceneSentence: string;
  styleKeywords: string;
}

export interface PreferenceContext {
  customerProfile?: CustomerVisualProfile;
  projectMustHaveElements?: string[];
  projectAvoidElements?: string[];
}

export type StyleId = 'photography' | 'watercolor' | '3D-render' | 'illustration' | 'abstract';

export interface ExploratoryDirection {
  plan: ThemeScenePlan;
  styleId: StyleId;
  directionLabel: string;
  directionDescription: string;
}

const DIRECTION_TEMPLATES: Record<StyleId, {
  sentenceTemplate: string;
  styleKeywords: string;
  directionLabel: string;
  directionDescription: string;
}> = {
  photography: {
    sentenceTemplate: 'Captured as a vivid photograph: {content}, shot with shallow depth-of-field, warm golden-hour light, crisp textures and realistic materials',
    styleKeywords: 'sharp focus, realistic lighting, photographic detail, vivid color',
    directionLabel: '实景摄影',
    directionDescription: '纪实特写风格，浅景深聚焦，真实质感',
  },
  watercolor: {
    sentenceTemplate: 'Painted as a luminous watercolor: {content}, soft wet-on-wet washes with visible brush strokes, translucent color bleeding, gentle paper grain',
    styleKeywords: 'watercolor painting, luminous washes, artistic brushwork',
    directionLabel: '水彩艺术',
    directionDescription: '水彩全景风格，柔和渐变，传统艺术',
  },
  '3D-render': {
    sentenceTemplate: 'Rendered as a polished 3D scene: {content}, studio volumetric lighting, smooth materials with precise reflections, clean geometric depth',
    styleKeywords: '3D render, studio lighting, polished materials, CGI',
    directionLabel: '3D 渲染',
    directionDescription: '3D 几何风格，体积光影，现代质感',
  },
  illustration: {
    sentenceTemplate: 'Illustrated as a modern graphic: {content}, clean vector lines with bold color blocks, contemporary flat-art composition',
    styleKeywords: 'digital illustration, bold color, clean composition',
    directionLabel: '数字插画',
    directionDescription: '矢量插画风格，平涂色块，图形叙事',
  },
  abstract: {
    sentenceTemplate: 'Composed as abstract flowing shapes evoking {content}, smooth gradient ribbons and geometric forms, sophisticated color-field depth, no literal objects',
    styleKeywords: 'abstract design, smooth gradients, geometric flow',
    directionLabel: '抽象设计',
    directionDescription: '抽象几何风格，色块流动，意境表达',
  },
};

const STYLE_SELECTION_MAP: Record<string, [StyleId, StyleId, StyleId]> = {
  festival:    ['photography', '3D-render', 'watercolor'],
  corporate:   ['photography', '3D-render', 'abstract'],
  technology:  ['3D-render', 'photography', 'abstract'],
  education:   ['photography', '3D-render', 'abstract'],
  nature:      ['photography', '3D-render', 'abstract'],
  default:     ['photography', '3D-render', 'abstract'],
};

const KEYWORD_OVERRIDES: Array<{ keywords: string[]; styles: [StyleId, StyleId, StyleId] }> = [
  {
    keywords: ['运动', '团建', '体育', '健身', '跑步', 'sports', 'team', 'athletic', 'fitness'],
    styles: ['photography', '3D-render', 'abstract'],
  },
  {
    keywords: ['女性', '女神', '粉色', '温柔', '女士', 'feminine', 'pink', 'elegant'],
    styles: ['photography', '3D-render', 'watercolor'],
  },
];

function selectStylesForIntent(intent: ThemeIntent): [StyleId, StyleId, StyleId] {
  const inputText = `${intent.originalInput} ${intent.styleHints.join(' ')}`.toLowerCase();

  for (const override of KEYWORD_OVERRIDES) {
    if (override.keywords.some(keyword => inputText.includes(keyword.toLowerCase()))) {
      return override.styles;
    }
  }

  if (intent.category in STYLE_SELECTION_MAP) {
    return STYLE_SELECTION_MAP[intent.category];
  }

  return STYLE_SELECTION_MAP.default;
}

function getConditionalContentAdditions(intent: ThemeIntent): string {
  const matched = conditionalRules.rules
    .filter((rule) => {
      const haystack = [
        intent.category,
        intent.subCategory ?? '',
        intent.originalInput,
        ...intent.styleHints,
      ].join(' ').toLowerCase();
      return rule.trigger.mustMatchAny.some((token) => haystack.includes(token.toLowerCase()));
    })
    .map((rule) => rule.rule);

  return matched.length > 0 ? '. ' + matched.join('. ') : '';
}

function buildThemeContent(intent: ThemeIntent): string {
  switch (intent.category) {
    case 'festival':
      return 'lanterns and festive ornaments hanging close in the foreground, a celebratory archway with seasonal banners in the midground, distant city lights and warm sky glow in the background, a joyful scene of people gathering in silhouette';

    case 'technology':
      return 'glowing geometric light ribbons curling from the lower-left foreground, translucent data panels floating in the midground, deep blue-violet sky with soft grid lines fading into the right background, suggesting innovation';

    case 'education':
      return 'an open book stack and pen on a desk in the foreground, sunlit library arches and pathways in the midground, distant campus spires under bright morning sky in the background, a hopeful journey of learning';

    case 'nature':
      switch (intent.subCategory) {
        case 'summer-cool':
          return 'dewdrops on translucent green leaves in sharp close-up foreground, a clear stream with smooth pebbles winding through the midground, bright summer sky with soft clouds opening into the right background, cool fresh breeze';
        case 'qingming':
          return 'willow branches dripping with spring rain in the foreground, a winding path through soft green misty hills in the midground, distant mountains fading into pale sky on the right, a contemplative seasonal moment';
        case 'coastal':
          return 'smooth shoreline pebbles and sea foam in the foreground, breeze-shaped grass bending over dunes in the midground, open ocean meeting bright horizon sky on the right, refreshing coastal openness';
        case 'forest':
          return 'moss-covered roots and ferns on the forest floor in the foreground, layered tree trunks receding into misty midground depth, filtered golden sunlight breaking through the canopy, calm restorative depth';
        default:
          return 'close-up leaves and branch textures in the foreground, rolling green terrain with seasonal flowers in the midground, soft sky with gentle light opening to the right, a quiet natural story';
      }

    case 'corporate':
      return 'a polished glass sphere reflecting brand colors in the foreground, modern architectural pillars and light streaks in the midground, city skyline dissolving into soft focus on the right, conveying momentum and confidence';

    default:
      return 'a bold abstract shape with smooth surface on the left foreground, layered geometric panels receding through the midground, soft gradient wash opening into clean space on the right, professional and composed';
  }
}

function buildPreferenceModifiers(prefs: PreferenceContext): { contentSuffix: string; styleExtra: string } {
  const profile = prefs.customerProfile;
  if (!profile) return { contentSuffix: '', styleExtra: '' };

  const parts: string[] = [];
  let styleExtra = '';

  if (profile.preferredBrightness === 'bright') {
    parts.push('bright clean daylight');
  } else if (profile.preferredBrightness === 'dark') {
    parts.push('rich atmospheric depth with controlled shadows');
  }

  if (profile.preferredStyles.includes('corporate') || profile.preferredStyles.includes('professional')) {
    styleExtra = 'enterprise-grade restrained visual';
  }

  if (prefs.projectMustHaveElements && prefs.projectMustHaveElements.length > 0) {
    parts.push(`must include ${prefs.projectMustHaveElements.join(' and ')}`);
  }

  if (prefs.projectAvoidElements && prefs.projectAvoidElements.length > 0) {
    parts.push(`avoid ${prefs.projectAvoidElements.join(' and ')}`);
  }

  return {
    contentSuffix: parts.length > 0 ? ', ' + parts.join(', ') : '',
    styleExtra,
  };
}

export function buildThemeScenePlan(
  intent: ThemeIntent,
  prefs?: PreferenceContext,
): ThemeScenePlan {
  const content = buildThemeContent(intent);
  const conditional = getConditionalContentAdditions(intent);
  const prefMods = prefs ? buildPreferenceModifiers(prefs) : { contentSuffix: '', styleExtra: '' };

  const sceneSentence = content + prefMods.contentSuffix + conditional;
  const styleKeywords = 'highly detailed, professional lighting, clean composition, refined color harmony'
    + (prefMods.styleExtra ? ', ' + prefMods.styleExtra : '');

  return { sceneSentence, styleKeywords };
}

export function buildExploratoryScenePlans(
  intent: ThemeIntent,
  prefs?: PreferenceContext,
): ExploratoryDirection[] {
  const baseContent = buildThemeContent(intent);
  const conditional = getConditionalContentAdditions(intent);
  const prefMods = prefs ? buildPreferenceModifiers(prefs) : { contentSuffix: '', styleExtra: '' };
  const selectedStyles = selectStylesForIntent(intent);

  return selectedStyles.map((styleId, index) => {
    const template = DIRECTION_TEMPLATES[styleId];

    const fullContent = baseContent + prefMods.contentSuffix + conditional;
    const sceneSentence = template.sentenceTemplate.replace('{content}', fullContent);

    const styleKeywords = template.styleKeywords
      + (prefMods.styleExtra ? ', ' + prefMods.styleExtra : '');

    const plan: ThemeScenePlan = {
      sceneSentence,
      styleKeywords,
    };

    return {
      plan,
      styleId,
      directionLabel: `${String.fromCharCode(65 + index)} · ${template.directionLabel}`,
      directionDescription: template.directionDescription,
    };
  });
}
