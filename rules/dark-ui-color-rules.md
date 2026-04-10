# Dark-UI 配色规则

## 核心原则

**Dark-UI 是深色主题，配色逻辑与 Light-UI 完全不同。**

---

## 色调偏移规则（⭐ 权威规则）

> **⚠️ 实验性规则**：Dark-UI 尚未完全实现，以下色调偏移规则为设计方案，尚未经过完整端到端验证。示例色值仅供参考。

```
背景色调 → primary → primary-hover (+26°) → header-font (+22°)
```

**关键理解**：主题色调应该配合背景图色调。背景图偏暖则主题偏暖，背景图偏冷则主题偏冷。

### 色调计算方法

1. **确定背景图主色调的色相角度**（HSL 色相 0-360°）
2. **Primary = 背景色调**
3. **Primary-hover = Primary + 26°**
4. **Header-font = Primary + 22°**

### 示例

| 背景色调 | Primary | Primary-hover | Header-font |
|---------|---------|---------------|-------------|
| 深蓝(214°) | #1A1A2E | #4A4A7E (+26°) | #3A3A6E (+22°) |
| 深紫蓝(240°) | #4A3F6B | #7A6FA7 (+26°) | #6A5F97 (+22°) |
| 红色(4°) | #B31A1A | #E67300 (+26°) | #D66600 (+22°) |

---

## 亮度规则

Dark-UI 颜色亮度必须严格排序：

```
alter (亮度≈47-59，最深)
  ↓
primary (亮度≈64-68)
  ↓
alter-hover (亮度≈97-100)
  ↓
primary-hover (亮度≈214-216，极浅！)
  ↓
header-font (亮度≈180+，浅色文字)
```

### 亮度参考值

| 颜色用途 | 亮度范围 | 说明 |
|---------|---------|------|
| alter | 47-59 | 最深，用于卡片/侧边栏背景 |
| primary | 64-68 | 主色，按钮/链接 |
| alter-hover | 97-100 | 较深，hover 状态 |
| primary-hover | 214-216 | **极浅**，hover 状态（容易误用成中等深度） |
| header-font | 180+ | 浅色，文字/图标 |

---

## 变量值对照表

> **注意**：以下"示例"列取自暖色调主题（非深蓝背景），色值仅供格式参考。实际色值必须根据背景图主色调按上方色调偏移规则计算。

| 变量 | 规则 | 示例（深蓝背景，按色调偏移规则计算） |
|------|------|------------------|
| `primary-color` | 背景色调（深色基准） | #1A1A2E |
| `primary-color-hover` | Primary +26°，**极浅色** | #4A4A7E |
| `alter-color` | primary 更深（亮度↓5-10） | #0F3460 |
| `alter-color-hover-on` | primary-hover 变体 | #3A3A6E |
| `header-font-color` | Primary +22°，浅色 | #3A3A6E |
| `sidebar-icon-color` | Primary +22°，亮度73% | #4A4A7E |
| `sidebar-panel-bg` | = header-font（同一色值） | #3A3A6E |
| `sidebar-color` | 固定深灰 | #333333 |
| `login-bg-color` | 深色（主色或alter） | #0F3460 |
| `border-color` | 固定纯灰 | #EEEEEE |
| `border-icon-color` | 固定纯灰 | #EEEEEE |
| `body-bg-color` | 固定 | #F8F8F8 |

### Alter 颜色计算公式

```javascript
// alter-color = primary 降低亮度
alterColor = darken(primary, 15-20%)

// alter-color-hover-on = primary-hover 降低亮度
alterColorHoverOn = darken(primaryHover, 15%)
```

---

## 硬编码颜色替换

pen 文件中可能有残留的硬编码颜色，必须全部替换为变量：

### 必须清除的红色系

```bash
# 替换所有红色硬编码为深色系
sed -i '' 's/#a7160b/[primary-color]/g' "$PEN_FILE"
sed -i '' 's/#94170e/[alter-color]/g' "$PEN_FILE"
sed -i '' 's/#fdd0a3/[primary-color-hover]/g' "$PEN_FILE"
sed -i '' 's/#C41B00/[alter-color]/g' "$PEN_FILE"
```

### 验证无残留

```bash
grep -E "#a7160b|#94170e|#C41B00|#fdd0a3" "$PEN_FILE" | wc -l
# 结果必须为 0
```

---

## ⚠️ 禁止操作清单

- ❌ **primary-hover 使用中等深度** - 必须是极浅色（亮度≈216）
- ❌ **文字色使用深色** - Dark-UI 文字是浅色
- ❌ **sidebar-panel-bg 与 header-font 不同** - 必须相同
- ❌ **边框色带调性** - Dark-UI 边框全部纯灰
- ❌ **延展色使用浅色** - Dark-UI 延展色是深色
- ❌ **登录背景使用浅色** - Dark-UI 登录背景是深色

---

## 常见错误

### 错误1：primary-hover 太深

**错误**：primary-hover 使用 #CC6633（亮度≈100）
**正确**：primary-hover 应为 #FFB74D（亮度≈216）

### 错误2：背景图色调与主题色不协调

**问题**：背景图是深紫蓝，但主题色是暖橙
**解决**：主题色调应该从背景图色调计算偏移

### 错误3：残留红色硬编码

**问题**：按钮/链接仍显示红色
**解决**：检查并替换所有 #a7160b, #C41B00 等硬编码

---

## 验证清单

- [ ] 背景图主色调已确定
- [ ] Primary = 背景色调
- [ ] Primary-hover = Primary + 26°
- [ ] Header-font = Primary + 22°
- [ ] primary-hover 亮度≈216（极浅）
- [ ] header-font 亮度 180+（浅色）
- [ ] 无红色硬编码残留
- [ ] sidebar-panel-bg = header-font

---

## 相关文档

- [image-generation-rules.md](./image-generation-rules.md) - 图片生成规则
- [../SKILL.md](../SKILL.md) - 主技能文件
