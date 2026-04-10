#!/bin/bash

# Dark-UI 色值检查工具
# 用途: 自动检查 Dark-UI 色值来源，识别专用色值
# 使用: ./scripts/check-dark-ui-colors.sh
# 依赖: 需要 assets/references/samples/主题样例包/Dark-UI/ 目录存在

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 路径定义 (相对于项目根目录)
SAMPLE_DIR="assets/references/samples/主题样例包/Dark-UI"
VARS_FILE="$SAMPLE_DIR/主题-V17-2026春节主题/scss/lib/vars.scss"
LOGIN_CSS="$SAMPLE_DIR/登录-V17-2026春节/css/login.css"
PEN_FILE="designs/Dark-UI-模板.pen"

echo "================================================================================"
echo "Dark-UI 色值检查工具"
echo "================================================================================"
echo ""

# 检查文件是否存在
check_files() {
    echo -e "${BLUE}[检查文件]${NC}"
    
    if [ ! -f "$VARS_FILE" ]; then
        echo -e "${RED}✗ 未找到 vars.scss: $VARS_FILE${NC}"
        echo -e "${YELLOW}提示: 请确保 Dark-UI 主题样例包位于 assets/references/samples/主题样例包/Dark-UI/${NC}"
        exit 1
    else
        echo -e "${GREEN}✓ 找到 vars.scss${NC}"
    fi
    
    if [ ! -f "$LOGIN_CSS" ]; then
        echo -e "${RED}✗ 未找到 login.css: $LOGIN_CSS${NC}"
        exit 1
    else
        echo -e "${GREEN}✓ 找到 login.css${NC}"
    fi
    
    if [ ! -f "$PEN_FILE" ]; then
        echo -e "${RED}✗ 未找到 pen 文件: $PEN_FILE${NC}"
        exit 1
    else
        echo -e "${GREEN}✓ 找到 pen 文件${NC}"
    fi
    
    echo ""
}

# 检查登录页专用色值
check_login_colors() {
    echo "================================================================================"
    echo -e "${YELLOW}[登录页专用色值检查]${NC}"
    echo "================================================================================"
    echo ""
    
    # 检查 #f8c28c
    echo -e "${BLUE}1. 检查 #f8c28c (金橙色)${NC}"
    echo "   用途: 登录页文字、输入框边框、按钮背景"
    echo ""
    
    # 在 login.css 中查找
    LOGIN_COUNT=$(grep -o "#f8c28c" "$LOGIN_CSS" 2>/dev/null | wc -l | xargs)
    if [ "$LOGIN_COUNT" -gt 0 ]; then
        echo -e "   ${GREEN}✓ 在 login.css 中找到 $LOGIN_COUNT 处${NC}"
        echo "   位置:"
        grep -n "#f8c28c" "$LOGIN_CSS" | head -5 | sed 's/^/      /'
    else
        echo -e "   ${RED}✗ 在 login.css 中未找到${NC}"
    fi
    echo ""
    
    # 在 vars.scss 中查找
    VARS_COUNT=$(grep -o "#f8c28c" "$VARS_FILE" 2>/dev/null | wc -l | xargs)
    if [ "$VARS_COUNT" -gt 0 ]; then
        echo -e "   ${GREEN}✓ 在 vars.scss 中找到 $VARS_COUNT 处${NC}"
        echo -e "   ${YELLOW}⚠️  建议: 该色值已在全局变量中定义，可考虑使用变量${NC}"
    else
        echo -e "   ${YELLOW}⚠️  在 vars.scss 中未定义 (专用色值)${NC}"
        echo -e "   ${BLUE}   说明: 登录页专用，保持硬编码即可${NC}"
    fi
    echo ""
    
    # 检查 #fdd0a3
    echo -e "${BLUE}2. 检查 #fdd0a3 (浅橙色)${NC}"
    echo "   用途: hover状态背景"
    echo ""
    
    # 在 login.css 中查找
    LOGIN_COUNT=$(grep -o "#fdd0a3" "$LOGIN_CSS" 2>/dev/null | wc -l | xargs)
    if [ "$LOGIN_COUNT" -gt 0 ]; then
        echo -e "   ${GREEN}✓ 在 login.css 中找到 $LOGIN_COUNT 处${NC}"
        echo "   位置:"
        grep -n "#fdd0a3" "$LOGIN_CSS" | head -5 | sed 's/^/      /'
    else
        echo -e "   ${RED}✗ 在 login.css 中未找到${NC}"
    fi
    echo ""
    
    # 在 vars.scss 中查找
    VARS_COUNT=$(grep -o "#fdd0a3" "$VARS_FILE" 2>/dev/null | wc -l | xargs)
    if [ "$VARS_COUNT" -gt 0 ]; then
        echo -e "   ${GREEN}✓ 在 vars.scss 中找到 $VARS_COUNT 处${NC}"
        echo -e "   ${YELLOW}⚠️  建议: 该色值已在全局变量中定义，可考虑使用变量${NC}"
    else
        echo -e "   ${YELLOW}⚠️  在 vars.scss 中未定义 (专用色值)${NC}"
        echo -e "   ${BLUE}   说明: 登录页专用，保持硬编码即可${NC}"
    fi
    echo ""
}

# 检查全局变量
check_global_vars() {
    echo "================================================================================"
    echo -e "${YELLOW}[全局变量检查]${NC}"
    echo "================================================================================"
    echo ""
    
    echo -e "${BLUE}主要变量定义:${NC}"
    echo ""
    
    # primary-color
    PRIMARY=$(grep '^\$primary-color:' "$VARS_FILE" 2>/dev/null)
    if [ -n "$PRIMARY" ]; then
        echo "   $PRIMARY"
    fi
    
    # header-font-color
    HEADER=$(grep '^\$header-font-color:' "$VARS_FILE" 2>/dev/null)
    if [ -n "$HEADER" ]; then
        echo "   $HEADER"
    fi
    
    # sidebar-color
    SIDEBAR=$(grep '^\$sidebar-color:' "$VARS_FILE" 2>/dev/null)
    if [ -n "$SIDEBAR" ]; then
        echo "   $SIDEBAR"
    fi
    
    echo ""
    echo -e "${BLUE}提示: 更多变量请查看 Dark-UI-色值映射表.md${NC}"
    echo ""
}

# 生成维护建议
generate_tips() {
    echo "================================================================================"
    echo -e "${YELLOW}[维护建议]${NC}"
    echo "================================================================================"
    echo ""
    
    echo -e "${GREEN}修改登录页色值时:${NC}"
    echo "   1. 检查 login.css 确认正确色值"
    echo "   2. 确认是全局变量还是专用色值"
    echo "   3. 如果是专用色值，保持硬编码"
    echo "   4. 如果是全局变量，使用变量引用"
    echo ""
    
    echo -e "${GREEN}判断标准:${NC}"
    echo "   ✓ 只在登录页使用 → 专用色值，保持硬编码"
    echo "   ✓ 在多个模块使用 → 提取到 vars.scss"
    echo "   ✗ 未经检查直接修改 → 禁止"
    echo ""
    
    echo -e "${GREEN}相关文档:${NC}"
    echo "   - 色值映射表: Dark-UI-色值映射表.md"
    echo "   - 开发规范: AGENTS.md"
    echo "   - 项目集成: ./scripts/check-dark-ui-colors.sh"
    echo ""
}

# 主函数
main() {
    check_files
    check_login_colors
    check_global_vars
    generate_tips
    
    echo "================================================================================"
    echo -e "${GREEN}✓ 检查完成${NC}"
    echo "================================================================================"
}

# 运行主函数
main
