import type { ThemeFeedbackAdjustment } from './theme-feedback-refiner';
import type { CustomerVisualProfile } from './customer-visual-profile-store';
import type { ProjectVisualContext } from './project-visual-context-store';

export interface PreferenceUpdateDecision {
  customerPatch?: Partial<Omit<CustomerVisualProfile, 'customerId' | 'updatedAt'>>;
  projectPatch?: Partial<Omit<ProjectVisualContext, 'projectId' | 'updatedAt'>>;
  reasons: string[];
}

function uniquePush(base: string[], values: string[] | undefined): string[] {
  if (!values || values.length === 0) return base;
  const next = [...base];
  for (const value of values) {
    if (!next.includes(value)) next.push(value);
  }
  return next;
}

export function decidePreferenceUpdate(params: {
  adjustment: ThemeFeedbackAdjustment;
  currentCustomerProfile: CustomerVisualProfile;
  currentProjectContext: ProjectVisualContext;
}): PreferenceUpdateDecision {
  const { adjustment, currentCustomerProfile, currentProjectContext } = params;
  const reasons: string[] = [];

  const projectPatch: Partial<Omit<ProjectVisualContext, 'projectId' | 'updatedAt'>> = {};
  const customerPatch: Partial<Omit<CustomerVisualProfile, 'customerId' | 'updatedAt'>> = {};

  if (adjustment.addElements?.length || adjustment.removeElements?.length) {
    projectPatch.mustHaveElements = uniquePush(currentProjectContext.mustHaveElements, adjustment.addElements);
    projectPatch.avoidElements = uniquePush(currentProjectContext.avoidElements, adjustment.removeElements);
    reasons.push('元素增删属于当前项目上下文，写入项目短期偏好。');
  }

  if (adjustment.preferredSubCategory) {
    projectPatch.temporaryAdjustments = uniquePush(currentProjectContext.temporaryAdjustments, [
      `subCategory:${adjustment.preferredSubCategory}`,
    ]);
    reasons.push('subCategory 调整默认只作用于当前项目。');
  }

  if (adjustment.lighting || adjustment.composition || adjustment.style || adjustment.moodShift?.length) {
    const tempNotes: string[] = [];
    if (adjustment.lighting) tempNotes.push(`lighting:${adjustment.lighting}`);
    if (adjustment.composition) tempNotes.push(`composition:${adjustment.composition}`);
    if (adjustment.style) tempNotes.push(`style:${adjustment.style}`);
    if (adjustment.moodShift?.length) tempNotes.push(`mood:${adjustment.moodShift.join('|')}`);
    projectPatch.temporaryAdjustments = uniquePush(
      projectPatch.temporaryAdjustments ?? currentProjectContext.temporaryAdjustments,
      tempNotes,
    );
    reasons.push('单轮光线/构图/风格反馈默认记为项目短期调整。');
  }

  if (adjustment.reinforceEnterpriseTone) {
    customerPatch.preferredStyles = uniquePush(currentCustomerProfile.preferredStyles, ['corporate', 'professional']);
    customerPatch.preferredCompositions = uniquePush(currentCustomerProfile.preferredCompositions, ['left-anchor', 'ui-safe']);
    reasons.push('“更企业/更专业”属于较稳定的客户级倾向，可进入长期偏好。');
  }

  if (adjustment.increaseVisualDensity) {
    customerPatch.preferredCompositions = uniquePush(
      customerPatch.preferredCompositions ?? currentCustomerProfile.preferredCompositions,
      ['richer-layering'],
    );
    reasons.push('“不要太空”可作为客户更偏饱满层次的长期倾向。');
  }

  if (adjustment.reduceVisualDensity) {
    customerPatch.dislikedTraits = uniquePush(currentCustomerProfile.dislikedTraits, ['cluttered', 'messy']);
    reasons.push('“不要太乱/太杂”属于可沉淀的客户长期反感特征。');
  }

  if (adjustment.moodShift?.includes('brighter') || adjustment.moodShift?.includes('more positive')) {
    customerPatch.preferredBrightness = 'bright';
    reasons.push('明确追求更亮更积极时，可更新客户亮度偏好。');
  }

  return {
    customerPatch: Object.keys(customerPatch).length > 0 ? customerPatch : undefined,
    projectPatch: Object.keys(projectPatch).length > 0 ? projectPatch : undefined,
    reasons,
  };
}
