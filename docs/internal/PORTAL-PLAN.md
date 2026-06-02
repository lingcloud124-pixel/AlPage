# AlPage PortalPlan 三层编辑模型

> 版本：v1.0
> 更新日期：2026-05-29
> 适用对象：产品经理、方案设计人员、研发同学、后续接手的大模型

---

## 1. 文档目的

本文档定义 AlPage 的核心产物 `PortalPlan`，以及围绕 `PortalPlan` 的三层编辑模型、双通道编辑方式、行业案例库沉淀规则和第一版实现边界。

当本文档与历史 Theme Studio、主题自动化或导出打包相关文档冲突时，以本文档为准。

---

## 2. 产品背景

AlPage 是面向售前人员的 Portal Agent 工作台。产品正在从旧的“主题设计与导出工具”升级为“生成可持续编辑的客户门户方案”。

新的门户生成能力不应只输出一张静态预览，也不应只输出主题色、背景图或模板截图，而应输出一份可保存、可分享、可再次编辑、可沉淀为行业案例的 `PortalPlan`。

---

## 3. 核心定义

`PortalPlan` 是 AlPage 的门户方案对象，也是后续预览、编辑、保存、分享、再次编辑和案例沉淀的唯一事实源。

`PortalPlan` 需要承载：

- 企业资料和行业上下文
- 主题、页眉、导航、banner 和广告轮转图
- 工作区卡片整体呈现规则
- 工作区卡片区域位置和大小规则
- 具体卡片内容
- 对话式编辑和配置式编辑产生的修改记录
- 保存、分享、再次编辑所需的最终门户状态
- 沉淀到行业案例库所需的门户方案快照

关键原则：预览、保存、分享、再次编辑、案例库都只读取 `PortalPlan`，不能各自维护独立门户状态。

---

## 4. 三层控制模型

### 4.1 第一层：主题层

主题层控制门户外层视觉骨架，解决“这个门户看起来像谁、是什么气质”。

范围：

- 主题色、辅助色、背景色
- 页眉样式
- 导航样式
- banner / 广告轮转图
- 登录页与主页的基础视觉方向
- 企业品牌气质关键词

用户可以让 Portal Agent 根据企业介绍自动生成主题，也可以手动调整颜色、页眉、导航和轮播图。

局部重新生成主题层时，只能影响主题层，不应覆盖工作区规则和卡片内容。

### 4.2 第二层：工作区规则层

工作区规则层控制所有卡片的统一呈现方式、区域位置和大小，解决“门户整体排布是否有秩序、重点卡片是否被放在正确区域”。

范围：

- 卡片圆角
- 卡片间距
- 卡片阴影
- 卡片背景
- 卡片标题样式
- 卡片密度：紧凑、标准、宽松
- 栅格规则：列数、行高、边距
- 卡片区域位置：所在区域、起始列、起始行
- 卡片大小：跨列数、跨行数、最小宽高、最大宽高
- 区域布局：顶部重点区、左侧导航区、主信息区、辅助信息区等
- 整体排布模式：信息密集型、展示型、运营看板型

这一层不直接改变某张卡片的业务内容，但会决定每张卡片在门户中的位置、尺寸和视觉权重。

### 4.3 第三层：卡片内容层

卡片内容层控制每张卡片展示什么，解决“这张卡片为什么适合当前客户”。

第一版先围绕现有卡片做深：

- 待办
- 新闻轮播
- 日程
- 快捷入口

每张卡片至少需要支持：

- 标题
- 摘要
- 标签或徽标
- 列表项
- 链接或入口名称
- 内容来源说明
- 企业资料映射理由

核心要求：卡片内容必须由企业介绍、行业、企业文化、业务特征和门户用途转化而来，避免通用占位内容。

---

## 5. 双通道编辑

AlPage 保留两种编辑方式：

- 对话式编辑
- 配置式编辑

两种方式必须操作同一份 `PortalPlan`。

示例映射：

- 用户说“整体更稳重一点” -> 修改主题层
- 用户说“卡片间距小一点” -> 修改工作区规则层
- 用户说“把待办放大并放到左上角” -> 修改工作区规则层
- 用户说“内容更像能源集团内部门户” -> 修改卡片内容层
- 用户在配置面板改圆角 -> 修改工作区规则层
- 用户在配置面板拖动卡片位置或调整卡片大小 -> 修改工作区规则层
- 用户在卡片内容面板改新闻标题 -> 修改卡片内容层

对话模式和配置编辑模式互斥显示，避免界面拥挤。

---

## 6. 交互方式

### 6.1 默认对话模式

默认进入对话模式：

- 左侧：Portal Agent 对话
- 右侧：门户预览
- 用户通过自然语言输入客户需求、企业介绍和修改意见

### 6.2 配置编辑模式

用户点击“编辑配置”时：

- 收起 Agent 对话
- 中间保留门户预览
- 右侧打开配置面板
- 首次进入主题面板，之后记住上次编辑的 tab

配置面板包含三个 tab：

- 主题
- 工作区规则
- 卡片内容

用户点击 Agent 入口或“返回对话”时：

- 关闭配置面板
- 展开 Agent 对话
- Agent 继续基于当前 `PortalPlan` 修改门户

---

## 7. 企业资料与行业案例库

第一版企业资料输入按一段话处理。用户输入企业介绍后，Portal Agent 需要提取：

- 客户名称
- 行业
- 企业介绍摘要
- 企业文化关键词
- 业务关键词
- 门户用途
- 视觉倾向
- 重点卡片或重点信息

所有售前共享一个行业案例库。做过的客户门户会沉淀为后续类似行业门户生成的参考资料。

案例库第一版接入服务端 SQLite，由保存门户动作静默触发沉淀，不在 UI 上额外提示用户。

案例库检索第一版按“行业 + 关键词”完成，不做复杂全文搜索。

案例库记录建议包含：

- 客户名称
- 客户行业
- 企业介绍摘要
- 企业文化关键词
- 业务关键词
- 门户用途
- 采用的主题风格
- 工作区规则模式
- 卡片内容生成模式
- 最终 `PortalPlan` 快照
- 创建人
- 创建时间

当前阶段客户名称不做默认脱敏。后续如有合规或客户隐私要求，再增加脱敏、权限和可见性策略。

---

## 8. 建议状态结构

```ts
interface PortalPlan {
  enterpriseProfile: {
    customerName: string;
    industry: string;
    introduction: string;
    summary: string;
    cultureKeywords: string[];
    businessKeywords: string[];
    portalPurpose: string;
    highlightedCards: string[];
    visualPreference: string;
  };
  themeLayer: {
    themeDirection: string;
    colors: Record<string, string>;
    headerStyle: string;
    navigationStyle: string;
    bannerStrategy: string;
    carouselImages: Array<{
      title: string;
      description: string;
      imageUrl?: string;
    }>;
  };
  workspaceRuleLayer: {
    cardRadius: number;
    cardGap: number;
    cardDensity: 'compact' | 'standard' | 'comfortable';
    shadowStyle: string;
    gridColumns: number;
    rowHeight: number;
    layoutMode: 'dense' | 'showcase' | 'dashboard';
    regions: Array<{
      id: string;
      name: string;
      columns: number;
      rowHeight: number;
      padding: number;
    }>;
    cardPlacements: Array<{
      cardId: string;
      regionId: string;
      column: number;
      row: number;
      columnSpan: number;
      rowSpan: number;
      minColumnSpan?: number;
      maxColumnSpan?: number;
      minRowSpan?: number;
      maxRowSpan?: number;
    }>;
  };
  cardContentLayer: {
    cards: Array<{
      id: string;
      templateId: string;
      title: string;
      summary?: string;
      badge?: string;
      items?: Array<Record<string, unknown>>;
      links?: string[];
      enterpriseMappingReason: string;
    }>;
  };
  editHistory: Array<{
    source: 'agent' | 'config';
    layer: 'theme' | 'workspaceRules' | 'cardContent';
    summary: string;
    createdAt: number;
  }>;
}
```

---

## 9. 第一版范围

第一版重点：

- 建立 `PortalPlan` 状态模型
- 支持企业介绍转企业画像
- 支持三层配置面板
- 支持工作区规则层调整卡片区域位置和大小
- 支持对话和配置面板共同修改 `PortalPlan`
- 支持现有 4 类卡片的企业化内容生成
- 支持共享行业案例库的基础保存与检索
- 支持保存门户时静默沉淀行业案例

暂不优先做：

- 大规模卡片库扩展
- 复杂权限和脱敏
- 多人协作审批
- 行业案例库高级运营后台
- 复杂全文搜索

---

## 10. 验收标准

- 用户可以通过一段企业介绍生成门户方案。
- 生成结果包含主题层、工作区规则层和卡片内容层。
- 用户可以在三个独立配置面板中编辑门户。
- 用户可以在工作区规则层调整卡片区域位置和大小。
- 用户可以通过对话修改同一份门户方案。
- 对话模式和配置编辑模式互斥显示。
- 卡片内容能体现企业介绍、行业、文化和业务特征。
- 用户保存门户时，系统自动静默沉淀行业案例。
- 后续类似行业生成时，Agent 可以按行业和关键词参考历史案例生成新方案。

---

## 11. 文档关系

建议阅读顺序：

1. `docs/internal/PRODUCT-ALIGNMENT.md`
2. `docs/internal/PRODUCT.md`
3. `docs/internal/PORTAL-PLAN.md`
4. `docs/PRD-产品使用流程.md`
5. `docs/internal/workflows/00-端到端流程.md`

历史 Theme Studio、主题自动化和导出打包文档仅作为实现背景参考，不应覆盖本文档定义的 AlPage 主线。
