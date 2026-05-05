export type EnterprisePrimaryFamily =
  | 'blue'
  | 'teal'
  | 'green'
  | 'orange'
  | 'red'
  | 'purple'
  | 'gray';

export interface EnterprisePrimaryPreset {
  hex: string;
  label: string;
  family: EnterprisePrimaryFamily;
  semanticTags: string[];
  industries: string[];
  moods: string[];
  priority: number;
}

export const ENTERPRISE_PRIMARY_PALETTE: EnterprisePrimaryPreset[] = [
  {
    hex: '#0E70EE',
    label: '科技蓝',
    family: 'blue',
    semanticTags: ['科技未来', 'AI', '数字化', '智能办公', '云平台', '科技峰会', '现代科技未来办公平台'],
    industries: ['科技', 'OA', 'AI'],
    moods: ['专业', '现代', '可信', '数字化'],
    priority: 100,
  },
  {
    hex: '#0052D9',
    label: '深科技蓝',
    family: 'blue',
    semanticTags: ['数据中台', '工业互联网', '数字驾驶舱', '运营平台'],
    industries: ['工业', '平台', '大数据'],
    moods: ['稳定', '权威', '企业级'],
    priority: 94,
  },
  {
    hex: '#11A6B8',
    label: '青科技蓝',
    family: 'teal',
    semanticTags: ['协同办公', '协作办公', '协作办公主题', '智慧连接', '企业协作', '生态互联'],
    industries: ['办公', '协同', 'SaaS'],
    moods: ['轻科技', '连接感', '开放'],
    priority: 88,
  },
  {
    hex: '#6091F8',
    label: '轻科技蓝',
    family: 'blue',
    semanticTags: ['创新平台', '轻量AI', '未来办公', '智能助手'],
    industries: ['AI', '创新'],
    moods: ['未来感', '轻盈', '智能'],
    priority: 70,
  },
  {
    hex: '#4BAE39',
    label: '企业生态绿',
    family: 'green',
    semanticTags: ['绿色办公', '低碳企业', '生态协同', '可持续发展'],
    industries: ['ESG', '制造', '环保'],
    moods: ['生机', '成长', '稳定'],
    priority: 84,
  },
  {
    hex: '#D2E112',
    label: '活力黄绿',
    family: 'green',
    semanticTags: ['创新活动', '青春企业', '内部运营活动'],
    industries: ['活动', '年轻团队'],
    moods: ['活力', '积极', '创新'],
    priority: 52,
  },
  {
    hex: '#005CB2',
    label: '商务深蓝',
    family: 'blue',
    semanticTags: ['企业门户', '管理后台', '运营管理', '企业中台'],
    industries: ['企业管理', '金融'],
    moods: ['商务', '可信', '成熟'],
    priority: 92,
  },
  {
    hex: '#C62828',
    label: '政务红',
    family: 'red',
    semanticTags: ['党建', '政务', '公文', '国企', '红色文化', '红色党建文化宣传主题'],
    industries: ['政务', '国企'],
    moods: ['庄重', '正式', '权威'],
    priority: 96,
  },
  {
    hex: '#E95C04',
    label: '企业活力橙',
    family: 'orange',
    semanticTags: ['企业文化', '品牌活动', '周年庆', '共创未来'],
    industries: ['企业文化', '活动'],
    moods: ['温暖', '热情', '成长'],
    priority: 74,
  },
  {
    hex: '#F7AA10',
    label: '节日金橙',
    family: 'orange',
    semanticTags: ['春节', '元旦', '庆典', '表彰', '节日运营'],
    industries: ['节日', '活动'],
    moods: ['喜庆', '明亮', '欢乐'],
    priority: 68,
  },
  {
    hex: '#B56A1E',
    label: '琥珀铜橙',
    family: 'orange',
    semanticTags: ['年会', '峰会', '荣耀时刻', '企业荣誉', '年度荣耀峰会'],
    industries: ['峰会', '高端活动'],
    moods: ['高级', '金属感', '荣耀'],
    priority: 90,
  },
  {
    hex: '#6A2500',
    label: '红棕文化色',
    family: 'orange',
    semanticTags: ['生生不息', '企业精神', '文化传承', '品牌故事', '共筑未来', '生生不息 共筑未来'],
    industries: ['企业文化', '品牌'],
    moods: ['稳重', '厚重', '精神感'],
    priority: 95,
  },
  {
    hex: '#B20808',
    label: '深节庆红',
    family: 'red',
    semanticTags: ['开门红', '企业战报', '重大节庆'],
    industries: ['节庆', '战略活动'],
    moods: ['强烈', '热烈', '节庆感'],
    priority: 82,
  },
  {
    hex: '#1E40AF',
    label: '金融蓝',
    family: 'blue',
    semanticTags: ['银行', '证券', '保险', '投资', '资产管理', '金融资产管理平台'],
    industries: ['金融行业'],
    moods: ['专业', '理性', '稳健'],
    priority: 98,
  },
  {
    hex: '#00804D',
    label: '深商务绿',
    family: 'green',
    semanticTags: ['制造业', '能源', '环保', '国际企业'],
    industries: ['制造', '能源'],
    moods: ['稳定', '国际化', '成熟'],
    priority: 86,
  },
  {
    hex: '#006749',
    label: '墨绿商务',
    family: 'green',
    semanticTags: ['ESG', '生态产业', '绿色科技', '智慧园区'],
    industries: ['生态', '园区'],
    moods: ['高级', '低调', '商务'],
    priority: 80,
  },
  {
    hex: '#4E4EC7',
    label: '智能紫蓝',
    family: 'purple',
    semanticTags: ['AI Agent', '智能体', '算法平台', '未来科技'],
    industries: ['AI', '智能化'],
    moods: ['科技', '未来', '智能'],
    priority: 78,
  },
  {
    hex: '#81459D',
    label: '高级紫',
    family: 'purple',
    semanticTags: ['战略发布', '创新品牌', '高端论坛'],
    industries: ['高端品牌', '峰会'],
    moods: ['高级感', '创新', '品牌化'],
    priority: 72,
  },
  {
    hex: '#354079',
    label: '深空蓝灰',
    family: 'gray',
    semanticTags: ['企业战略', '数字空间', '沉浸式平台', '深色主题'],
    industries: ['Dashboard', '战略平台'],
    moods: ['深邃', '专业', '高级'],
    priority: 76,
  },
];
