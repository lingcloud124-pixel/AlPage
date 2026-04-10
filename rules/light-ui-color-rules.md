# Light-UI 配色规则

## 核心原则

**Light-UI 是浅色主题，配色逻辑与 Dark-UI 相反。**

---

## 变量值对照表

| 变量名 | 默认值 | 替换为 |
|--------|--------|--------|
| `primary-color` | `#2C615C` | `{primary}` |
| `primary-color-hover` | `#228077` | `{primaryHover}` |
| `alter-color` | `#144E48` | 深一号的 primary（降低饱和度/明度） |
| `alter-color-hover-on` | `#56817D` | primaryHover 浅版（增加明度） |
| `primary-color-opacity-10` | `#EAF0EF` | 10%透明度版本（主色 10% + 白色 90%） |
| `primary-color-opacity-20` | `#D5DFDE` | 20%透明度版本（主色 20% + 白色 80%） |
| `primary-color-opacity-30` | `#C0D0CF` | 30%透明度版本（主色 30% + 白色 70%） |
| `header-font-color` | `#333333` | 文字色 |
| `login-bg-color` | `#FDFFF6` | 内容背景色 |
| `portal-header-bg-extend-color` | `#FBFCF2` | 侧边栏背景色 |

---

## 颜色计算公式

### 1. 透明度变体（白色混合法）

```javascript
// 10% 透明度 = 主色 10% + 白色 90%
primaryOpacity10 = blendWhite(primary, 0.1)

// 20% 透明度 = 主色 20% + 白色 80%
primaryOpacity20 = blendWhite(primary, 0.2)

// 30% 透明度 = 主色 30% + 白色 70%
primaryOpacity30 = blendWhite(primary, 0.3)
```

**计算示例**（Primary = `#E53935` 红色）：

| 变量 | 主色占比 | 结果 |
|------|---------|------|
| primary-opacity-10 | 10% | `#FFEBEE` |
| primary-opacity-20 | 20% | `#FFCDD2` |
| primary-opacity-30 | 30% | `#EF9A9A` |

### 2. Alter 颜色（加深/饱和度降低）

```javascript
// alter-color = 主色降低饱和度和明度
alterColor = desaturate(darken(primary, 15%), 20%)

// alter-color-hover-on = primaryHover 增加明度
alterColorHoverOn = lighten(primaryHover, 15%)
```

### 3. 亮度排序（从浅到深）

```
primary-hover (最浅，hover)
  ↓
primary (主色)
  ↓
alter (较深)
  ↓
alter-hover (最深)
```

---

## 亮度参考值

| 颜色用途 | HSL 明度范围 | 说明 |
|---------|-------------|------|
| primary-hover | 65-80% | hover 状态，最浅 |
| primary | 45-60% | 主色 |
| alter | 35-50% | 辅助色，较深 |
| alter-hover | 25-40% | 深辅助色 |

**注意**：亮度参考值是 HSL 的 L 值，适用于所有色相。红色系（0°）、绿色系（120°）、蓝色系（240°）都适用。

---

## ⚠️ 禁止操作清单

- ❌ **primary 使用深色** - Light-UI 主色应该是中浅色
- ❌ **文字色使用浅色** - Light-UI 文字是深色 (#333333)
- ❌ **透明度使用错误的叠加** - Light-UI 用主色叠加，不是灰色

---

## 验证清单

- [ ] primary 是中浅色（亮度 45-60%）
- [ ] primary-hover 比 primary 浅
- [ ] alterColor 比 primary 深
- [ ] header-font-color 是深色 (#333333)
- [ ] 透明度变体计算正确（白色混合法）
- [ ] alterColor 和 alterColorHoverOn 已计算
- [ ] 整体配色清新明亮

---

## 相关文档

- [dark-ui-color-rules.md](./dark-ui-color-rules.md) - Dark-UI 配色规则
- [image-generation-rules.md](./image-generation-rules.md) - 图片生成规则
- [../SKILL.md](../SKILL.md) - 主技能文件
