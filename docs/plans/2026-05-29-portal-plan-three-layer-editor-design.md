# Portal Plan 三层编辑模型设计

## 背景

当前产品目标是面向售前的 Portal Agent 工作台。新的门户生成能力需要从“生成主题预览”升级为“生成可控的客户门户方案”。门户方案需要支持三层控制：主题外观、工作区规则、卡片内容；同时保留对话式编辑和配置式编辑两种入口。

## 产品目标

Portal Agent 生成的不是一张静态预览，而是一份可持续编辑的 `PortalPlan`。

`PortalPlan` 需要承载：

- 企业资料和行业上下文
- 主题、页眉、导航、广告轮转图
- 工作区卡片整体规则
- 具体卡片内容
- 对话与配置面板产生的修改记录
- 保存、分享、再次编辑所需的最终门户状态

## 三层控制模型

### 第一层：主题面板

主题面板控制门户外层视觉骨架。

范围：

- 主题色、辅助色、背景色
- 页眉样式
- 导航样式
- banner / 广告轮转图
- 登录页与主页的基础视觉方向
- 企业品牌气质关键词

用户可以让 Agent 根据企业介绍自动生成主题，也可以手动调整颜色、页眉、导航和轮播图。局部重新生成时，应只影响当前层，不应覆盖工作区规则和卡片内容。

### 第二层：工作区规则面板

工作区规则面板控制所有卡片的统一呈现方式。

范围：

- 卡片圆角
- 卡片间距
- 卡片阴影
- 卡片背景
- 卡片标题样式
- 卡片密度：紧凑、标准、宽松
- 栅格规则：列数、行高、边距
- 整体排布模式：信息密集型、展示型、运营看板型

这一层解决门户的整体秩序问题。它不直接改变某张卡片的业务内容。

### 第三层：卡片内容面板

卡片内容面板控制每张卡片展示什么。

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

## 双通道编辑

产品保留两种编辑方式：

- 对话式编辑
- 配置式编辑

两种方式必须操作同一份 `PortalPlan`。

示例映射：

- 用户说“整体更稳重一点” -> 修改主题层
- 用户说“卡片间距小一点” -> 修改工作区规则层
- 用户说“内容更像能源集团内部门户” -> 修改卡片内容层
- 用户在配置面板改圆角 -> 修改工作区规则层
- 用户在卡片内容面板改新闻标题 -> 修改卡片内容层

预览、保存、分享、再次编辑都只读取 `PortalPlan`，不能各自维护状态。

## 交互方式

默认进入对话模式。

对话模式：

- 左侧：Portal Agent 对话
- 右侧：门户预览
- 用户通过自然语言输入客户需求、企业介绍和修改意见

配置编辑模式：

- Agent 对话区自动收起为窄栏或入口按钮
- 中间保留门户预览
- 右侧打开编辑面板
- 编辑面板包含三个 tab：主题、工作区规则、卡片内容

用户点击“编辑配置”时：

- 收起 Agent 对话
- 打开右侧配置面板
- 首次进入主题面板，之后记住上次编辑的 tab

用户点击 Agent 入口或“返回对话”时：

- 关闭配置面板
- 展开 Agent 对话
- Agent 继续基于当前 `PortalPlan` 修改门户

对话和配置面板不同时展开，避免界面拥挤。

## 企业资料与行业案例库

第一版企业资料输入按一段话处理。用户输入企业介绍后，Agent 需要提取：

- 客户名称
- 行业
- 企业介绍摘要
- 企业文化关键词
- 业务关键词
- 门户用途
- 视觉倾向
- 重点卡片或重点信息

所有售前共享一个行业案例库。做过的客户会沉淀为后续类似行业门户生成的参考资料。

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
- 最终门户方案快照
- 创建人
- 创建时间

当前阶段客户名称不做默认脱敏。后续如有合规或客户隐私要求，再增加脱敏、权限和可见性策略。

## 建议状态结构

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

## 第一版范围

第一版重点：

- 建立 `PortalPlan` 状态模型
- 支持企业介绍转企业画像
- 支持三层配置面板
- 支持对话和配置面板共同修改 `PortalPlan`
- 支持现有 4 类卡片的企业化内容生成
- 支持共享行业案例库的基础保存与检索

暂不优先做：

- 大规模卡片库扩展
- 复杂权限和脱敏
- 多人协作审批
- 行业案例库高级运营后台

## 验收标准

- 用户可以通过一段企业介绍生成门户方案。
- 生成结果包含主题层、工作区规则层和卡片内容层。
- 用户可以在三个独立配置面板中编辑门户。
- 用户可以通过对话修改同一份门户方案。
- 对话模式和配置编辑模式互斥显示。
- 卡片内容能体现企业介绍、行业、文化和业务特征。
- 完成过的客户门户可以沉淀到共享行业案例库。
- 后续类似行业生成时，Agent 可以参考历史案例生成新方案。
