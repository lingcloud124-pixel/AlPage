import type { ThemeScenePlan } from './theme-scene-planner';

export interface DirectedPromptResult {
  prompt: string;
  plan: ThemeScenePlan;
}

const HARD_NEGATIVES = 'no text, no watermark, no UI elements, no buttons, no interface, no signature, no realistic frontal faces, silhouettes only if people appear';

const COMPOSITION_PREFIX = 'A left-anchored scene with one clear focal subject in the foreground, supporting details in the midground, atmospheric depth in the background, warm bright daylight, the right side gently fading into open soft space';

export function buildDirectedPrompt(plan: ThemeScenePlan): DirectedPromptResult {
  const parts: string[] = [
    HARD_NEGATIVES,
    COMPOSITION_PREFIX,
    plan.sceneSentence,
  ];

  if (plan.styleKeywords) {
    parts.push(plan.styleKeywords);
  }

  const prompt = parts.join('. ');

  return {
    prompt,
    plan,
  };
}
