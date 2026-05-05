import { executeTool } from './tools/executor';
import { updateProjectVisualContext } from './tools/project-visual-context-store';
import { loadProject, saveProject } from './project-manager';
import { saveCurrentColorsToProject } from './theme-engine';
import { syncColorEditorFromTheme } from './components/color-editor';
import { resolvePreferredHueHint } from './theme/color-utils';

export interface PrimaryImageApplyResult {
  success: boolean;
  message: string;
  primaryColor?: string;
  enforcedReason?: string;
  correctedColor?: boolean;
}

function inferHueHintFromMessage(message: string, templateType: 'light-ui' | 'dark-ui'): string {
  const hint = resolvePreferredHueHint(message, templateType);
  return hint?.label ?? '';
}

export async function applyPrimaryImageToProject(args: {
  projectId: string;
  imageDataUrl: string;
  message: string;
  primaryHint?: string;
}): Promise<PrimaryImageApplyResult> {
  try {
    const project = await loadProject(args.projectId);
    if (!project) {
      return { success: false, message: '当前项目不存在，无法应用主图。' };
    }

    const preferredHueHint = args.primaryHint?.trim() || inferHueHintFromMessage(args.message, project.templateType);
    const result = await executeTool({
      tool: 'apply_selected_theme',
      args: {
        imageUrl: args.imageDataUrl,
        templateType: project.templateType,
        primaryHint: preferredHueHint,
        semanticSourceText: args.message,
      },
    });

    if (!result.success) {
      return { success: false, message: result.error ?? '主图应用失败。' };
    }

    const appliedData = (result.data ?? {}) as {
      primaryColor?: string;
      fallbackUsed?: boolean;
      enforcementReason?: string;
    };

    project.bgImageUrl = args.imageDataUrl;
    await saveProject(project);
    await saveCurrentColorsToProject();
    updateProjectVisualContext(args.projectId, {
      latestAcceptedScenePlan: undefined,
      imageInput: {
        dataUrl: args.imageDataUrl,
        role: 'primary',
        sourceText: args.message,
        explicitReason: 'primary-image-flow',
        updatedAt: Date.now(),
      },
    });
    const existingContext = project.visualContext;
    project.visualContext = existingContext
      ? {
          ...existingContext,
          imageInput: {
            dataUrl: args.imageDataUrl,
            role: 'primary',
            sourceText: args.message,
            explicitReason: 'primary-image-flow',
            updatedAt: Date.now(),
          },
        }
      : {
          projectId: args.projectId,
          mustHaveElements: [],
          avoidElements: [],
          latestAcceptedScenePlan: undefined,
          temporaryAdjustments: [],
          imageInput: {
            dataUrl: args.imageDataUrl,
            role: 'primary',
            sourceText: args.message,
            explicitReason: 'primary-image-flow',
            updatedAt: Date.now(),
          },
          updatedAt: Date.now(),
        };
    await saveProject(project);
    syncColorEditorFromTheme();

    return {
      success: true,
      message: appliedData.fallbackUsed
        ? '已按主图生成主题并自动校正颜色。'
        : '已按主图生成主题预览。',
      primaryColor: appliedData.primaryColor,
      enforcedReason: appliedData.enforcementReason,
      correctedColor: Boolean(appliedData.fallbackUsed || appliedData.enforcementReason),
    };
  } catch (error) {
    return {
      success: false,
      message: `主图处理失败：${(error as Error).message}`,
    };
  }
}
