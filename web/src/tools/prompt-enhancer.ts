import qualityAnchors from '../agent/prompts/quality-anchors.json';

const THEME_HINTS: Array<{
  keywords: string[];
  scene: string;
  lighting: string;
  style: string;
  mood: string;
}> = [
  {
    keywords: ['春节', '新春', '过年', '春晚'],
    scene: 'premium enterprise OA login background featuring an elegant festive office scene with red lanterns, restrained traditional accents and a strong visual anchor on the left',
    lighting: 'warm golden light, welcoming ambient glow, layered highlights',
    style: 'architectural photography mixed with premium illustration detail',
    mood: 'festive, prosperous, professional'
  },
  {
    keywords: ['科技', '未来', '数字', '互联网', 'ai', '人工智能'],
    scene: 'premium OA login background with a clean futuristic digital environment, subtle geometry, controlled light trails and a clear left-side focal area',
    lighting: 'blue and violet neon accents, controlled contrast, cinematic highlights',
    style: 'high-end 3D render, cinematic tech visual, polished corporate design',
    mood: 'futuristic, intelligent, dynamic'
  },
  {
    keywords: ['清明', '春天', '春日', '自然', '森林', '绿色'],
    scene: 'premium enterprise login background inspired by Qingming season, with subtle willow branches, misty distant mountains, soft greenery and one clear visual anchor on the left',
    lighting: 'soft morning daylight, airy atmosphere, gentle volumetric light',
    style: 'premium landscape photography with art-directed composition',
    mood: 'fresh, calm, inspiring'
  },
  {
    keywords: ['教育', '培训', '校园', '招生'],
    scene: 'premium OA background for education and training, with bright academic architecture, subtle learning motifs and a calm left-weighted focal composition',
    lighting: 'clear daylight, soft highlights, fresh balanced exposure',
    style: 'editorial photography, modern campus branding visual',
    mood: 'trustworthy, uplifting, focused'
  },
  {
    keywords: ['企业', '品牌', '宣传', '发布', '周年', '年中冲刺'],
    scene: 'premium enterprise OA login background with modern corporate space, polished architectural depth, subtle brand-led accents and a confident left-side focal composition',
    lighting: 'professional commercial lighting, soft contrast, premium reflections',
    style: 'commercial photography, executive branding visual, premium marketing art direction',
    mood: 'professional, ambitious, credible'
  }
];

const PRODUCT_BACKGROUND_CONSTRAINTS = [
  'designed specifically for an enterprise OA login or portal background',
  'clear visual anchor on the left side',
  'large clean negative space on the right side for UI panels and form overlays',
  'not a generic wallpaper',
  'not visually cluttered',
  'foreground and background depth should support text readability',
  'composition must feel professional, restrained and product-ready',
  'avoid placing important subjects in the right-side UI area'
];

function normalizePrompt(rawPrompt: string): string {
  return rawPrompt.replace(/\s+/g, ' ').trim();
}

function detectThemeHint(userPrompt: string) {
  const normalized = userPrompt.toLowerCase();
  return THEME_HINTS.find((hint) => hint.keywords.some((keyword) => normalized.includes(keyword.toLowerCase())));
}

function looksLikeWeakPrompt(prompt: string): boolean {
  const commaCount = (prompt.match(/,/g) ?? []).length;
  return prompt.length < 90 || commaCount < 3;
}

export function enhanceThemePrompt(rawPrompt: string): {
  prompt: string;
  originalPrompt: string;
  themeHintApplied: boolean;
} {
  const originalPrompt = normalizePrompt(rawPrompt);
  const hint = detectThemeHint(originalPrompt);

  const sceneParts: string[] = [];
  if (looksLikeWeakPrompt(originalPrompt) && hint) {
    sceneParts.push(hint.scene, hint.lighting, qualityAnchors.compositionRule, hint.style, hint.mood);
  } else {
    sceneParts.push(originalPrompt);
  }

  const finalParts = [
    ...sceneParts,
    ...PRODUCT_BACKGROUND_CONSTRAINTS,
    ...qualityAnchors.qualityBoost,
    ...qualityAnchors.negativeConstraints,
  ];

  return {
    prompt: finalParts.join(', '),
    originalPrompt,
    themeHintApplied: Boolean(hint && looksLikeWeakPrompt(originalPrompt)),
  };
}
