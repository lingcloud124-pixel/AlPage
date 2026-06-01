import type {
  PortalCardContent,
  PortalCardPlacement,
  PortalCustomerProfile,
  PortalPlan,
  PortalPlanStatus,
  PortalSummary,
  WorkspaceConfig,
  WorkspaceItem,
} from './types';
import {
  DEFAULT_WORKSPACE_SETTINGS,
  createWorkspaceConfigFromPortalDraft,
  type Project,
} from './project-manager';

const DEFAULT_REGION_ID = 'main';

function now(): number {
  return Date.now();
}

function createFallbackSummary(project: Project): PortalSummary {
  return {
    customerName: project.portalProfile?.customerName ?? project.name ?? '当前客户',
    customerIndustry: project.portalProfile?.customerIndustry ?? '综合行业',
    customerFunctions: project.portalProfile?.customerFunctions ?? [],
    portalPurpose: project.portalProfile?.portalPurpose ?? '门户方案',
    highlightedCards: project.portalProfile?.highlightedCards ?? [],
    visualPreference: project.portalProfile?.visualPreference ?? '专业简洁',
    structureUnderstanding: [],
    styleUnderstanding: project.portalProfile?.visualPreference ?? '专业简洁',
  };
}

function resolveSummary(project: Project): PortalSummary {
  return project.portalSummary ?? createFallbackSummary(project);
}

function resolveWorkspace(project: Project): WorkspaceConfig {
  if (project.workspace) return project.workspace;
  if (project.portalDraft) return createWorkspaceConfigFromPortalDraft(project.portalDraft);
  const timestamp = now();
  return {
    settings: DEFAULT_WORKSPACE_SETTINGS,
    items: [],
    meta: {
      initializedAt: timestamp,
      updatedAt: timestamp,
      source: 'default',
    },
  };
}

function mapWorkspaceItemToPlacement(item: WorkspaceItem): PortalCardPlacement {
  return {
    cardId: item.id,
    templateId: item.templateId,
    regionId: DEFAULT_REGION_ID,
    column: item.x,
    row: item.y,
    columnSpan: item.w,
    rowSpan: item.h,
    ...(typeof item.minW === 'number' ? { minColumnSpan: item.minW } : {}),
    ...(typeof item.maxW === 'number' ? { maxColumnSpan: item.maxW } : {}),
    ...(typeof item.minH === 'number' ? { minRowSpan: item.minH } : {}),
    ...(typeof item.maxH === 'number' ? { maxRowSpan: item.maxH } : {}),
  };
}

function mapWorkspaceItemToContent(item: WorkspaceItem, summary: PortalSummary): PortalCardContent {
  const props = item.instanceProps ?? {};
  return {
    id: item.id,
    templateId: item.templateId,
    title: typeof props.title === 'string' ? props.title : `${summary.customerName}门户卡片`,
    ...(typeof props.summary === 'string' ? { summary: props.summary } : {}),
    ...(typeof props.badge === 'string' ? { badge: props.badge } : {}),
    ...(typeof props.headline === 'string' ? { headline: props.headline } : {}),
    ...(Array.isArray(props.items) ? { items: props.items as Array<Record<string, unknown>> } : {}),
    ...(Array.isArray(props.links) ? { links: props.links as string[] } : {}),
    enterpriseMappingReason: '由项目工作区卡片映射生成',
  };
}

function mapContentToInstanceProps(content: PortalCardContent | undefined): Record<string, unknown> {
  if (!content) return {};
  return {
    title: content.title,
    ...(content.summary ? { summary: content.summary } : {}),
    ...(content.badge ? { badge: content.badge } : {}),
    ...(content.headline ? { headline: content.headline } : {}),
    ...(content.items ? { items: content.items } : {}),
    ...(content.links ? { links: content.links } : {}),
  };
}

function createEnterpriseSummary(summary: PortalSummary): string {
  return [
    `${summary.customerName}（${summary.customerIndustry}）`,
    summary.portalPurpose,
    summary.customerFunctions.join('、'),
  ].filter(Boolean).join(' / ');
}

export function setPortalPlanStatus(project: Project, status: PortalPlanStatus): Project {
  return {
    ...project,
    portalPlan: project.portalPlan ? { ...project.portalPlan, status, updatedAt: now() } : project.portalPlan,
    portalPlanStatus: status,
    updatedAt: now(),
  };
}

export function createPortalPlanFromProject(project: Project): PortalPlan {
  const summary = resolveSummary(project);
  const workspace = resolveWorkspace(project);
  const timestamp = now();
  return {
    id: `portal-plan-${project.id}`,
    status: 'generated',
    enterpriseProfile: {
      customerName: summary.customerName,
      industry: summary.customerIndustry,
      customerFunctions: summary.customerFunctions,
      portalPurpose: summary.portalPurpose,
      highlightedCards: summary.highlightedCards,
      visualPreference: summary.visualPreference,
      summary: createEnterpriseSummary(summary),
      ...(project.portalProfile ? { sourceProfile: project.portalProfile as PortalCustomerProfile } : {}),
    },
    themeLayer: {
      themeDirection: project.portalDraft?.themeDirection ?? `${summary.customerIndustry}行业下的${summary.visualPreference}门户视觉方向`,
      colors: { ...project.colors },
      headerStyle: 'standard',
      navigationStyle: 'sidebar',
      bannerStrategy: 'theme-driven',
      visualKeywords: [summary.customerIndustry, summary.visualPreference].filter(Boolean),
    },
    workspaceRuleLayer: {
      cardRadius: 16,
      cardGap: workspace.settings.gapX,
      cardDensity: 'standard',
      shadowStyle: 'soft',
      gridColumns: workspace.settings.columns,
      rowHeight: workspace.settings.rowHeight,
      layoutMode: 'dashboard',
      regions: [{
        id: DEFAULT_REGION_ID,
        name: '主工作区',
        columns: workspace.settings.columns,
        rowHeight: workspace.settings.rowHeight,
        padding: workspace.settings.paddingX,
      }],
      cardPlacements: workspace.items.map(mapWorkspaceItemToPlacement),
    },
    cardContentLayer: {
      cards: workspace.items.map((item) => mapWorkspaceItemToContent(item, summary)),
    },
    uncoveredNeeds: project.portalPlan?.uncoveredNeeds ?? [],
    requirementSummary: project.portalPlan?.requirementSummary,
    editHistory: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createWorkspaceFromPortalPlan(portalPlan: PortalPlan): WorkspaceConfig {
  const timestamp = now();
  const cardsById = new Map(portalPlan.cardContentLayer.cards.map((card) => [card.id, card]));
  return {
    settings: {
      ...DEFAULT_WORKSPACE_SETTINGS,
      columns: portalPlan.workspaceRuleLayer.gridColumns,
      rowHeight: portalPlan.workspaceRuleLayer.rowHeight,
      gapX: portalPlan.workspaceRuleLayer.cardGap,
      gapY: portalPlan.workspaceRuleLayer.cardGap,
    },
    items: portalPlan.workspaceRuleLayer.cardPlacements.map((placement) => {
      const content = cardsById.get(placement.cardId);
      return {
        id: placement.cardId,
        templateId: placement.templateId,
        x: placement.column,
        y: placement.row,
        w: placement.columnSpan,
        h: placement.rowSpan,
        ...(typeof placement.minColumnSpan === 'number' ? { minW: placement.minColumnSpan } : {}),
        ...(typeof placement.maxColumnSpan === 'number' ? { maxW: placement.maxColumnSpan } : {}),
        ...(typeof placement.minRowSpan === 'number' ? { minH: placement.minRowSpan } : {}),
        ...(typeof placement.maxRowSpan === 'number' ? { maxH: placement.maxRowSpan } : {}),
        instanceProps: mapContentToInstanceProps(content),
      };
    }),
    meta: {
      initializedAt: timestamp,
      updatedAt: timestamp,
      source: 'portal-draft',
    },
  };
}

export function applyPortalPlanToProject(project: Project, portalPlan: PortalPlan): Project {
  return {
    ...project,
    portalPlan,
    portalPlanStatus: portalPlan.status,
    workspace: createWorkspaceFromPortalPlan(portalPlan),
    updatedAt: now(),
  };
}

export function ensureProjectPortalPlan(project: Project): Project {
  if (project.portalPlan) return project;
  return applyPortalPlanToProject(project, createPortalPlanFromProject(project));
}

export function updateProjectPortalPlan(project: Project, updater: (portalPlan: PortalPlan) => PortalPlan): Project {
  const current = project.portalPlan ?? createPortalPlanFromProject(project);
  return applyPortalPlanToProject(project, updater(current));
}

export function syncPortalPlanFromWorkspace(project: Project): Project {
  if (!project.portalPlan || !project.workspace) return project;

  const timestamp = now();
  const summary = resolveSummary(project);
  const contentById = new Map(project.portalPlan.cardContentLayer.cards.map((card) => [card.id, card]));
  const portalPlan: PortalPlan = {
    ...project.portalPlan,
    status: 'editing',
    workspaceRuleLayer: {
      ...project.portalPlan.workspaceRuleLayer,
      gridColumns: project.workspace.settings.columns,
      rowHeight: project.workspace.settings.rowHeight,
      cardGap: project.workspace.settings.gapX,
      cardPlacements: project.workspace.items.map(mapWorkspaceItemToPlacement),
    },
    cardContentLayer: {
      cards: project.workspace.items.map((item) => {
        const previous = contentById.get(item.id);
        const workspaceContent = mapWorkspaceItemToContent(item, summary);
        return {
          ...previous,
          ...workspaceContent,
          id: item.id,
          templateId: item.templateId,
          enterpriseMappingReason: previous?.enterpriseMappingReason ?? workspaceContent.enterpriseMappingReason,
        };
      }),
    },
    editHistory: [
      ...project.portalPlan.editHistory,
      {
        source: 'config',
        layer: 'workspaceRules',
        summary: '从工作区布局同步 PortalPlan',
        createdAt: timestamp,
      },
    ],
    updatedAt: timestamp,
  };

  return {
    ...project,
    portalPlan,
    portalPlanStatus: 'editing',
    updatedAt: timestamp,
  };
}
