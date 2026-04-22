import type { Project } from '../project-manager';

export type AssetPipelineStepId =
  | 'project-snapshot'
  | 'login-background'
  | 'header-sidebar'
  | 'icon-recolor'
  | 'thumbnails';

export type ExportAssetSourceType = 'background-image' | 'preview-html';

export interface AssetPipelineStep {
  id: AssetPipelineStepId;
  name: string;
  description: string;
}

export interface ExportAssetSnapshot {
  version: 1;
  generatedAt: string;
  project: {
    id: string;
    name: string;
    nameEn: string;
    templateType: 'light-ui' | 'dark-ui';
    selectedProducts: string[];
  };
  sourceImages: {
    background?: string;
    headerBackground?: string;
  };
  assetSources: {
    login: ExportAssetSourceType;
    headerSidebar: ExportAssetSourceType;
    thumbnails: ExportAssetSourceType;
  };
  colors: Record<string, string>;
  paths: {
    exportDir?: string;
  };
  pipeline: {
    steps: AssetPipelineStep[];
  };
}

export interface BuildExportAssetSnapshotArgs {
  project: Project;
  cssVariables: Record<string, string>;
  selectedProducts: string[];
  nameEn: string;
  exportDir?: string;
  now?: number;
}

export const DEFAULT_PIPELINE_STEPS: AssetPipelineStep[] = [
  {
    id: 'project-snapshot',
    name: '固定当前项目快照',
    description: '锁定当前项目的背景图、模板类型、产品选择和确认后的颜色变量。',
  },
  {
    id: 'login-background',
    name: '处理登录页背景素材',
    description: '优先基于当前背景图生成登录背景图、背景 PNG 和登录缩略图；未提供时回退默认背景图。',
  },
  {
    id: 'header-sidebar',
    name: '处理页眉和左侧导航素材',
    description: '按 Light/Dark 三明治规则生成页眉与左导航切图。',
  },
  {
    id: 'icon-recolor',
    name: '处理涉及主题色的图标素材',
    description: '在打包阶段对主题包内需要跟随主题色变化的 PNG 图标执行自动换色。',
  },
  {
    id: 'thumbnails',
    name: '处理封面图和缩略图素材',
    description: '生成 desktop、layout-banner、fullscreen-sideheader、fullscreen-sidenav、center-sidenav、thumb、banner_personal、study_banner 等展示素材。',
  },
];

function normalizeCssVariables(cssVariables: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(cssVariables)
      .filter(([, value]) => typeof value === 'string' && value.trim().length > 0)
      .map(([name, value]) => [name.startsWith('--') ? name.slice(2) : name, value]),
  );
}

export function buildExportAssetSnapshot(args: BuildExportAssetSnapshotArgs): ExportAssetSnapshot {
  const sourceBackground = args.project.bgImageUrl?.trim();

  return {
    version: 1,
    generatedAt: new Date(args.now ?? Date.now()).toISOString(),
    project: {
      id: args.project.id,
      name: args.project.themeName || args.project.name || '未命名主题',
      nameEn: args.nameEn,
      templateType: args.project.templateType,
      selectedProducts: [...args.selectedProducts],
    },
    sourceImages: {
      background: sourceBackground || undefined,
      headerBackground: args.project.headerBgImageUrl?.trim() || undefined,
    },
    assetSources: {
      login: 'background-image',
      headerSidebar: 'background-image',
      thumbnails: 'preview-html',
    },
    colors: normalizeCssVariables({ ...args.project.colors, ...args.cssVariables }),
    paths: {
      exportDir: args.exportDir,
    },
    pipeline: {
      steps: DEFAULT_PIPELINE_STEPS,
    },
  };
}
