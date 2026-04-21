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
      switch (intent.subCategory) {
        case 'mid-autumn':
          return 'a luminous full moon hanging low in the foreground sky, delicate osmanthus branches framing the upper left, a quiet courtyard with tea table and mooncakes in the midground, soft silver-blue moonlight washing over the right side, reunion and serenity';
        case 'dragon-boat':
          return 'a dragon boat prow cutting through water spray in the foreground, racing banners and rhythmic oars in the midground, a wide river stretching into misty distance on the right, dynamic energy and tradition';
        case 'national-day':
          return 'a fluttering flag detail close-up in the foreground, grand architectural landmarks and festive lighting in the midground, a bright open sky with soft celebration trails on the right, pride and grandeur';
        case 'qingming-fest':
          return 'cherry blossom petals falling in the foreground, a winding stone path through soft green hills in the midground, misty rain fading into pale sky on the right, gentle remembrance and renewal';
        case 'spring-festival':
          return 'red lanterns and golden tassels hanging close in the foreground, a celebratory archway with spring couplets in the midground, distant fireworks and warm sky glow in the background, joyful gathering silhouettes';
        case 'lantern-fest':
          return 'colorful paper lanterns floating in the foreground, a bustling night market with warm lights in the midground, soft bokeh lights dissolving into the right background, wonder and celebration';
        default:
          return 'lanterns and festive ornaments hanging close in the foreground, a celebratory archway with seasonal banners in the midground, distant city lights and warm sky glow in the background, a joyful scene of people gathering in silhouette';
      }

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
