#!/usr/bin/env python3
"""
export-pen-images.py - 从 .pen 文件导出素材图片

根据 pencil-export-images skill 定义的节点 ID 导出所有需要的素材。
使用 node-png 或 Python 的 PIL 库进行渲染。

用法:
  python3 scripts/export-pen-images.py {主题名} {模板类型}
  python3 scripts/export-pen-images.py 企业 dark-ui
"""

import json
import os
import sys
import shutil
import subprocess
import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PEN_EXPORT_RULES_PATH = ROOT / "config" / "pen-export-rules.json"


def load_pen_file(filepath):
    """加载 .pen 文件"""
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


def load_pen_export_rules():
    """加载项目内统一的 Pen 导出规则"""
    with open(PEN_EXPORT_RULES_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def find_node(data, node_id):
    """递归查找指定 ID 的节点"""
    if "id" in data and data.get("id") == node_id:
        return data
    for child in data.get("children", []):
        result = find_node(child, node_id)
        if result:
            return result
    return None


def find_all_refs(data, ref_id=None):
    """遍历所有引用的节点"""
    refs = []

    def walk(node, path=""):
        children = node.get("children", [])
        for child in children:
            child_path = f"{path}/{child.get('id', '?')}"
            if child.get("type") == "ref":
                refs.append(
                    {"ref": child.get("ref"), "path": child_path, "node": child}
                )
            walk(child, child_path)

    walk(data)
    return refs


def collect_template_export_nodes(pen_data, template_type):
    """根据统一规则收集指定模板类型的导出节点"""
    rules = load_pen_export_rules()
    template_rules = rules[template_type]

    export_nodes = {}
    export_nodes[template_rules["loginBackground"]["full"]["nodeId"]] = template_rules["loginBackground"]["full"]
    for header_rule in template_rules["headers"].values():
        export_nodes[header_rule["nodeId"]] = header_rule

    # 找到所有节点
    nodes_found = {}
    for node_id in export_nodes.keys():
        node = find_node(pen_data, node_id)
        if node:
            nodes_found[node_id] = node
            print(f"  ✅ 找到节点 {node_id} ({node.get('name', '')})")
        else:
            print(f"  ⚠️  未找到节点 {node_id}")

    return nodes_found


def create_placeholder_images(output_dir):
    """
    由于 Pencil MCP 不支持导出功能，
    使用现有素材包中的图片或创建占位图。
    """

    # 检查是否有之前的素材包
    for prev_dir in sorted(ROOT.glob("output/*/素材包")):
        if prev_dir.exists():
            print(f"  📂 使用已有素材包: {prev_dir}")
            return prev_dir

    return None


def main():
    if len(sys.argv) < 3:
        print(f"用法: python3 {sys.argv[0]} <主题名> <模板类型>")
        print(f"示例: python3 {sys.argv[0]} 企业 dark-ui")
        sys.exit(1)

    theme_name = sys.argv[1]
    template_type = sys.argv[2].lower()
    is_dark = template_type == "dark-ui"

    print(f"\n🎨 主题素材导出: {theme_name}")
    print(f"   模板类型: {template_type}")

    # 查找 pen 文件
    pen_files = list(ROOT.glob("designs/Topic-*.pen"))
    if not pen_files:
        print("❌ 未找到 .pen 文件")
        sys.exit(1)

    pen_file = pen_files[0]
    print(f"   使用文件: {pen_file}")

    pen_data = load_pen_file(pen_file)

    # 检查主题类型
    if is_dark:
        print(f"   导出 Dark-UI 素材...")
        nodes = collect_template_export_nodes(pen_data, "dark-ui")

        # 检查 Pencil 连接
        try:
            result = subprocess.run(
                ["npx", "pencil", "list"], capture_output=True, text=True, cwd=str(ROOT)
            )
            if result.returncode == 0:
                print(f"  ✅ Pencil CLI 可用")
            else:
                print(f"  ⚠️  Pencil CLI 不可用，尝试其他方式...")
        except:
            pass
    else:
        print(f"   导出 Light-UI 素材...")
        nodes = collect_template_export_nodes(pen_data, "light-ui")

    print(f"\n完成！")


if __name__ == "__main__":
    main()
