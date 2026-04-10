# 切图导出规则

> **用途**：确保 Pen 文件切图输出与样例包结构、命名、尺寸完全一致

---

## 一、登录页背景图导出

### Dark-UI 模板

| 切图类型 | Pen 节点 ID | 输出尺寸 | 输出格式 | 输出文件名 |
|---------|------------|---------|---------|-----------|
| V系列背景图 | `PAgAA` | 2215 × 1080 | JPG | `bg-login.jpg` |
| 登录页整体 | `nXv3Y` | 2215 × 1080 | JPG | `login_thumb.jpg` |
| 工作台整体 | `dKOHu` | 1920 × 1079 | PNG | `desktop.png`、MK缩略图 |
| MK系列背景图 | `PAgAA`（裁剪） | 1920 × 1080 | PNG | `background.png` |

**裁剪参数**（MK系列）：
```bash
# 居中裁剪：左右各裁掉 147.5px
convert "原始导出.jpg" -crop 1920x1080+147+0 +repage "background.png"
```

---

## 二、页眉背景导出

### Dark-UI 模板

| 切图类型 | Pen 节点 ID | 输出尺寸 | 输出文件名 |
|---------|------------|---------|-----------|
| 默认页眉背景 | `y6LPs` | 1920 × 60 | `header_tlayout_frame_bg.png` |
| 简洁页眉背景 | `y6LPs` | 1920 × 60 | `header_simple_frame_bg.png` |
| 多页签页眉背景 | `y6LPs` | 1920 × 60 | `header_zone_frame_bg.png` |
| 导航页眉背景 | `y6LPs` | 1920 × 60 | `header_zone_nav_frame_bg.png` |
| 菜单页眉背景 | `KDpQp` | 1920 × 130 | `header_menu_frame_bg.png` |
| 复杂页眉背景 | `CagmA` | 1920 × 90 | `header_complex_frame_bg.png` |
| 横幅页眉 | `K7n6g` | 2560 × 480 | `header-banner.png` |
| 侧边页眉 | `zmpSH` | 200 × 488 | `header-sideheader.png` |

### Light-UI 模板

| 切图类型 | Pen 节点 ID | 输出尺寸 | 输出文件名 |
|---------|------------|---------|-----------|
| 登录页背景 | `LiN3g` | 2215 × 1080 | `bg-login.jpg` |
| 登录页整体 | `nXv3Y` | 2215 × 1080 | `login_thumb.jpg` |
| 工作台整体 | `dKOHu` | 1920 × 1079 | `desktop.png`、MK缩略图 |
| 默认页眉背景 | `A7bgM` | 1920 × 60 | `header_tlayout_frame_bg.png` |
| 复杂页眉背景 | `TdfhH` | 1920 × 90 | `header_complex_frame_bg.png` |
| 菜单页眉背景 | `C0kVM` | 1920 × 130 | `header_menu_frame_bg.png` |
| 横幅页眉 | `Nk9d0` | 2560 × 480（需裁剪 y+30） | `header-banner.png` |
| 侧边页眉 | `jTA4O` | 200 × 900 | `header-sideheader.png` |

---

## 三、Pencil MCP 导出命令

### 连接状态检查

```javascript
pencil_get_editor_state({ include_schema: false })
```

### 导出节点（PNG 格式）

```javascript
pencil_export_nodes({
  filePath: "designs/Topic-熊猫咪咪晚上睡觉看星星-1775641377.pen",
  nodeIds: ["PAgAA", "K7n6g", "y6LPs", "CagmA", "KDpQp", "zmpSH"],
  outputDir: "output/panda-night",
  format: "png",
  scale: 1
})
```

### 导出节点（JPG 格式，用于登录背景）

```javascript
pencil_export_nodes({
  filePath: "designs/Topic-熊猫咪咪晚上睡觉看星星-1775641377.pen",
  nodeIds: ["PAgAA"],
  outputDir: "output/panda-night",
  format: "jpeg",
  scale: 1
})
```

---

## 四、裁剪命令（macOS sips / ImageMagick convert）

> **注意**：`sips` 为 macOS 自带工具，`convert` (ImageMagick) 为跨平台工具。实际工作流中使用 `convert`（参见 [03-导出素材流程.md](../workflows/03-导出素材流程.md)），此处 `sips` 命令作为参考。

### MK系列背景图裁剪（2215→1920）

```bash
sips --cropWidth 1920 --cropHeight 1080 \
     --cropOffset 147.5 0 \
     "bg-login.png" --out "background.png"
```

### MK系列 Banner 页眉裁剪（Dark-UI 2561→2560）

```bash
sips --cropWidth 2560 --cropHeight 480 \
     --cropOffset 0 30 \
     "header-banner.png" --out "header-banner.png"
```

### MK系列经典页眉裁剪（90→80）

```bash
sips --cropHeight 80 --cropOffset 0 5 \
     "header-complex.png" --out "header-classic.png"
```

---

## 五、节点 ID 快速查询

| 模板 | 节点用途 | 节点 ID | 子节点 ID |
|------|---------|---------|-----------|
| Light-UI | 登录页背景组件 | `LiN3g` | `qSBnY` |
| Light-UI | 登录页整体截图 | `nXv3Y` | - |
| Light-UI | 工作台整体截图 | `dKOHu` | - |
| Light-UI | 右渐变组件 | `w0ZQA` | `RWYIx` |
| Light-UI | 左渐变组件 | `Ffk1f` | `6U9v0` |
| Light-UI | 页眉背景(60px) | `A7bgM` | - |
| Light-UI | 复杂页眉(90px) | `TdfhH` | - |
| Light-UI | 菜单页眉(130px) | `C0kVM` | - |
| Light-UI | 横幅页眉 | `Nk9d0` | - |
| Light-UI | 侧边页眉 | `jTA4O` | - |
| Dark-UI | 登录页背景组件 | `PAgAA` | `02cTp` |
| Dark-UI | 登录页整体截图 | `nXv3Y` | - |
| Dark-UI | 工作台整体截图 | `dKOHu` | - |
| Dark-UI | 右渐变组件 | `XQPAz` | `aRs7H` |
| Dark-UI | 左渐变组件 | `Ckc3l` | `wPSk8` |
| Dark-UI | 页眉背景(60px) | `y6LPs` | - |
| Dark-UI | 复杂页眉(90px) | `CagmA` | - |
| Dark-UI | 横幅页眉 | `K7n6g` | - |
| Dark-UI | 菜单页眉(130px) | `KDpQp` | - |
| Dark-UI | 侧边页眉 | `zmpSH` | - |

---

## 六、质量检查清单

```
□ 尺寸核对
  □ V系列背景图：2215 × 1080
  □ MK系列背景图：1920 × 1080
  □ login_thumb.jpg：960 × 540
  □ desktop.png：1440 × 800
  □ MK缩略图：1600 × 572
  □ thumb-1/2.jpg：800 × 390
  
□ 格式核对
  □ V系列背景图：JPG 格式
  □ MK系列背景图：PNG 格式
  □ login_thumb.jpg：JPG 格式
  
□ 命名核对
  □ V系列文件名：bg-login.jpg
  □ MK系列文件名：background.png
  □ login_thumb.jpg（缩略图）
  
  □ 路径核对
  □ 保存到 output/{date}-{nameEn}/素材包/ 目录
```

---

## 七、Pencil MCP 连接问题排查

**如果 `pencil_get_editor_state` 返回 `Not connected`**：

1. **确保 Pencil 桌面应用正在运行**
   ```bash
   pgrep -fl Pencil
   ```

2. **检查 MCP 服务状态**
   ```bash
   claude mcp list
   ```

3. **在 Pencil 中连接 MCP**
   - 打开 Pencil 桌面应用
   - 菜单：File → MCP Server → Connect

4. **重启 Claude Code 会话**

---

## 八、相关文档

- [image-generation-rules.md](./image-generation-rules.md) - 图片生成规则
- [dark-ui-color-rules.md](./dark-ui-color-rules.md) - Dark-UI 配色规则
