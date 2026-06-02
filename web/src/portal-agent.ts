import type {
  PortalCustomerProfile,
  PortalDraft,
  PortalIntakeField,
  PortalSummary,
  PortalWorkspaceSeedItem,
  RequirementSummary,
  UncoveredNeed,
} from './types';
import type { CardTemplateListItem } from './api/card-templates';

const REQUIRED_PORTAL_FIELDS: PortalIntakeField[] = [
  'customerName',
  'customerIndustry',
  'customerFunctions',
  'portalPurpose',
  'highlightedCards',
  'visualPreference',
];

const KNOWN_INDUSTRIES = [
  '能源', '医疗', '教育', '金融', '制造', '零售', '物流', '科技', '政务', '文旅', '交通', '化工',
];

const CARD_ALIASES: Array<{ templateId: PortalWorkspaceSeedItem['templateId']; keywords: string[] }> = [
  { templateId: 'quick-access', keywords: ['快捷入口', '入口', '常用入口', '应用导航', '业务入口'] },
  { templateId: 'message-todo', keywords: ['待办', '待办事务', '任务', '审批', '事项'] },
  { templateId: 'news-carousel', keywords: ['新闻', '公告', '资讯', '动态', '新闻公告', '公告速览'] },
  { templateId: 'my-schedule', keywords: ['日程', '排班', '计划', '会议', '我的日程'] },
];

const CONFIRM_PATTERNS = [
  /(^|[，,\s])确认([，,\s]|$)/,
  /就这样/,
  /开始生成/,
  /生成吧/,
  /可以了/,
  /没问题/,
  /好的，生成/,
];

function cleanValue(value: string | undefined): string | undefined {
  const normalized = value?.trim().replace(/^[：:\-]+/, '').replace(/[。；;，,]+$/, '');
  return normalized || undefined;
}

function normalizeList(value: string | string[] | undefined): string[] | undefined {
  if (!value) return undefined;
  const raw = Array.isArray(value) ? value : value.split(/[、,，/]/);
  const list = raw
    .map((item) => cleanValue(String(item)))
    .filter((item): item is string => Boolean(item));
  return list.length > 0 ? Array.from(new Set(list)) : undefined;
}

function extractLabeledValue(message: string, labels: string[]): string | undefined {
  for (const label of labels) {
    const pattern = new RegExp(`${label}\\s*[：:]\\s*([^\\n]+)`);
    const match = pattern.exec(message);
    const cleaned = cleanValue(match?.[1]);
    if (cleaned) return cleaned;
  }
  return undefined;
}

function inferIndustry(message: string): string | undefined {
  return KNOWN_INDUSTRIES.find((industry) => message.includes(industry));
}

function scoreCompleteness(profile: Partial<PortalCustomerProfile> | undefined): number {
  if (!profile) return 0;
  const completed = REQUIRED_PORTAL_FIELDS.filter((field) => {
    const value = profile[field];
    return Array.isArray(value) ? value.length > 0 : Boolean(cleanValue(typeof value === 'string' ? value : undefined));
  }).length;
  return completed / REQUIRED_PORTAL_FIELDS.length;
}

function compareList(a: string[] | undefined, b: string[] | undefined): boolean {
  return JSON.stringify(a ?? []) === JSON.stringify(b ?? []);
}

export function extractPortalProfileFromMessage(message: string): Partial<PortalCustomerProfile> {
  const customerName =
    extractLabeledValue(message, ['客户名称', '企业名称', '品牌名']) ??
    cleanValue(/给(?:一家|一个)?([^，。\n]{2,24}?)(?:做|设计|生成|搭建)/.exec(message)?.[1]);
  const customerIndustry =
    extractLabeledValue(message, ['客户行业', '行业']) ??
    inferIndustry(message);
  const customerFunctions = normalizeList(
    extractLabeledValue(message, ['客户核心职能/业务特征', '客户核心职能', '业务特征', '核心职能']),
  );
  const portalPurpose =
    extractLabeledValue(message, ['本次门户用途', '门户用途', '用途']) ??
    cleanValue(/(运营门户|活动门户|专题门户|客户演示门户|方案汇报门户|门户方案)/.exec(message)?.[1]);
  const highlightedCards = normalizeList(
    extractLabeledValue(message, ['希望突出哪些卡片或信息', '重点卡片', '重点信息', '突出卡片', '突出信息']),
  );
  const visualPreference =
    extractLabeledValue(message, ['品牌/视觉倾向', '视觉倾向', '品牌倾向', '风格倾向']) ??
    cleanValue(/(企业蓝|科技蓝|蓝白简洁|稳重企业蓝|喜庆红金|深色科技风|轻盈明亮风格)/.exec(message)?.[1]);

  return {
    ...(customerName ? { customerName } : {}),
    ...(customerIndustry ? { customerIndustry } : {}),
    ...(customerFunctions ? { customerFunctions } : {}),
    ...(portalPurpose ? { portalPurpose } : {}),
    ...(highlightedCards ? { highlightedCards } : {}),
    ...(visualPreference ? { visualPreference } : {}),
  };
}

export function mergePortalProfile(
  current: Partial<PortalCustomerProfile> | undefined,
  patch: Partial<PortalCustomerProfile> | undefined,
  source: 'chat' | 'form' | 'attachment' | 'inferred',
): PortalCustomerProfile {
  const merged: PortalCustomerProfile = {
    customerName: cleanValue(patch?.customerName) ?? cleanValue(current?.customerName),
    customerIndustry: cleanValue(patch?.customerIndustry) ?? cleanValue(current?.customerIndustry),
    customerFunctions: normalizeList(patch?.customerFunctions) ?? normalizeList(current?.customerFunctions),
    portalPurpose: cleanValue(patch?.portalPurpose) ?? cleanValue(current?.portalPurpose),
    highlightedCards: normalizeList(patch?.highlightedCards) ?? normalizeList(current?.highlightedCards),
    visualPreference: cleanValue(patch?.visualPreference) ?? cleanValue(current?.visualPreference),
    source: Array.from(new Set([...(current?.source ?? []), source])),
    updatedAt: Date.now(),
    completeness: 0,
  };
  merged.completeness = scoreCompleteness(merged);
  return merged;
}

export function didPortalProfileChange(
  previous: Partial<PortalCustomerProfile> | undefined,
  next: Partial<PortalCustomerProfile> | undefined,
): boolean {
  return cleanValue(previous?.customerName) !== cleanValue(next?.customerName)
    || cleanValue(previous?.customerIndustry) !== cleanValue(next?.customerIndustry)
    || !compareList(previous?.customerFunctions, next?.customerFunctions)
    || cleanValue(previous?.portalPurpose) !== cleanValue(next?.portalPurpose)
    || !compareList(previous?.highlightedCards, next?.highlightedCards)
    || cleanValue(previous?.visualPreference) !== cleanValue(next?.visualPreference);
}

export function getPortalMissingFields(profile: Partial<PortalCustomerProfile> | undefined): PortalIntakeField[] {
  return REQUIRED_PORTAL_FIELDS.filter((field) => {
    const value = profile?.[field];
    return Array.isArray(value) ? value.length === 0 : !cleanValue(typeof value === 'string' ? value : undefined);
  });
}

export function buildPortalSummary(profile: PortalCustomerProfile): PortalSummary {
  const highlightedCards = profile.highlightedCards ?? [];
  const customerFunctions = profile.customerFunctions ?? [];
  const customerName = profile.customerName ?? '当前客户';
  const customerIndustry = profile.customerIndustry ?? '综合行业';
  const portalPurpose = profile.portalPurpose ?? '门户方案';
  const visualPreference = profile.visualPreference ?? '专业简洁';

  return {
    customerName,
    customerIndustry,
    customerFunctions,
    portalPurpose,
    highlightedCards,
    visualPreference,
    structureUnderstanding: [
      `${customerName} 当前更需要一个面向 ${portalPurpose} 的门户初稿。`,
      highlightedCards.length > 0
        ? `优先突出 ${highlightedCards.join('、')} 相关卡片区域。`
        : `优先突出最能承接 ${portalPurpose} 的核心业务卡片。`,
      customerFunctions.length > 0
        ? `卡片内容会围绕 ${customerFunctions.join('、')} 这些业务特征组织。`
        : `卡片内容会围绕当前客户的核心业务特征组织。`,
    ],
    styleUnderstanding: `${customerIndustry} 行业语境下，采用“${visualPreference}”的视觉方向，并保持 ${customerName} 的品牌识别感。`,
  };
}

export function isPortalSummaryConfirmationMessage(message: string): boolean {
  const normalized = message.trim();
  return CONFIRM_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function getPortalWorkflowState(
  profile: Partial<PortalCustomerProfile> | undefined,
  summary: PortalSummary | null | undefined,
): {
  status: 'collecting' | 'summary_pending' | 'ready_to_generate';
  missingFields: PortalIntakeField[];
} {
  const missingFields = getPortalMissingFields(profile);
  if (missingFields.length > 0) {
    return { status: 'collecting', missingFields };
  }
  if (!summary || !summary.confirmedAt) {
    return { status: 'summary_pending', missingFields: [] };
  }
  return { status: 'ready_to_generate', missingFields: [] };
}

function mapHighlightToTemplateId(highlight: string): string | null {
  const match = CARD_ALIASES.find((alias) => alias.keywords.some((keyword) => highlight.includes(keyword)));
  return match?.templateId ?? null;
}

interface IndustryCardData {
  todo: {
    summary: string;
    items: Array<{ label: string; meta: string }>;
  };
  news: {
    badge: string;
    headline: string;
    summary: string;
    items: Array<{ title: string; meta: string }>;
  };
  schedule: {
    items: Array<{ title: string; meta: string; status: string }>;
  };
  quickAccess: {
    summary: string;
    links: string[];
  };
}

const INDUSTRY_CONTENT_MAP: Record<string, IndustryCardData> = {
  '能源': {
    todo: { summary: '能源业务优先跟进', items: [{ label: '电力调度审核', meta: '今日' }, { label: '设备巡检报告', meta: '待处理' }, { label: '安全合规检查', meta: '需确认' }] },
    news: { badge: '能源', headline: '智慧能源转型', summary: '聚焦新能源发电与电网数字化升级', items: [{ title: '国家电网数字化转型白皮书', meta: '今日更新' }, { title: '分布式光伏接入新规解读', meta: '刚刚' }] },
    schedule: { items: [{ title: '调度系统联调评审', meta: '09:30', status: '待开始' }, { title: '设备供应商沟通会', meta: '14:00', status: '进行中' }, { title: '安全生产月度总结', meta: '17:00', status: '待完成' }] },
    quickAccess: { summary: '能源运营常用入口', links: ['调度看板', '设备台账', '安全监控', '工单流转', '巡检任务', '能耗分析'] },
  },
  '医疗': {
    todo: { summary: '医疗业务优先跟进', items: [{ label: '门诊排班审批', meta: '今日' }, { label: '患者随访计划', meta: '待处理' }, { label: '药品采购申请', meta: '需确认' }] },
    news: { badge: '医疗', headline: '智慧医院建设', summary: '数字化医疗服务与管理创新', items: [{ title: '远程诊疗平台上线通知', meta: '今日更新' }, { title: '电子病历系统升级公告', meta: '刚刚' }] },
    schedule: { items: [{ title: '科室周会', meta: '09:30', status: '待开始' }, { title: '医疗质量控制评审', meta: '14:00', status: '进行中' }, { title: '护理排班协调会', meta: '17:00', status: '待完成' }] },
    quickAccess: { summary: '医疗运营常用入口', links: ['医生排班', '门诊预约', '患者服务', '满意度反馈', '药品管理', '检验报告'] },
  },
  '教育': {
    todo: { summary: '教务管理优先跟进', items: [{ label: '课程排期确认', meta: '今日' }, { label: '科研立项审批', meta: '待处理' }, { label: '学生注册审核', meta: '需确认' }] },
    news: { badge: '教育', headline: '智慧校园建设', summary: '数字化教学与科研管理平台', items: [{ title: '新学期选课系统开放通知', meta: '今日更新' }, { title: '科研成果申报指南更新', meta: '刚刚' }] },
    schedule: { items: [{ title: '教务工作会议', meta: '09:30', status: '待开始' }, { title: '教学质量评估', meta: '14:00', status: '进行中' }, { title: '学生事务协调', meta: '17:00', status: '待完成' }] },
    quickAccess: { summary: '教育管理常用入口', links: ['教务管理', '科研平台', '课程中心', '学生服务', '成绩查询', '图书馆'] },
  },
  '金融': {
    todo: { summary: '金融业务优先跟进', items: [{ label: '信贷审批流程', meta: '今日' }, { label: '风控合规检查', meta: '待处理' }, { label: '交易异常审核', meta: '需确认' }] },
    news: { badge: '金融', headline: '金融科技创新', summary: '数字化金融产品与服务创新', items: [{ title: '智能风控平台上线公告', meta: '今日更新' }, { title: '数字人民币应用场景拓展', meta: '刚刚' }] },
    schedule: { items: [{ title: '风控月度评审', meta: '09:30', status: '待开始' }, { title: '合规检查协调会', meta: '14:00', status: '进行中' }, { title: '客户经理培训', meta: '17:00', status: '待完成' }] },
    quickAccess: { summary: '金融运营常用入口', links: ['信贷管理', '风控监测', '交易查询', '客户服务', '报表中心', '合规审查'] },
  },
  '制造': {
    todo: { summary: '制造业务优先跟进', items: [{ label: '生产排程审核', meta: '今日' }, { label: '质检报告确认', meta: '待处理' }, { label: '供应链异常处理', meta: '需确认' }] },
    news: { badge: '制造', headline: '智能制造升级', summary: '工业互联网与智能制造融合', items: [{ title: '产线数字化改造进展', meta: '今日更新' }, { title: '供应商协同平台上线', meta: '刚刚' }] },
    schedule: { items: [{ title: '生产计划评审', meta: '09:30', status: '待开始' }, { title: '质量管理复盘', meta: '14:00', status: '进行中' }, { title: '供应链协调会', meta: '17:00', status: '待完成' }] },
    quickAccess: { summary: '制造运营常用入口', links: ['生产看板', '质量检测', '设备管理', '供应链', '工单中心', '仓储管理'] },
  },
  '零售': {
    todo: { summary: '零售业务优先跟进', items: [{ label: '促销活动审批', meta: '今日' }, { label: '库存预警处理', meta: '待处理' }, { label: '门店巡检报告', meta: '需确认' }] },
    news: { badge: '零售', headline: '新零售创新', summary: '数字化零售与消费者体验升级', items: [{ title: '全渠道营销平台上线', meta: '今日更新' }, { title: '会员体系升级公告', meta: '刚刚' }] },
    schedule: { items: [{ title: '商品选品会', meta: '09:30', status: '待开始' }, { title: '门店运营复盘', meta: '14:00', status: '进行中' }, { title: '供应链对接会', meta: '17:00', status: '待完成' }] },
    quickAccess: { summary: '零售运营常用入口', links: ['商品管理', '库存查询', '订单中心', '会员服务', '促销管理', '门店数据'] },
  },
  '物流': {
    todo: { summary: '物流业务优先跟进', items: [{ label: '运力调度审批', meta: '今日' }, { label: '异常件处理', meta: '待处理' }, { label: '仓储安全检查', meta: '需确认' }] },
    news: { badge: '物流', headline: '智慧物流平台', summary: '数字化物流与供应链管理', items: [{ title: '智能仓储系统升级', meta: '今日更新' }, { title: '跨境物流新线路开通', meta: '刚刚' }] },
    schedule: { items: [{ title: '运力调度会议', meta: '09:30', status: '待开始' }, { title: '客户需求对接', meta: '14:00', status: '进行中' }, { title: '线路优化评审', meta: '17:00', status: '待完成' }] },
    quickAccess: { summary: '物流运营常用入口', links: ['运力调度', '货物追踪', '仓储管理', '异常处理', '线路优化', '签收确认'] },
  },
  '科技': {
    todo: { summary: '科技业务优先跟进', items: [{ label: '产品版本发布', meta: '今日' }, { label: '代码评审跟进', meta: '待处理' }, { label: '客户反馈处理', meta: '需确认' }] },
    news: { badge: '科技', headline: '技术创新前沿', summary: '人工智能与云计算技术突破', items: [{ title: 'AI 大模型应用落地报告', meta: '今日更新' }, { title: '云原生架构升级方案', meta: '刚刚' }] },
    schedule: { items: [{ title: '产品需求评审', meta: '09:30', status: '待开始' }, { title: '技术分享会', meta: '14:00', status: '进行中' }, { title: '迭代复盘', meta: '17:00', status: '待完成' }] },
    quickAccess: { summary: '科技运营常用入口', links: ['项目管理', '代码仓库', '持续集成', '监控告警', '文档中心', '工单系统'] },
  },
  '政务': {
    todo: { summary: '政务业务优先跟进', items: [{ label: '公文流转审批', meta: '今日' }, { label: '会议纪要整理', meta: '待处理' }, { label: '信访案件跟进', meta: '需确认' }] },
    news: { badge: '政务', headline: '数字政府建设', summary: '政务数字化与公共服务创新', items: [{ title: '一网通办系统升级', meta: '今日更新' }, { title: '政务服务标准化推进', meta: '刚刚' }] },
    schedule: { items: [{ title: '部门协调会', meta: '09:30', status: '待开始' }, { title: '政策宣讲培训', meta: '14:00', status: '进行中' }, { title: '舆情分析报告', meta: '17:00', status: '待完成' }] },
    quickAccess: { summary: '政务办公常用入口', links: ['公文管理', '会议预约', '行政审批', '信息公开', '信访处理', '数据上报'] },
  },
  '文旅': {
    todo: { summary: '文旅业务优先跟进', items: [{ label: '景区活动审批', meta: '今日' }, { label: '票务系统维护', meta: '待处理' }, { label: '游客投诉处理', meta: '需确认' }] },
    news: { badge: '文旅', headline: '智慧文旅创新', summary: '数字化文旅体验与管理升级', items: [{ title: '景区数字化导览上线', meta: '今日更新' }, { title: '文旅消费节活动公告', meta: '刚刚' }] },
    schedule: { items: [{ title: '文旅项目规划会', meta: '09:30', status: '待开始' }, { title: '景区运营复盘', meta: '14:00', status: '进行中' }, { title: '文化活动筹备', meta: '17:00', status: '待完成' }] },
    quickAccess: { summary: '文旅运营常用入口', links: ['景区管理', '票务中心', '游客服务', '活动管理', '导览系统', '舆情监测'] },
  },
  '交通': {
    todo: { summary: '交通业务优先跟进', items: [{ label: '路况异常处理', meta: '今日' }, { label: '车辆调度审批', meta: '待处理' }, { label: '安全巡检报告', meta: '需确认' }] },
    news: { badge: '交通', headline: '智慧交通建设', summary: '交通数字化与智能调度', items: [{ title: '智能信号系统覆盖计划', meta: '今日更新' }, { title: '公共交通优化方案', meta: '刚刚' }] },
    schedule: { items: [{ title: '运力调度会议', meta: '09:30', status: '待开始' }, { title: '安全月度检查', meta: '14:00', status: '进行中' }, { title: '线路规划评审', meta: '17:00', status: '待完成' }] },
    quickAccess: { summary: '交通运营常用入口', links: ['路况监控', '车辆调度', '安全监测', '线路管理', '票务统计', '投诉处理'] },
  },
  '化工': {
    todo: { summary: '化工业务优先跟进', items: [{ label: '安全巡检审批', meta: '今日' }, { label: '环保监测报告', meta: '待处理' }, { label: '原料采购审核', meta: '需确认' }] },
    news: { badge: '化工', headline: '绿色化工转型', summary: '化工安全与绿色生产', items: [{ title: '安全风险预警系统上线', meta: '今日更新' }, { title: '绿色化工新标准解读', meta: '刚刚' }] },
    schedule: { items: [{ title: '安全评审会', meta: '09:30', status: '待开始' }, { title: '环保合规检查', meta: '14:00', status: '进行中' }, { title: '生产计划协调', meta: '17:00', status: '待完成' }] },
    quickAccess: { summary: '化工运营常用入口', links: ['安全监控', '环保监测', '生产看板', '原料管理', '设备巡检', '应急管理'] },
  },
};

function resolveIndustryData(industry: string | undefined): IndustryCardData | undefined {
  if (!industry) return undefined;
  return INDUSTRY_CONTENT_MAP[industry];
}

function buildQuickLinks(summary: PortalSummary): string[] {
  const industryData = resolveIndustryData(summary.customerIndustry);
  if (industryData) {
    const functionLinks = summary.customerFunctions.flatMap((item) => {
      const matched = industryData.quickAccess.links.find((l) => item.includes(l.replace(/管理|中心|服务|查询|监测/g, '')));
      return matched ? [matched] : [`${item}入口`];
    });
    const fallback = industryData.quickAccess.links;
    return Array.from(new Set([...functionLinks, ...fallback])).slice(0, 6);
  }
  const functionLinks = summary.customerFunctions.flatMap((item) => {
    if (item.includes('调度')) return ['调度看板', '工单流转'];
    if (item.includes('巡检')) return ['巡检任务', '设备台账'];
    if (item.includes('排班')) return ['医生排班', '门诊预约'];
    if (item.includes('患者')) return ['患者服务', '满意度反馈'];
    return [`${item}入口`];
  });
  const fallback = [`${summary.customerName}总览`, `${summary.portalPurpose}`, '数据看板', '协同中心'];
  return Array.from(new Set([...functionLinks, ...fallback])).slice(0, 6);
}

function buildTodoItems(summary: PortalSummary): Array<Record<string, unknown>> {
  const industryData = resolveIndustryData(summary.customerIndustry);
  if (industryData) {
    return industryData.todo.items.map((item) => ({
      label: item.label.replace('{customerName}', summary.customerName),
      meta: item.meta,
    }));
  }
  return [
    { label: `${summary.customerName}重点事项`, meta: '今日' },
    { label: `${summary.customerIndustry}业务跟进`, meta: '待处理' },
    { label: `${summary.portalPurpose}反馈汇总`, meta: '需确认' },
  ];
}

function buildNewsItems(summary: PortalSummary): Array<Record<string, unknown>> {
  const industryData = resolveIndustryData(summary.customerIndustry);
  if (industryData) {
    return industryData.news.items.map((item) => ({
      title: item.title.replace('{customerName}', summary.customerName),
      meta: item.meta,
    }));
  }
  return [
    { title: `${summary.customerName}项目动态`, meta: '刚刚' },
    { title: `${summary.customerIndustry}专题摘要`, meta: '今日更新' },
  ];
}

function buildScheduleItems(summary: PortalSummary): Array<Record<string, unknown>> {
  const industryData = resolveIndustryData(summary.customerIndustry);
  if (industryData) {
    return industryData.schedule.items.map((item) => ({
      title: item.title.replace('{customerName}', summary.customerName).replace('{portalPurpose}', summary.portalPurpose),
      meta: item.meta,
      status: item.status,
    }));
  }
  return [
    { title: `${summary.portalPurpose}评审`, meta: '09:30', status: '待开始' },
    { title: `${summary.customerName}沟通会`, meta: '14:00', status: '进行中' },
    { title: `${summary.customerIndustry}资料整理`, meta: '17:00', status: '待完成' },
  ];
}

function buildSeedItem(summary: PortalSummary, templateId: string): PortalWorkspaceSeedItem {
  const industryData = resolveIndustryData(summary.customerIndustry);
  if (templateId === 'quick-access') {
    return {
      templateId,
      reason: '优先承接客户高频入口与重点动作',
      priority: 'high',
      title: `${summary.customerName}快捷入口`,
      summary: industryData?.quickAccess.summary ?? `${summary.customerIndustry}${summary.portalPurpose}常用入口`,
      links: buildQuickLinks(summary),
      itemCount: 6,
    };
  }
  if (templateId === 'news-carousel') {
    return {
      templateId,
      reason: '用于承接新闻公告和方案叙事',
      priority: 'medium',
      title: `${summary.customerName}资讯焦点`,
      badge: industryData?.news.badge ?? summary.customerIndustry,
      headline: industryData?.news.headline.replace('{customerName}', summary.customerName) ?? `${summary.customerName}${summary.portalPurpose}`,
      summary: industryData?.news.summary ?? `${summary.customerIndustry}语境下，突出当前门户的核心动态与公告。`,
      items: buildNewsItems(summary),
      itemCount: 2,
    };
  }
  if (templateId === 'my-schedule') {
    return {
      templateId,
      reason: '承接关键日程、计划与排班信息',
      priority: 'medium',
      title: `${summary.customerName}关键日程`,
      summary: `${summary.portalPurpose}相关的关键时间节点`,
      items: buildScheduleItems(summary),
      itemCount: 3,
    };
  }
  return {
    templateId: 'message-todo',
    reason: '承接重点待办和跟进事项',
    priority: 'high',
    title: `${summary.customerName}重点待办`,
    summary: industryData?.todo.summary ?? `${summary.customerIndustry}客户当前需要优先跟进的事项`,
    items: buildTodoItems(summary),
    itemCount: 3,
  };
}

export function buildPortalDraft(summary: PortalSummary): PortalDraft {
  const baseTemplates = ['message-todo', 'news-carousel', 'my-schedule', 'quick-access'];
  const highlightedTemplates = summary.highlightedCards
    .map(mapHighlightToTemplateId)
    .filter((value): value is string => Boolean(value));
  const orderedTemplateIds = Array.from(new Set([...highlightedTemplates, ...baseTemplates])).slice(0, 4);
  const workspaceSeed = orderedTemplateIds.map((templateId) => buildSeedItem(summary, templateId));

  return {
    themeDirection: `${summary.customerIndustry}行业下的${summary.visualPreference}门户视觉方向`,
    workspaceSeed,
    generatedAt: Date.now(),
  };
}

export function buildPortalSummaryPrompt(summary: PortalSummary): string {
  return [
    '请先确认当前门户摘要：',
    `- 客户名称：${summary.customerName}`,
    `- 客户行业：${summary.customerIndustry}`,
    `- 客户核心职能/业务特征：${summary.customerFunctions.join('、')}`,
    `- 本次门户用途：${summary.portalPurpose}`,
    `- 重点卡片/重点信息：${summary.highlightedCards.join('、')}`,
    `- 品牌/视觉倾向：${summary.visualPreference}`,
    `- 门户结构理解：${summary.structureUnderstanding.join(' ')}`,
    `- 页面风格理解：${summary.styleUnderstanding}`,
    '',
    '如果没有问题，请直接回复“确认”或“就这样，开始生成”；如果要修改，请直接补充缺失或不准确的信息。',
  ].join('\n');
}

export function buildPortalCollectionPrompt(missingFields: PortalIntakeField[]): string {
  const labelMap: Record<PortalIntakeField, string> = {
    customerName: '客户名称',
    customerIndustry: '客户行业',
    customerFunctions: '客户核心职能/业务特征',
    portalPurpose: '本次门户用途',
    highlightedCards: '希望突出哪些卡片或信息',
    visualPreference: '品牌/视觉倾向',
  };
  const lines = missingFields.map((field, index) => `${index + 1}. ${labelMap[field]}`);
  return [
    '我先不急着生成，还需要补齐这次客户的关键信息：',
    ...lines,
    '',
    '你可以直接按“字段：内容”回复，我会继续帮你整理摘要并进入生成。',
  ].join('\n');
}

export function createPortalGenerationPrompt(summary: PortalSummary): string {
  return [
    `请基于已经确认的客户摘要，为 ${summary.customerName} 生成门户视觉预览。`,
    `行业：${summary.customerIndustry}`,
    `用途：${summary.portalPurpose}`,
    `重点卡片：${summary.highlightedCards.join('、')}`,
    `视觉倾向：${summary.visualPreference}`,
    `结构理解：${summary.structureUnderstanding.join(' ')}`,
  ].join('\n');
}

// ── Phase C: Requirement summary ──

/**
 * Build a RequirementSummary from profile + card library metadata.
 * This is the "需求理解确认" step, distinct from profile field confirmation.
 */
export function buildRequirementSummary(
  profile: PortalCustomerProfile,
  cardTemplates?: CardTemplateListItem[],
): RequirementSummary {
  const highlightedCards = profile.highlightedCards ?? [];
  const functions = profile.customerFunctions ?? [];

  // Determine portal goal from profile fields
  const portalGoal = profile.portalPurpose
    ? `为${profile.customerName ?? '客户'}构建${profile.portalPurpose}，面向${profile.customerIndustry ?? '综合行业'}行业`
    : `为${profile.customerName ?? '客户'}构建门户方案`;

  // Requested capabilities: from highlightedCards + functions
  const requestedCapabilities = Array.from(new Set([
    ...highlightedCards,
    ...functions,
  ]));

  // Style preferences from visualPreference
  const stylePreferences: string[] = [];
  if (profile.visualPreference) {
    stylePreferences.push(profile.visualPreference);
  }

  // Match capabilities against card library
  const coverableCards: string[] = [];
  const uncoveredNeeds: UncoveredNeed[] = [];

  if (cardTemplates && cardTemplates.length > 0) {
    for (const cap of requestedCapabilities) {
      const match = cardTemplates.find((t) =>
        t.enabled !== false && (
          (t.capabilityTags && t.capabilityTags.some((tag) => cap.includes(tag))) ||
          (t.industryTags && t.industryTags.some((tag) => cap.includes(tag))) ||
          (t.scenarioTags && t.scenarioTags.some((tag) => cap.includes(tag))) ||
          cap.includes(t.name)
        ),
      );
      if (match) {
        if (!coverableCards.includes(match.name)) coverableCards.push(match.name);
      } else {
        uncoveredNeeds.push({
          id: `uncovered-${uncoveredNeeds.length + 1}`,
          label: cap,
          reason: `当前卡片库中没有直接匹配「${cap}」的卡片`,
          requestedCapability: cap,
        });
      }
    }
  } else {
    // Without card library, treat all highlighted cards as coverable
    coverableCards.push(...highlightedCards);
  }

  // Build assumptions from profile
  const assumptions: string[] = [];
  if (profile.customerIndustry) {
    assumptions.push(`行业默认配置：基于${profile.customerIndustry}行业的常见门户结构`);
  }
  if (highlightedCards.length === 0) {
    assumptions.push('用户未指定重点卡片，将使用行业通用卡片布局');
  }
  if (!profile.visualPreference) {
    assumptions.push('用户未指定视觉偏好，将根据行业特征选择默认风格');
  }

  return {
    portalGoal,
    requestedCapabilities,
    stylePreferences,
    assumptions,
    coverableCards: coverableCards.length > 0 ? coverableCards : undefined,
    uncoveredNeeds: uncoveredNeeds.length > 0 ? uncoveredNeeds : undefined,
  };
}

/**
 * Format RequirementSummary as a readable chat message for user confirmation.
 */
export function buildRequirementSummaryPrompt(summary: RequirementSummary): string {
  const lines: string[] = [
    '📋 **需求理解确认**\n',
    `**门户目标**: ${summary.portalGoal}`,
    `**模块需求**: ${summary.requestedCapabilities.join('、')}`,
  ];

  if (summary.stylePreferences.length > 0) {
    lines.push(`**风格偏好**: ${summary.stylePreferences.join('、')}`);
  }

  if (summary.coverableCards && summary.coverableCards.length > 0) {
    lines.push(`**可覆盖卡片**: ${summary.coverableCards.join('、')}`);
  }

  if (summary.uncoveredNeeds && summary.uncoveredNeeds.length > 0) {
    lines.push(`**未覆盖需求**:`);
    for (const need of summary.uncoveredNeeds) {
      lines.push(`  - ${need.label}: ${need.reason}`);
    }
  }

  if (summary.assumptions.length > 0) {
    lines.push(`**AI 假设**:`);
    for (const assumption of summary.assumptions) {
      lines.push(`  - ${assumption}`);
    }
  }

  lines.push('\n如果没有问题，请回复"确认"开始生成；如需修改请直接说明。');
  return lines.join('\n');
}

// ── B2: Card library validation functions ──

/**
 * Build a card library summary for AI prompt injection.
 * Only includes what AI needs: ID, name, tags, aiWritable fields with key/label/type/options/itemSchema.
 * Does NOT include full backend schema details, non-aiWritable fields, or admin metadata.
 */
export function buildCardLibraryPromptSummary(templates: CardTemplateListItem[]): string {
  if (!templates || templates.length === 0) return '';
  const lines = templates
    .filter((t) => t.enabled !== false)
    .map((t) => {
      const aiFields = (t.fields || [])
        .filter((f) => f.aiWritable !== false)
        .map((f) => {
          let desc = `${f.key}(${f.label}, ${f.type}`;
          if (f.type === 'select' && f.options && f.options.length > 0) {
            desc += `, options: ${f.options.join('/')}`;
          }
          if (f.type === 'list' && f.itemSchema && Object.keys(f.itemSchema).length > 0) {
            desc += `, itemSchema: ${JSON.stringify(f.itemSchema)}`;
          }
          desc += ')';
          return desc;
        });
      const tags = [
        ...(t.industryTags || []),
        ...(t.capabilityTags || []),
        ...(t.scenarioTags || []),
      ].join(', ');
      return `- ${t.id}: ${t.name}${tags ? ` [${tags}]` : ''}${aiFields.length > 0 ? ` | 可写字段: ${aiFields.join(', ')}` : ''}`;
    });
  return `## 可用卡片库（AI 只能从中选择）\n${lines.join('\n')}\n\n规则：只能选择以上卡片模板，不能发明新卡片。只能填写 aiWritable 字段。未覆盖的需求列入 uncoveredNeeds。`;
}

export interface CardSelectionValidationResult {
  valid: Array<{
    templateId: string;
    instanceProps: Record<string, unknown>;
    rejectedFields: string[];
  }>;
  rejected: Array<{
    templateId: string;
    reason: string;
  }>;
}

/**
 * Validate AI card selections against the card library.
 * Rejects unknown templateIds and disabled templates.
 * Filters instanceProps to only aiWritable fields.
 */
export function validateCardSelection(
  aiCards: Array<{ templateId: string; instanceProps?: Record<string, unknown> }>,
  availableTemplates: CardTemplateListItem[],
): CardSelectionValidationResult {
  const templateMap = new Map(availableTemplates.map((t) => [t.id, t]));
  const valid: CardSelectionValidationResult['valid'] = [];
  const rejected: CardSelectionValidationResult['rejected'] = [];

  for (const card of aiCards) {
    const template = templateMap.get(card.templateId);

    if (!template) {
      rejected.push({
        templateId: card.templateId,
        reason: `未知模板 ID: ${card.templateId}`,
      });
      continue;
    }

    if (template.enabled === false) {
      rejected.push({
        templateId: card.templateId,
        reason: `模板已禁用: ${card.templateId}`,
      });
      continue;
    }

    const filtered = filterAIWritableProps(template, card.instanceProps ?? {});
    valid.push({
      templateId: card.templateId,
      instanceProps: filtered.props,
      rejectedFields: filtered.rejected,
    });
  }

  return { valid, rejected };
}

/**
 * Filter instanceProps to only include aiWritable fields from the template schema.
 * Returns both the filtered props and the list of rejected field keys.
 */
export function filterAIWritableProps(
  template: CardTemplateListItem,
  proposedProps: Record<string, unknown>,
): { props: Record<string, unknown>; rejected: string[] } {
  const fields = template.fields || [];
  const aiWritableKeys = new Set(
    fields.filter((f) => f.aiWritable !== false).map((f) => f.key),
  );
  const schemaKeys = new Set(fields.map((f) => f.key));

  const props: Record<string, unknown> = {};
  const rejected: string[] = [];

  for (const [key, value] of Object.entries(proposedProps)) {
    if (!schemaKeys.has(key)) {
      rejected.push(`${key} (未定义字段)`);
      continue;
    }
    if (!aiWritableKeys.has(key)) {
      rejected.push(`${key} (非 aiWritable)`);
      continue;
    }
    props[key] = value;
  }

  return { props, rejected };
}

// ── Phase F: Case library dual-purpose ──

/**
 * Anonymize a RequirementSummary for case library storage.
 * Removes customer-specific information, keeps industry/style/layout patterns.
 */
export function anonymizeRequirementSummary(summary: RequirementSummary): RequirementSummary {
  return {
    portalGoal: summary.portalGoal
      .replace(/[\u4e00-\u9fa5]{2,}(?:公司|集团|有限|股份|企业|科技|网络)/g, '某企业')
      .replace(/[\u4e00-\u9fa5]{2,}(?:银行|医院|学校|政府|局|厅|部|委)/g, '某机构'),
    requestedCapabilities: summary.requestedCapabilities,
    stylePreferences: summary.stylePreferences,
    assumptions: summary.assumptions.filter(
      (a) => !a.includes('客户') && !a.includes('名称'),
    ),
    coverableCards: summary.coverableCards,
    uncoveredNeeds: summary.uncoveredNeeds?.map((n) => ({
      ...n,
      reason: n.reason.replace(/「[^」]+」/g, '「该能力」'),
    })),
  };
}

/**
 * Build a reference prompt from case library entries for AI generation.
 * Only uses referenceEnabled cases, and only references style/layout — never specific content.
 */
export function buildCaseReferencePrompt(cases: Array<{ industry: string; summary: string; anonymizedRequirement?: string }>): string {
  if (!cases || cases.length === 0) return '';
  const lines = cases.map((c) => {
    const parts = [`[${c.industry || '综合行业'}]`];
    if (c.summary) parts.push(c.summary);
    if (c.anonymizedRequirement) parts.push(`需求: ${c.anonymizedRequirement.substring(0, 100)}`);
    return parts.join(' — ');
  });
  return `## 同行业案例参考（仅供参考风格和布局方向，不可复制具体内容）\n${lines.join('\n')}\n`;
}
