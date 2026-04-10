# MiniMax 图片生成规则

## 关键要点（必须严格遵守）

### 1. API Key 获取

**必须先 source .env 文件**：
```bash
source .env
```

.env 文件位置：`{项目根目录}/.env`

### 2. API Endpoint

```
POST https://api.minimaxi.com/v1/image_generation
```

⚠️ 注意：是 `minimaxi.com` 不是 `minimax.io`

### 3. 认证格式

```
Authorization: Bearer $MINIMAX_API_KEY
```

### 4. Response Format

**必须使用 `base64`**，不能用 `url`：

```json
"response_format": "base64"
```

### 5. 禁止参数

⚠️ `prompt_optimizer` 参数会导致 API 调用失败，**必须去掉**！

---

## 完整命令模板

```bash
source .env && \
curl -s -X POST "https://api.minimaxi.com/v1/image_generation" \
  -H "Authorization: Bearer $MINIMAX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "image-01",
    "prompt": "[prompt内容]",
    "aspect_ratio": "16:9",
    "response_format": "base64",
    "n": 1
  }' | python3 -c "
import sys, base64, json
data = json.load(sys.stdin)
img_data = data['data']['image_base64'][0]
with open('designs/[nameEn]-bg.png', 'wb') as f:
    f.write(base64.b64decode(img_data))
print('Image saved')
"
```

---

## 背景图生成流程

### 步骤 1：确定背景图风格

根据主题确定背景图：
- 氛围要求（喜庆、清新、庄重、深色等）
- 视觉元素（是否有特定元素要求）
- 风格偏好（卡通、水墨、简约等）

### 步骤 2：设计 Prompt

Prompt 应该包含：
- **主体**：场景/角色描述
- **氛围**：色调、光线、情绪
- **风格**：插画/摄影/水墨等
- **约束**："无文字"、"无界面元素"、"纯氛围图"

### 步骤 3：生成并保存

```bash
# 保存到 designs/[nameEn]-bg.png
source .env && \
curl -s -X POST "https://api.minimaxi.com/v1/image_generation" \
  -H "Authorization: Bearer $MINIMAX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "image-01",
    "prompt": "你的prompt内容",
    "aspect_ratio": "16:9",
    "response_format": "base64",
    "n": 1
  }' | python3 -c "
import sys, base64, json
data = json.load(sys.stdin)
img_data = data['data']['image_base64'][0]
with open('designs/panda-night-bg.png', 'wb') as f:
    f.write(base64.b64decode(img_data))
print('Image saved')
"
```

### 步骤 4：接入 Pencil

```bash
# 替换 pen 文件中的背景图 URL
sed -i '' 's|bg-login-spring.jpg|panda-night-bg.png|g' "designs/Topic-[主题名]-[timestamp].pen"

# 打开 Pencil 确认效果
open -a Pencil "designs/Topic-[主题名]-[timestamp].pen"
```

---

## 常见问题处理

### 问题 1：API 认证失败

**错误**：`login fail: Please carry the API secret key`
**原因**：
1. .env 文件未 source
2. API key 格式错误
3. API key 已过期

**解决**：
```bash
# 验证 key 是否加载
source .env && echo $MINIMAX_API_KEY

# 确认 key 格式正确（sk-cp- 开头）
echo ${MINIMAX_API_KEY:0:5}
```

### 问题 2：response_format 错误

**错误**：API 返回错误
**原因**：使用了 `response_format: "url"`
**解决**：必须使用 `response_format: "base64"`

### 问题 3：生成速度慢

**原因**：图片较大，网络延迟
**解决**：耐心等待，或减少 prompt 长度

---

## 背景图尺寸

- **标准尺寸**：1920x1080 (16:9)
- **Pencil 导出**：2215x1080（登录页背景）

---

## Prompt 设计指南

### ✅ 推荐写法

```
A dreamy night sky illustration with deep purple and indigo tones, scattered with twinkling golden stars. A cute adorable panda named Mimi lying down peacefully, looking up at the starry sky with a warm gentle smile. Soft glowing stars with warm orange and golden light. Cozy kawaii style, no text, no interface elements, pure atmospheric illustration
```

### ❌ 避免写法

- 包含具体文字内容
- 描述界面元素（按钮、输入框等）
- 过于笼统（"a beautiful scene"）

---

## 相关文档

- [dark-ui-color-rules.md](./dark-ui-color-rules.md) - Dark-UI 配色规则
- [../SKILL.md](../SKILL.md) - 主技能文件
