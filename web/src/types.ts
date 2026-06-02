import type { ProjectVisualContext } from './tools/project-visual-context-store';

/**
 * Tool Calling 类型定义
 * AI 输出的结构化指令，前端解析执行
 */

export interface ToolCall {
  tool: string;
  args: Record<string, unknown>;
  id?: string;
}

export interface ToolResult {
  toolCallId?: string;
  success: boolean;
  data?: unknown;
  error?: string;
}

// Tool 参数类型
export interface UpdateColorsArgs {
  colors: Record<string, string>;
}

export interface AnalyzeImageArgs {
  imageUrl: string;
  fileName?: string;
}

export interface ParsePenArgs {
  penContent: string;
  fileName?: string;
}

export interface GenerateBackgroundArgs {
  prompt: string;
  primaryHint?: string;
}

export interface UploadBackgroundArgs {
  imageUrl: string;
}

export interface ScreenshotArgs {
  components: string[];
}

export interface BuildArgs {
  configYaml?: string;
}

export interface VerifyArgs {
  zipDir: string;
}

export interface SaveColorsArgs {
  colors: Record<string, string>;
  nameEn: string;
  name: string;
  templateType: string;
}

export interface LoadColorsArgs {
  nameEn: string;
}

// Chat 消息类型
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  attachments?: MessageAttachment[];
}

export interface MessageAttachment {
  type: 'image' | 'pen' | 'other';
  name: string;
  url: string;
  data?: string; // base64 for images
}

// AI 请求/响应类型
export interface ChatRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string | ContentPart[];
  }>;
  tools?: ToolDefinition[];
  temperature?: number;
}

export interface ContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ChatResponse {
  id: string;
  choices: Array<{
    message: {
      role: 'assistant';
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: 'function';
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
  }>;
}

// 设置类型
export interface AISettings {
  apiEndpoint: string;
  apiKey: string;
  model: string;
  imageApiEndpoint?: string;
  imageApiKey?: string;
  imageModel?: string;
  exportRoot?: string;
  uiTheme?: 'dark' | 'light';
}

export type PortalIntakeField =
  | 'customerName'
  | 'customerIndustry'
  | 'customerFunctions'
  | 'portalPurpose'
  | 'highlightedCards'
  | 'visualPreference';

export interface PortalCustomerProfile {
  customerName?: string;
  customerIndustry?: string;
  customerFunctions?: string[];
  portalPurpose?: string;
  highlightedCards?: string[];
  visualPreference?: string;
  source?: Array<'chat' | 'form' | 'attachment' | 'inferred'>;
  completeness: number;
  updatedAt?: number;
}

export interface PortalSummary {
  customerName: string;
  customerIndustry: string;
  customerFunctions: string[];
  portalPurpose: string;
  highlightedCards: string[];
  visualPreference: string;
  structureUnderstanding: string[];
  styleUnderstanding: string;
  confirmedAt?: number;
}

/**
 * 需求理解摘要 — 生成前的独立确认环节，区别于画像字段确认 (PortalCustomerProfile)。
 * 画像确认 = 确认 6 个画像字段
 * 需求摘要 = 确认 AI 对门户目标、模块需求、覆盖分析、假设的理解
 */
export interface RequirementSummary {
  portalGoal: string;
  requestedCapabilities: string[];
  stylePreferences: string[];
  assumptions: string[];
  coverableCards?: string[];
  uncoveredNeeds?: UncoveredNeed[];
}

export interface PortalWorkspaceSeedItem {
  templateId: string;
  reason: string;
  title?: string;
  summary?: string;
  badge?: string;
  headline?: string;
  priority?: 'high' | 'medium' | 'low';
  itemCount?: number;
  items?: Array<Record<string, unknown>>;
  links?: string[];
}

export interface PortalDraft {
  themeDirection: string;
  workspaceSeed: PortalWorkspaceSeedItem[];
  generatedAt: number;
}

export interface PortalResultState {
  savedAt?: number;
  sharedAt?: number;
  fullscreenViewedAt?: number;
}

export type PortalPlanStatus = 'collecting' | 'summary_pending' | 'generated' | 'editing' | 'saved';

export interface PortalEnterpriseProfile {
  customerName: string;
  industry: string;
  customerFunctions: string[];
  portalPurpose: string;
  highlightedCards: string[];
  visualPreference: string;
  summary: string;
  sourceProfile?: PortalCustomerProfile;
}

export interface PortalThemeLayer {
  themeDirection: string;
  colors: Record<string, string>;
  headerStyle: string;
  navigationStyle: string;
  bannerStrategy: string;
  visualKeywords: string[];
}

/**
 * 主题配置 — 对应可编辑的 Theme Effect Layer。
 * Logo 可编辑是产品规则，始终提供上传/替换/删除入口，不作为可关闭的配置字段。
 */
export interface ThemeConfig {
  logoUrl?: string;
  customerName?: string;
  headerStyle: string;
  colorThemeId?: string;
  colors?: Record<string, string>;
  backgroundAssetId?: string;
  backgroundUrl?: string;
  backgroundMode?: 'library' | 'generated' | 'placeholder';
}

export type PortalCardDensity = 'compact' | 'standard' | 'comfortable';
export type PortalLayoutMode = 'dense' | 'showcase' | 'dashboard';

export interface PortalRegion {
  id: string;
  name: string;
  columns: number;
  rowHeight: number;
  padding: number;
}

export interface PortalCardPlacement {
  cardId: string;
  templateId: string;
  regionId: string;
  column: number;
  row: number;
  columnSpan: number;
  rowSpan: number;
  minColumnSpan?: number;
  maxColumnSpan?: number;
  minRowSpan?: number;
  maxRowSpan?: number;
}

export interface PortalWorkspaceRuleLayer {
  cardRadius: number;
  cardGap: number;
  cardDensity: PortalCardDensity;
  shadowStyle: string;
  gridColumns: number;
  rowHeight: number;
  layoutMode: PortalLayoutMode;
  regions: PortalRegion[];
  cardPlacements: PortalCardPlacement[];
}

export interface PortalCardContent {
  id: string;
  templateId: string;
  title: string;
  summary?: string;
  badge?: string;
  headline?: string;
  items?: Array<Record<string, unknown>>;
  links?: string[];
  enterpriseMappingReason: string;
}

export interface PortalCardContentLayer {
  cards: PortalCardContent[];
}

export interface PortalEditHistoryItem {
  source: 'agent' | 'config';
  layer: 'theme' | 'workspaceRules' | 'cardContent';
  summary: string;
  createdAt: number;
}

/**
 * 未覆盖需求 — 用户要求但当前卡片库无法满足的能力。
 */
export interface UncoveredNeed {
  id: string;
  label: string;
  reason: string;
  requestedCapability: string;
  suggestedCardType?: string;
}

/**
 * 卡片字段 schema — 定义卡片模板中每个字段的结构和 AI 可写性。
 */
export interface CardFieldSchema {
  key: string;
  label: string;
  type: 'text' | 'number' | 'image' | 'link' | 'list' | 'select' | 'boolean';
  aiWritable: boolean;
  required?: boolean;
  options?: string[];
  itemSchema?: Record<string, string>;
}

/**
 * 卡片模板 — 后台卡片库中的模板定义，AI 只能从中选择。
 */
export interface CardTemplate {
  id: string;
  name: string;
  category: string;
  industryTags: string[];
  capabilityTags: string[];
  scenarioTags: string[];
  defaultW: number;
  defaultH: number;
  previewImageUrl?: string;
  fields: CardFieldSchema[];
  enabled: boolean;
}

export interface PortalPlan {
  id: string;
  status: PortalPlanStatus;
  enterpriseProfile: PortalEnterpriseProfile;
  themeLayer: PortalThemeLayer;
  workspaceRuleLayer: PortalWorkspaceRuleLayer;
  cardContentLayer: PortalCardContentLayer;
  /** 未覆盖需求：用户要求但卡片库无法满足的能力 */
  uncoveredNeeds?: UncoveredNeed[];
  /** 需求理解摘要：生成前的独立确认 */
  requirementSummary?: RequirementSummary;
  editHistory: PortalEditHistoryItem[];
  createdAt: number;
  updatedAt: number;
}

export interface WorkspaceSettings {
  columns: number;
  rowHeight: number;
  gapX: number;
  gapY: number;
  paddingX: number;
  paddingY: number;
  maxWidth?: number;
  backgroundMode?: 'theme' | 'plain';
}

export interface WorkspaceItem {
  id: string;
  templateId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  locked?: boolean;
  zIndex?: number;
  instanceProps?: Record<string, unknown>;
  styleOverrides?: Record<string, unknown>;
}

export interface WorkspaceMeta {
  initializedAt: number;
  updatedAt: number;
  source: 'default' | 'portal-draft';
}

export interface WorkspaceConfig {
  settings: WorkspaceSettings;
  items: WorkspaceItem[];
  meta: WorkspaceMeta;
}

export interface ConfirmedProjectSnapshot {
  projectId: string;
  name: string;
  nameEn: string;
  templateType: 'light-ui' | 'dark-ui';
  colors: Record<string, string>;
  bgImageUrl?: string;
  headerBgImageUrl?: string;
  visualContext?: ProjectVisualContext;
  sourceUpdatedAt: number;
  confirmedAt: number;
}

export type ServerExportJobStatus =
  | 'queued'
  | 'preparing'
  | 'capturing'
  | 'packaging'
  | 'verifying'
  | 'completed'
  | 'failed';

export interface ServerExportJobResult {
  downloadUrl?: string;
  artifactPath?: string;
  packageCount?: number;
}

export interface ServerExportJob {
  id: string;
  projectId: string;
  status: ServerExportJobStatus;
  selectedProducts: string[];
  error?: string;
  result?: ServerExportJobResult;
  createdAt: number;
  updatedAt: number;
}

export type ExportBatchStatus =
  | 'queued'
  | 'bridge_unavailable'
  | 'capturing'
  | 'packaging'
  | 'verifying'
  | 'completed'
  | 'failed';

export interface ExportProjectSnapshot {
  projectId: string;
  name: string;
  nameEn: string;
  templateType: 'light-ui' | 'dark-ui';
  colors: Record<string, string>;
  bgImageUrl?: string;
  headerBgImageUrl?: string;
  visualContext?: ProjectVisualContext;
}

export interface ExportBatch {
  id: string;
  createdAt: number;
  status: ExportBatchStatus;
  selectedProducts: string[];
  exportRoot?: string;
  projectDir?: string;
  exportDir?: string;
  error?: string;
  projectSnapshot: ExportProjectSnapshot;
}

export interface ExportJobQueueEntry {
  batchId: string;
  projectId: string;
  name: string;
  nameEn: string;
  templateType: 'light-ui' | 'dark-ui';
  selectedProducts: string[];
  createdAt: number;
  status: ExportBatchStatus;
}

export interface ConversationListItem {
  id: string;
  title: string;
  hasGeneratedTheme: boolean;
  isStarred: boolean;
  updatedAt: number;
}

export interface ConversationDetail extends ConversationListItem {
  messages: ChatMessage[];
  projectSnapshot: Record<string, unknown>;
  imageData: ConversationImageData | null;
  createdAt: number;
}

export interface ConversationImageData {
  primaryImage?: string;
  headerImage?: string;
  userUploads?: string[];
}

export interface ConversationCreatePayload {
  id: string;
  title?: string;
  messages?: ChatMessage[];
  projectSnapshot?: Record<string, unknown>;
  imageData?: ConversationImageData;
  hasGeneratedTheme?: boolean;
}

export interface ConversationUpdatePayload {
  messages?: ChatMessage[];
  projectSnapshot?: Record<string, unknown>;
  title?: string;
  imageData?: ConversationImageData;
  hasGeneratedTheme?: boolean;
}
