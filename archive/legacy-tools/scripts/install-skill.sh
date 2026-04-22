#!/bin/bash
# Theme Automation Skill 安装脚本
# 运行方式: bash scripts/install-skill.sh

AGENTS_DIR="$HOME/.agents/skills"
SKILL_SOURCE="$(dirname "$0")/../SKILL.md"
SKILL_TARGET="$AGENTS_DIR/theme-automation"

echo "🎨 主题自动化 Skill 安装"

# 检查源文件
if [ ! -f "$SKILL_SOURCE" ]; then
    echo "❌ 错误：找不到 $SKILL_SOURCE"
    exit 1
fi

# 创建目录
mkdir -p "$SKILL_TARGET"

# 复制 Skill 文件
cp "$SKILL_SOURCE" "$SKILL_TARGET/SKILL.md"

echo "✅ Skill 已安装到: $SKILL_TARGET"
echo "   重启 OpenCode 后生效"
