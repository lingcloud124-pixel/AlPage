# 🎨 Theme Color Engine Spec v1.0

（主题色生成规则规范文档）

---

## 0. 文档定位

本规范用于构建：

> **主题色自动生成引擎（Theme Color Engine）**

目标：

- 从图片 / 语义 / 输入色生成**稳定可用主题色**
- 自动规避：
  - 灰色主题 ❌
  - 过浅导致不可读 ❌
  - 对比不足 ❌
- 输出符合设计系统的完整 Token

---

## 1. 核心原则

### 1.1 色彩空间原则

统一使用 **HSL 色彩空间**

- Hue（色相）：表达语义（红/蓝/绿）
- Saturation（饱和度）：控制纯度
- Lightness（亮度）：控制可读性

### 1.2 可读性原则

必须满足：

- 普通文本对比度 ≥ 4.5:1
- UI 元素 ≥ 3:1

否则必须自动修正颜色。

### 1.3 禁止直接取色

禁止：

```text
从图片像素直接作为主题色
```

必须经过：

```text
提取 → 过滤 → 修正 → 校验 → 输出
```

---

## 2. 输入定义

```json
{
  "input_type": "image | color | semantic",
  "value": "image_path | #hex | text",
  "mode": "light | dark"
}
```

---

## 3. 主色提取（Color Extraction）

### 3.1 图像预处理

1. resize → 100x56
2. 色彩量化（K = 5~8）
3. 获取颜色 clusters

### 3.2 过滤规则

删除以下颜色：

```text
L > 85%   （过亮）
L < 20%   （过暗）
S < 20%   （灰色）
```

### 3.3 主色选择

选择像素占比最大的颜色 cluster

输出：

```text
primary_candidate
```

---

## 4. 主色修正（Normalization）

### 4.1 标准区间

```text
S: 50% ~ 70%
L: 45% ~ 60%
```

### 4.2 修正规则

```python
if S < 40:
    S = clamp(50, 70)

if L < 35:
    L = clamp(45, 55)

if L > 70:
    L = clamp(55, 65)
```

### 4.3 Hue 规则

Hue 保持不变。

---

## 5. 禁止色规则（Hard Constraints）

以下颜色不可作为主题色：

```text
S < 20%   → 灰色
L > 80%   → 过亮
L < 25%   → 过暗
```

---

## 6. 对比度规则（Contrast）

### 6.1 自动文字色

```python
if L(primary) > 60:
    text = "#333333"
else:
    text = "#FFFFFF"
```

### 6.2 对比度校验

```text
contrast(primary, text) ≥ 4.5
```

不满足：

```text
调整 Lightness（±5% ~ 10%）
```

---

## 7. 主题变量生成（Token System）

### 7.1 核心变量

```scss
$primary-color = primary

$primary-hover = adjust(primary, L + 8%)
$primary-active = adjust(primary, L - 8%)

$primary-light-10 = mix(#FFFFFF, primary, 10%)
$primary-light-20 = mix(#FFFFFF, primary, 20%)
$primary-light-30 = mix(#FFFFFF, primary, 30%)

$primary-dark-10 = darken(primary, 10%)
$primary-dark-20 = darken(primary, 20%)
```

### 7.2 扩展变量

```scss
$alter-color = darken(primary, 10%)

$alter-color-hover = mix(#FFFFFF, primary, 60%)

$header-extend = mix(#FFFFFF, primary, 5%)

$login-bg = mix(#FFFFFF, primary, 3%)

$border-icon = mix(#D8D8D8, primary, 5%)

$sidebar-panel = mix(#FFFFFF, primary, 5%)

$sidebar-icon = mix(#8A8A8A, primary, 20%)
```

---

## 8. Fallback 机制（兜底）

### 8.1 标准色库

```json
[
  "#d20000",
  "#f4610a",
  "#eac700",
  "#07b11f",
  "#0e70ee",
  "#820fea",
  "#b20ebb"
]
```

### 8.2 兜底策略

1. 选择与原始 hue 最接近的颜色
2. 若失败 → 使用默认品牌色

---

## 9. 输出结构

```json
{
  "primary": "#0e70ee",
  "tokens": {
    "primary-hover": "...",
    "primary-active": "...",
    "primary-light-10": "...",
    "primary-dark-10": "..."
  },
  "meta": {
    "source": "image",
    "validated": true
  }
}
```

---

## 10. 处理流程（Pipeline）

```text
输入
 ↓
颜色提取
 ↓
过滤
 ↓
HSL 修正
 ↓
合法性校验
 ↓
对比度校验
 ↓
Token 生成
 ↓
Fallback 兜底
 ↓
输出
```

---

## 11. 可扩展能力（V2）

### 11.1 多主题模式

- Light UI
- Dark UI
- 高对比模式

### 11.2 行业语义

- 金融 → 蓝
- 政务 → 红
- 医疗 → 绿
- 科技 → 蓝紫

### 11.3 AI 联动

- 语义 → 限制色相范围

---

## 12. 一句话总结

本规范将“图片取色”升级为“主题色生成引擎”，通过 HSL 约束、合法性校验与对比度控制，确保主题色稳定、可读、可复用。
