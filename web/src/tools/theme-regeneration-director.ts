import type { ThemeFeedbackAdjustment } from './theme-feedback-refiner';
import type { ThemeIntent } from './theme-intent-parser';
import { buildThemeScenePlan, type ThemeScenePlan } from './theme-scene-planner';

function appendUnique(base: string, additions: string[] | undefined): string {
  if (!additions || additions.length === 0) return base;
  const missing = additions.filter((item) => !base.toLowerCase().includes(item.toLowerCase()));
  return missing.length > 0 ? `${base}, ${missing.join(', ')}` : base;
}

function removeMention(base: string, removals: string[] | undefined): string {
  if (!removals || removals.length === 0) return base;
  let result = base;
  for (const item of removals) {
    const escaped = item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(escaped, 'ig'), '').replace(/\s+,/g, ',').replace(/,,+/g, ',').replace(/\s{2,}/g, ' ').trim();
  }
  return result.replace(/^,\s*/, '').replace(/,\s*$/, '').trim();
}

export interface ThemeRegenerationResult {
  nextIntent: ThemeIntent;
  nextScenePlan: ThemeScenePlan;
  appliedAdjustments: ThemeFeedbackAdjustment;
}

export function buildRegeneratedScenePlan(
  currentIntent: ThemeIntent,
  currentScenePlan: ThemeScenePlan,
  adjustment: ThemeFeedbackAdjustment,
): ThemeRegenerationResult {
  const nextIntent: ThemeIntent = {
    ...currentIntent,
    subCategory: adjustment.preferredSubCategory ?? currentIntent.subCategory,
  };

  let nextScenePlan = adjustment.preferredSubCategory && adjustment.preferredSubCategory !== currentIntent.subCategory
    ? buildThemeScenePlan(nextIntent)
    : { ...currentScenePlan };

  if (adjustment.lighting) {
    nextScenePlan.sceneSentence = nextScenePlan.sceneSentence + ', ' + adjustment.lighting;
  }
  if (adjustment.composition) {
    nextScenePlan.sceneSentence = nextScenePlan.sceneSentence + ', ' + adjustment.composition;
  }
  if (adjustment.style) {
    nextScenePlan.styleKeywords = nextScenePlan.styleKeywords + ', ' + adjustment.style;
  }

  nextScenePlan.sceneSentence = appendUnique(nextScenePlan.sceneSentence, adjustment.addElements);
  nextScenePlan.sceneSentence = removeMention(nextScenePlan.sceneSentence, adjustment.removeElements);

  if (adjustment.moodShift && adjustment.moodShift.length > 0) {
    nextScenePlan.sceneSentence = appendUnique(nextScenePlan.sceneSentence, adjustment.moodShift);
  }

  if (adjustment.strengthenUiConstraint) {
    nextScenePlan.sceneSentence = appendUnique(nextScenePlan.sceneSentence, [
      'stronger right-side UI reserve',
      'clear product-background structure',
    ]);
  }

  if (adjustment.increaseVisualDensity) {
    nextScenePlan.sceneSentence = appendUnique(nextScenePlan.sceneSentence, [
      'richer layered foreground and midground support elements',
    ]);
  }

  if (adjustment.reduceVisualDensity) {
    nextScenePlan.sceneSentence = appendUnique(nextScenePlan.sceneSentence, [
      'reduce competing decorative clutter',
      'preserve one dominant focal hierarchy',
    ]);
  }

  if (adjustment.reinforceEnterpriseTone) {
    nextScenePlan.styleKeywords = appendUnique(nextScenePlan.styleKeywords, [
      'enterprise-ready',
      'polished',
      'restrained',
    ]);
    nextScenePlan.sceneSentence = appendUnique(nextScenePlan.sceneSentence, ['professional', 'credible']);
  }

  return {
    nextIntent,
    nextScenePlan,
    appliedAdjustments: adjustment,
  };
}
