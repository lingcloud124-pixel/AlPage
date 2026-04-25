export interface CompositionStrategy {
  visualGravity: string;
  elementDistribution: string;
  compositionTechnique: string[];
  backgroundTreatment: string[];
  rightSideFill: string[];
}

export interface RenderPriority {
  rule: string;
  description: string;
}

export interface StyleVocabCategory {
  label: string;
  words: string[];
}

export interface FestivalScenePreset {
  id: string;
  festival: string;
  styleName: string;
  descriptionCN: string;
  descriptionEN: string;
}

export interface DomainScenePreset {
  id: string;
  domain: string;
  subType: string;
  styleName: string;
  descriptionCN: string;
  descriptionEN: string;
}

export const COMPOSITION_STRATEGY: CompositionStrategy = {
  visualGravity: 'The core subject must be positioned in the left or left-center area of the frame, creating a natural visual anchor.',
  elementDistribution: 'Secondary elements such as light rays, foliage, or water currents may extend naturally into the right side, maintaining visual continuity.',
  compositionTechnique: [
    'rule of thirds composition',
    'shallow depth of field',
    'diagonal leading lines',
    'layered foreground-midground-background',
  ],
  backgroundTreatment: [
    'softly blurred distant contours',
    'defocused bokeh shapes',
    'atmospheric perspective haze',
    'gentle luminous halos',
    'wisps of mist or vapor',
  ],
  rightSideFill: [
    'the right side gently fading into open soft space with blurred natural elements',
    'background layers softly dissolving into atmospheric haze on the right',
    'right portion showing soft bokeh and gentle light diffusion',
  ],
};

export const RENDER_PRIORITY: RenderPriority = {
  rule: 'The foreground layer with the core subject receives maximum rendering detail. Midground elements are moderately detailed. Background elements are softly rendered. No two elements across layers should share the same level of sharpness.',
  description: 'Descending detail priority: foreground subject > midground supporting > background atmosphere',
};

export const STYLE_VOCABULARY: Record<string, StyleVocabCategory> = {
  paintingMedia: {
    label: '绘画媒介',
    words: ['watercolor', 'oil painting', 'sketch', 'ink wash', 'hand-painted', 'impasto', 'line art', 'doodle', 'collage'],
  },
  twoDStyle: {
    label: '二维风格',
    words: ['cartoon', 'anime', 'manga', 'chibi', 'cel-shaded', 'picture book style', 'pixel art', 'flat design', 'minimalist', 'sticker style', 'decorative art', 'pop art', 'memphis', 'acid design', 'glassmorphism'],
  },
  threeDStyle: {
    label: '3D/CG',
    words: ['3D render', 'C4D style', 'Blender render', 'clay style', 'designer toy 3D', 'Pixar style', 'Moebius style', 'pure 3D'],
  },
  photographic: {
    label: '写实/摄影',
    words: ['photorealistic', 'film grain', 'cinematic', 'photography', 'portrait style'],
  },
  historicalArt: {
    label: '历史/艺术流派',
    words: ['gothic', 'baroque', 'rococo', 'vintage retro', 'vaporwave'],
  },
  regional: {
    label: '地域风格',
    words: ['Chinese style', 'guochao', 'Japanese style', 'Korean style', 'American style', 'European style', 'Nordic', 'industrial'],
  },
  futuristic: {
    label: '未来/幻想',
    words: ['cyberpunk', 'sci-fi', 'steampunk', 'virtual reality'],
  },
  professional: {
    label: '专业领域',
    words: ['concept art', 'concept design', 'game art', 'blind box toy', 'illustration'],
  },
  contemporary: {
    label: '当代艺术',
    words: ['glitch art', 'minimalist light and shadow', 'neo-brutalism', 'diffused light effect'],
  },
};

export const ENHANCEMENT_PHRASES = {
  composition: [
    'perfect visual balance',
    'cinematic wide composition',
    'rich layered depth',
    'harmonious interplay of sharp and soft focus',
  ],
  color: [
    'refined color harmony',
    'sophisticated tonal palette',
    'elegant color transitions',
  ],
  light: [
    'golden hour warm light',
    'soft diffused daylight',
    'atmospheric volumetric lighting',
    'gentle rim light outlining the subject',
  ],
  texture: [
    'fine surface textures',
    'subtle material grain',
    'visible brush stroke quality',
    'photographic material realism',
  ],
};

export const FESTIVAL_PRESETS: FestivalScenePreset[] = [
  {
    id: 'qingming-nature',
    festival: 'qingming-fest',
    styleName: '自然意境',
    descriptionCN: '细密的春雨斜织于画面左侧，雨丝如银线般轻盈透亮，嫩绿的柳芽缀满枝头，柳絮随风轻扬飘散于朦胧田野之间',
    descriptionEN: 'Fine spring rain slanting across the left of the frame like silvery threads, tender green willow buds covering the branches, catkins drifting gently through the misty fields, the right side softly dissolving into hazy atmosphere',
  },
  {
    id: 'qingming-ink',
    festival: 'qingming-fest',
    styleName: '水墨风格',
    descriptionCN: '一株苍劲的垂柳立于中景，树干以浓墨皴擦质感苍老，柳条如翠帘低垂，淡墨远山轮廓在湿润的空气中若隐若现',
    descriptionEN: 'A weathered weeping willow standing in the midground, trunk rendered with bold ink-wash strokes, willow tendrils cascading like a jade curtain, distant mountain silhouettes faintly visible through moist air',
  },
  {
    id: 'spring-fest-chinese',
    festival: 'spring-festival',
    styleName: '中式美学',
    descriptionCN: '朱红宫灯高悬于画面上方，金色流苏垂坠，暖光映亮下方的青花瓷桌与剪纸窗花，墨色春联笔触苍劲，飞白处透出宣纸底色',
    descriptionEN: 'Vermilion palace lanterns suspended from above with golden tassels, warm glow illuminating blue-and-white porcelain and paper-cut window decorations below, bold calligraphy couplets with expressive brush strokes revealing rice paper texture',
  },
  {
    id: 'spring-fest-modern',
    festival: 'spring-festival',
    styleName: '现代中式',
    descriptionCN: '几何化的灯笼造型以渐变红橙色呈现，背景弥散光效与金属质感的福字交相辉映，整体干净利落不失节庆温度',
    descriptionEN: 'Geometric lantern forms in gradient red-orange, diffused light effects in the background harmonizing with metallic Fu character, clean and precise yet retaining festive warmth',
  },
  {
    id: 'mid-autumn-traditional',
    festival: 'mid-autumn',
    styleName: '传统意境',
    descriptionCN: '一轮饱满的明月悬于画面左侧，月面透出温润玉色光泽，桂树婆娑剪影隐约可见，薄云从右下方袅袅升起柔化为黛色',
    descriptionEN: 'A luminous full moon hanging in the left side of the frame, jade-like warm glow on the lunar surface, graceful silhouettes of osmanthus trees, thin clouds rising gently from the lower right dissolving into soft blue-gray',
  },
  {
    id: 'mid-autumn-gongbi',
    festival: 'mid-autumn',
    styleName: '工笔重彩',
    descriptionCN: '细腻勾勒的玉兔蹲踞于月宫栏杆旁，绒毛以淡墨层层皴染，朱砂点缀的桂花瓣随风飘落，整体色调月白、鹅黄与黛蓝交织',
    descriptionEN: 'Delicately outlined jade rabbit crouching beside a moon palace railing, fur rendered in layered pale ink washes, cinnabar-tinted osmanthus petals drifting in the breeze, palette of moon-white, pale gold and indigo blue',
  },
  {
    id: 'dragon-boat-tradition',
    festival: 'dragon-boat',
    styleName: '传统文化',
    descriptionCN: '龙舟破浪前行，龙头以浓墨勾勒、金粉提亮，船身朱红与靛蓝相间，水花以留白与淡墨晕染表现飞溅之势',
    descriptionEN: 'Dragon boat prow cutting through waves, dragon head outlined in bold ink with gold powder highlights, hull in alternating vermilion and indigo, spray rendered with negative space and pale ink washes',
  },
  {
    id: 'dragon-boat-ink',
    festival: 'dragon-boat',
    styleName: '水墨风格',
    descriptionCN: '大片竹叶以枯笔焦墨挥写，粽叶青绿以湿笔点染，下方清水中倒映竹影，右上角一枚朱砂小印章点睛',
    descriptionEN: 'Expansive bamboo leaves painted with dry brush and concentrated ink, zongzi leaves in wet-brush green washes, bamboo reflections shimmering in clear water below, a small cinnabar seal stamp in the upper right as accent',
  },
  {
    id: 'national-day-grand',
    festival: 'national-day',
    styleName: '盛大庆典',
    descriptionCN: '金色华表矗立于画面左侧，红旗飘扬形成对角线构图，暖色光晕从右上方倾泻而下，远山轮廓在薄雾中庄严隐现',
    descriptionEN: 'A golden Huabiao column standing on the left, red flags fluttering in a diagonal composition, warm light halo pouring from the upper right, distant mountain silhouettes solemnly emerging through thin mist',
  },
  {
    id: 'national-day-modern',
    festival: 'national-day',
    styleName: '现代风格',
    descriptionCN: '城市天际线以简洁几何形体表现，玻璃幕墙反射出金色晨光，整体色调明快，线条利落，充满活力与希望',
    descriptionEN: 'City skyline rendered in clean geometric forms, glass facades reflecting golden morning light, bright and crisp color palette, sharp lines conveying vitality and hope',
  },
  {
    id: 'lantern-fest-lights',
    festival: 'lantern-fest',
    styleName: '灯火阑珊',
    descriptionCN: '各式花灯错落悬挂于街巷两侧，暖光映照青石板路，远处人影模糊，整体色调暖橘与靛蓝对比，营造热闹中的静谧',
    descriptionEN: 'Various festive lanterns hanging along both sides of the street, warm light reflecting on cobblestone paths, distant figures blurred, warm orange contrasting with indigo blue, creating tranquility within festivity',
  },
  {
    id: 'lantern-fest-illustration',
    festival: 'lantern-fest',
    styleName: '传统插画',
    descriptionCN: '走马灯上绘有精致人物故事，灯影投射在白色绢面上，旁边一枝梅花探入画面，淡粉色花瓣点缀夜色',
    descriptionEN: 'A revolving scenic lantern with delicate painted figures, lantern shadows cast on white silk, a plum blossom branch reaching into the frame, pale pink petals dotting the night',
  },
  {
    id: 'qixi-romantic',
    festival: 'qixi',
    styleName: '浪漫风格',
    descriptionCN: '银河以淡蓝与银色渐变横贯夜空，牵牛织女隔河相望，鹊桥以细密的白色光点组成，整体画面柔和朦胧，星光闪烁',
    descriptionEN: 'The Milky Way in pale blue and silver gradient spanning the night sky, two lovers gazing across the celestial river, a magpie bridge formed by delicate white light points, soft dreamy atmosphere with twinkling stars',
  },
  {
    id: 'double-ninth-nature',
    festival: 'double-ninth',
    styleName: '自然意境',
    descriptionCN: '金黄的菊花丛占据前景，花瓣层层叠叠，背景虚化的远山笼罩在秋日薄雾中，暖橙色调渲染出登高望远的辽阔感',
    descriptionEN: 'Golden chrysanthemum clusters filling the foreground, petals layered in rich detail, distant mountains softly blurred in autumn mist, warm orange tones evoking the expansive feeling of ascending heights',
  },
  {
    id: 'winter-solstice-warm',
    festival: 'winter-solstice',
    styleName: '温暖风格',
    descriptionCN: '热气腾腾的饺子摆放在青花瓷盘中，背景虚化的窗玻璃上凝结着冰花，暖黄色灯光从右上方洒落，营造家的温暖',
    descriptionEN: 'Steaming dumplings arranged on a blue-and-white porcelain plate, frosted window glass softly blurred in the background, warm yellow lamplight spilling from the upper right, evoking the warmth of home',
  },
  {
    id: 'new-year-modern',
    festival: 'new-year',
    styleName: '现代简约',
    descriptionCN: '纯白背景上，金色线条勾勒出日出轮廓，下方城市剪影以深灰呈现，整体干净明快，充满新的开始的希望感',
    descriptionEN: 'On a pure white background, golden lines outlining a sunrise, city silhouette below in deep gray, clean and bright overall, filled with the hope of new beginnings',
  },
];

export const DOMAIN_PRESETS: DomainScenePreset[] = [
  {
    id: 'nature-forest-sunlit',
    domain: 'nature',
    subType: 'forest',
    styleName: '阳光穿透',
    descriptionCN: '阳光透过层层叠叠的树叶洒下斑驳光斑，苔藓覆盖的树干上攀附着蕨类植物，空气中漂浮着细微的水汽与花粉',
    descriptionEN: 'Sunlight filtering through layered canopy casting dappled light spots, moss-covered trunks with clinging ferns, fine moisture and pollen drifting in the air',
  },
  {
    id: 'nature-forest-dawn-mist',
    domain: 'nature',
    subType: 'forest',
    styleName: '清晨薄雾',
    descriptionCN: '淡蓝色的晨雾在林间缓缓流动，树干下半部分隐没在雾中，阳光从树冠缝隙中投射出几道清晰的光柱',
    descriptionEN: 'Pale blue morning mist flowing gently through the forest, lower trunks submerged in fog, sunlight projecting clear light shafts through canopy gaps',
  },
  {
    id: 'nature-coastal-sunset',
    domain: 'nature',
    subType: 'coastal',
    styleName: '海边日落',
    descriptionCN: '夕阳以暖橘与玫红渐变沉入海平线，海浪边缘泛起金色碎光，沙滩上的脚印被潮水半淹没，拖出细长的倒影',
    descriptionEN: 'Sunset sinking into the horizon in warm orange and rose gradient, golden shimmering light along wave edges, footprints on sand half-submerged by tide with elongated reflections',
  },
  {
    id: 'nature-summer-lotus',
    domain: 'nature',
    subType: 'summer-cool',
    styleName: '池塘荷花',
    descriptionCN: '碧绿的荷叶铺满水面，粉白相间的荷花亭亭玉立，水珠在叶面上晶莹剔透，蜻蜓停在花苞尖端，整体清新凉爽',
    descriptionEN: 'Emerald lotus leaves spreading across the water surface, pink-white lotus flowers standing elegantly, crystal dewdrops on leaf surfaces, a dragonfly resting on a bud tip, overall fresh and cooling atmosphere',
  },
  {
    id: 'nature-qingming-rain',
    domain: 'nature',
    subType: 'qingming',
    styleName: '春雨意境',
    descriptionCN: '细密的雨丝斜织于画面左侧，几只燕子掠过雨幕，尾翼带起细碎水雾，中景青绿田野层层虚化，远山轮廓如淡墨晕染',
    descriptionEN: 'Fine rain threads weaving diagonally across the left frame, swallows skimming through the rain curtain, tail feathers trailing fine mist, green fields in the midground gradually softening, distant mountains like pale ink wash',
  },
  {
    id: 'nature-macro',
    domain: 'nature',
    subType: 'nature-generic',
    styleName: '微距自然',
    descriptionCN: '一片叶子的脉络以极高的清晰度呈现，叶面上凝结的露珠折射出周围环境的倒影，背景完全虚化为柔和的绿色光斑',
    descriptionEN: 'A single leaf vein network in extreme clarity, condensed dewdrops on the surface refracting reflections of the surroundings, background completely dissolved into soft green bokeh',
  },
  {
    id: 'corporate-modern-clean',
    domain: 'corporate',
    subType: 'modern',
    styleName: '简洁现代',
    descriptionCN: '大面积的浅灰与白色构成背景，中央以深蓝色几何形体构建抽象的上升箭头造型，线条利落，整体干净高效',
    descriptionEN: 'Large areas of light gray and white forming the background, abstract ascending arrow shapes constructed with deep blue geometric forms in the center, crisp lines, clean and efficient overall',
  },
  {
    id: 'corporate-digital',
    domain: 'corporate',
    subType: 'digital',
    styleName: '数字化',
    descriptionCN: '半透明的数据流以蓝色光线呈现，在深色空间中交织成网络状，核心节点发出明亮光芒，科技感与连接感强烈',
    descriptionEN: 'Translucent data streams in blue light rays, interweaving into a network pattern in dark space, core nodes emitting bright light, strong sense of technology and connectivity',
  },
  {
    id: 'corporate-classic',
    domain: 'corporate',
    subType: 'traditional',
    styleName: '经典稳重',
    descriptionCN: '深胡桃木色的背景上，金色线条勾勒出建筑轮廓，整体色调深沉内敛，质感厚重，传递历史沉淀与信赖感',
    descriptionEN: 'On a deep walnut-toned background, golden lines outlining architectural silhouettes, overall palette deep and understated, heavy texture conveying heritage and trustworthiness',
  },
  {
    id: 'corporate-future-tech',
    domain: 'corporate',
    subType: 'innovation',
    styleName: '未来科技',
    descriptionCN: '悬浮的半透明球体中映射着城市天际线，周围环绕着霓虹光线，深色背景与亮色主体形成强烈对比，充满前瞻感',
    descriptionEN: 'Floating translucent spheres reflecting city skylines, surrounded by neon light traces, dark background contrasting with luminous subjects, full of forward-looking energy',
  },
  {
    id: 'corporate-creative',
    domain: 'corporate',
    subType: 'creative',
    styleName: '创意设计',
    descriptionCN: '大胆的撞色搭配，不规则的几何形体碰撞，整体活泼跳脱，打破常规传达创新精神',
    descriptionEN: 'Bold contrasting color combinations, irregular geometric forms colliding, overall lively and unconventional, breaking norms to convey innovation spirit',
  },
  {
    id: 'technology-grid',
    domain: 'technology',
    subType: 'default',
    styleName: '科技网格',
    descriptionCN: '发光的几何光带从左下前景蜿蜒而上，半透明的数据面板悬浮于中景，深蓝紫色天空下柔和网格线消隐于右侧背景，暗示创新无限',
    descriptionEN: 'Glowing geometric light ribbons curling from the lower-left foreground, translucent data panels floating in the midground, deep blue-violet sky with soft grid lines fading into the right background, suggesting boundless innovation',
  },
  {
    id: 'education-campus',
    domain: 'education',
    subType: 'default',
    styleName: '校园希望',
    descriptionCN: '前景桌上摊开的书本与钢笔，中景阳光穿透的图书馆拱廊与小径，远景明亮晨空下的校园钟楼尖顶，充满求知的希望之旅',
    descriptionEN: 'An open book and pen on a desk in the foreground, sunlit library arches and pathways in the midground, distant campus spires under bright morning sky in the background, a hopeful journey of learning',
  },
];

export const ENHANCED_NEGATIVES = [
  'no text',
  'no watermark',
  'no UI elements',
  'no signature',
  'no realistic frontal faces',
  'silhouettes only if people appear',
  'no flat white empty areas',
  'no pure solid-color blocks',
];

export const ENHANCED_COMPOSITION_PREFIX = [
  'Left-anchored focal subject in maximum detail, midground at moderate detail, background progressively defocused',
  'the right side fading into open atmospheric space with subtle bokeh or light halos',
  'cinematic wide composition with rich layered depth and perfect visual balance',
];

export function getFestivalPreset(festival: string, styleIndex: number = 0): FestivalScenePreset | undefined {
  const matches = FESTIVAL_PRESETS.filter(p => p.festival === festival);
  return matches[styleIndex % matches.length];
}

export function getFestivalPresets(festival: string): FestivalScenePreset[] {
  return FESTIVAL_PRESETS.filter(p => p.festival === festival);
}

export function getDomainPresets(domain: string, subType?: string): DomainScenePreset[] {
  return DOMAIN_PRESETS.filter(p => {
    if (p.domain !== domain) return false;
    if (subType && p.subType !== subType) return false;
    return true;
  });
}

export function pickStyleVocabulary(styleId: string): string[] {
  const mapping: Record<string, string[]> = {
    photography: STYLE_VOCABULARY.photographic.words,
    watercolor: ['watercolor', 'luminous washes', 'artistic brushwork', 'wet-on-wet technique'],
    '3D-render': STYLE_VOCABULARY.threeDStyle.words.slice(0, 4),
    illustration: STYLE_VOCABULARY.twoDStyle.words.filter(w => ['flat design', 'minimalist', 'decorative art'].includes(w)),
    abstract: ['abstract design', 'smooth gradients', 'geometric flow', 'color-field depth'],
  };
  return mapping[styleId] ?? [];
}

export function buildCompositionDirective(): string {
  const parts = [
    COMPOSITION_STRATEGY.visualGravity,
    ...COMPOSITION_STRATEGY.rightSideFill.slice(0, 1),
    `Composition techniques: ${COMPOSITION_STRATEGY.compositionTechnique.join(', ')}`,
    RENDER_PRIORITY.rule,
  ];
  return parts.join('. ');
}
