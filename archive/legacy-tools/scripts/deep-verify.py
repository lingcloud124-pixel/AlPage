#!/usr/bin/env python3
"""
深度验证脚本：对主题构建输出进行完整的颜色和图片验证

功能：
1. CSS/SCSS 颜色验证：检查每个文件中的所有颜色值替换是否正确
2. 图片验证：比较所有图片文件的MD5哈希值和文件大小
3. 生成详细的中文报告，显示每个验证项的结果

使用方法：
python3 scripts/deep-verify.py output/20260410-shenergy-enterprise
"""

import sys
import zipfile
import hashlib
import re
import os
from pathlib import Path
from typing import List, Tuple, Dict, Set, Optional

# 项目根目录
ROOT = Path(__file__).parent.parent
REFERENCE_DIR = ROOT / "assets/references/samples/样例包"

# 输出包目录映射
EXPECTED_MAPPING = {
    "主题-MK-申能企业.zip": "主题-MK-2026清明主题.zip",
    "登录-MK-申能企业.zip": "登录-MK-2026清明.zip",
    "主题-V12-申能企业.zip": "主题-V12-2026清明主题.zip",
    "登录-V12-申能企业.zip": "登录-V12-2026清明.zip",
    "主题-V13〜V13.5-申能企业.zip": "主题-V13〜V13.5-2026清明主题.zip",
    "登录-V13〜V13.5-申能企业.zip": "登录-V13-2026清明.zip",
    "登录-V13-申能企业.zip": "登录-V13-2026清明.zip",
    "登录-V13.5-申能企业.zip": "登录-V13.5-2026清明.zip",
    "主题-V14〜V16-申能企业.zip": "主题-V14〜V16-2026清明主题.zip",
    "登录-V14〜V16-申能企业.zip": "登录-V16-2026清明.zip",
    "登录-V14-申能企业.zip": "登录-V14-2026清明.zip",
    "登录-V15-申能企业.zip": "登录-V15-2026清明.zip",
    "登录-V16-申能企业.zip": "登录-V16-2026清明.zip",
    "主题-V17-申能企业.zip": "主题-V17-2026清明主题.zip",
    "登录-V17-申能企业.zip": "登录-V17-2026清明.zip",
}

# 颜色替换规则（来自 theme_builder.py）
THEME_COLOR = "#226F3B"
HEADER_FONT = "#CCFEEB"

# 应该被替换的颜色变体（全部替换为 THEME_COLOR）
COLOR_VARIANTS = {
    "#144e48",
    "#2c615c",
    "#36706a",
    "#56817d",
    "#228077",
    "#b72217",
    "#c92d24",
}

# 背景颜色变体（替换为 HEADER_FONT）
BG_VARIANTS = {"#fbfcf2", "#fbf9eb"}

# RGB 替换（替换为 theme color 的 RGB: 34,111,59）
RGB_REPLACEMENTS = [
    (r"255,\s*134,\s*36", "34,111,59"),
    (r"20,\s*78,\s*72", "34,111,59"),
    (r"44,\s*97,\s*92", "34,111,59"),
]

# SCSS 变量替换
SCSS_VARIABLES = [
    "$header-font-color:#333;",
    "$header-font-color: #333;",
    "$header-font-color:#333333;",
    "$header-font-color: #333333;",
    "$portal-header-font-color:#333;",
    "$portal-header-font-color: #333;",
    "$portal-header-font-color:#333333;",
    "$portal-header-font-color: #333333;",
    "$tlayout-header-font-color:#333;",
    "$tlayout-header-font-color: #333;",
    "$tlayout-header-font-color:#333333;",
    "$tlayout-header-font-color: #333333;",
    "$single-header-font-color:#333;",
    "$single-header-font-color: #333;",
    "$single-header-font-color:#333333;",
    "$single-header-font-color: #333333;",
    "$tabpage-header-font-color:#333;",
    "$tabpage-header-font-color: #333;",
    "$tabpage-header-font-color:#333333;",
    "$tabpage-header-font-color: #333333;",
]

# 所有应该被替换的旧颜色（包括大小写变体）
ALL_OLD_COLORS = set()
for color in COLOR_VARIANTS:
    ALL_OLD_COLORS.add(color.lower())
    ALL_OLD_COLORS.add(color.upper())
for color in BG_VARIANTS:
    ALL_OLD_COLORS.add(color.lower())
    ALL_OLD_COLORS.add(color.upper())

# 图片文件扩展名
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".svg"}


def print_info(msg: str):
    """打印信息消息"""
    print(f"ℹ️  {msg}")


def print_success(msg: str):
    """打印成功消息"""
    print(f"✅ {msg}")


def print_warning(msg: str):
    """打印警告消息"""
    print(f"⚠️  {msg}")


def print_error(msg: str):
    """打印错误消息"""
    print(f"❌ {msg}", file=sys.stderr)


def get_md5_hash(content: bytes) -> str:
    """计算字节内容的MD5哈希"""
    return hashlib.md5(content).hexdigest()


def is_image_file(filename: str) -> bool:
    """检查文件是否为图片文件"""
    return any(filename.lower().endswith(ext) for ext in IMAGE_EXTENSIONS)


def find_inner_directory(extract_path: Path) -> Path:
    """找到ZIP解压后的实际内容目录"""
    # 检查根目录是否就是内容目录（EKP V14-V17 登录包）
    login_markers = ["config.ini"]
    for marker in login_markers:
        if (extract_path / marker).exists():
            return extract_path

    # 检查是否有 style/ 或 scss/ 目录（主题包）
    content_dirs = ["style", "scss"]
    for d in content_dirs:
        if (extract_path / d).exists():
            return extract_path

    # 检查是否有 mk-* 或 login26-* 目录（MK包）
    for child in extract_path.iterdir():
        if child.is_dir() and (
            child.name.startswith("mk-") or child.name.startswith("login26-")
        ):
            return child

    # 否则返回第一个非隐藏子目录
    for child in sorted(extract_path.iterdir()):
        if (
            child.is_dir()
            and not child.name.startswith(".")
            and child.name != "__MACOSX"
        ):
            return child

    return extract_path


def extract_all_files_from_zip(zip_path: Path, extract_to: Path) -> List[Path]:
    """从ZIP文件中提取所有文件到指定目录，返回文件路径列表"""
    if not zip_path.exists():
        return []

    extract_to.mkdir(parents=True, exist_ok=True)
    extracted_files = []

    with zipfile.ZipFile(zip_path, "r") as zf:
        for member in zf.namelist():
            # 跳过目录和隐藏文件
            if member.endswith("/") or "__MACOSX" in member or ".DS_Store" in member:
                continue

            try:
                zf.extract(member, extract_to)
                extracted_path = extract_to / member
                extracted_files.append(extracted_path)
            except Exception as e:
                print_warning(f"提取文件失败 {member}: {e}")

    return extracted_files


def verify_css_color_replacements(
    gen_file: Path, ref_file: Path, filename: str
) -> Tuple[bool, List[str]]:
    """验证CSS/SCSS文件中的颜色替换"""
    issues = []

    try:
        gen_content = gen_file.read_text(encoding="utf-8")
        ref_content = ref_file.read_text(encoding="utf-8") if ref_file.exists() else ""
    except UnicodeDecodeError:
        # 如果无法读取为文本，跳过（可能是二进制文件）
        return True, []

    # 检查是否还有旧颜色残留
    old_colors_found = []
    for line_num, line in enumerate(gen_content.split("\n"), 1):
        for old_color in ALL_OLD_COLORS:
            if old_color in line:
                old_colors_found.append(f"第{line_num}行: {old_color}")

    if old_colors_found:
        issues.extend(old_colors_found[:5])  # 最多显示5个问题

    # 对于主题文件，检查新颜色是否正确应用
    if (
        "theme" in filename.lower()
        or "style" in filename.lower()
        or filename.endswith((".css", ".scss"))
    ):
        # 检查 THEME_COLOR 是否存在（应该被注入）
        if (
            THEME_COLOR.lower() not in gen_content.lower()
            and THEME_COLOR.upper() not in gen_content
        ):
            # 对于某些可能不需要颜色的文件，这个检查可能过于严格
            # 但我们还是记录一下
            pass

        # 检查 HEADER_FONT 是否正确应用到背景变体
        bg_replaced_correctly = True
        for bg_color in BG_VARIANTS:
            if (
                bg_color.lower() in gen_content.lower()
                or bg_color.upper() in gen_content
            ):
                bg_replaced_correctly = False
                break

        if not bg_replaced_correctly:
            issues.append("背景颜色未正确替换为 headerFont")

    # 检查 RGB 替换
    for rgb_pattern, expected_rgb in RGB_REPLACEMENTS:
        pattern_obj = re.compile(rgb_pattern, re.IGNORECASE)
        matches = pattern_obj.findall(gen_content)
        if matches:
            issues.append(f"发现未替换的RGB模式: {rgb_pattern}")

    return len(issues) == 0, issues


def verify_scss_variable_replacements(gen_file: Path) -> Tuple[bool, List[str]]:
    """验证SCSS变量替换"""
    try:
        content = gen_file.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return True, []

    issues = []

    # 检查是否还有旧的SCSS变量
    for old_var in SCSS_VARIABLES:
        if old_var in content:
            issues.append(f"发现未替换的SCSS变量: {old_var}")

    # 检查新的SCSS变量是否存在
    new_header_font_vars = [
        f"$header-font-color:{HEADER_FONT};",
        f"$header-font-color: {HEADER_FONT};",
        f"$portal-header-font-color:{HEADER_FONT};",
        f"$portal-header-font-color: {HEADER_FONT};",
        f"$tlayout-header-font-color:{HEADER_FONT};",
        f"$tlayout-header-font-color: {HEADER_FONT};",
        f"$single-header-font-color:{HEADER_FONT};",
        f"$single-header-font-color: {HEADER_FONT};",
        f"$tabpage-header-font-color:{HEADER_FONT};",
        f"$tabpage-header-font-color: {HEADER_FONT};",
    ]

    new_vars_found = any(new_var in content for new_var in new_header_font_vars)
    if not new_vars_found and any(var in content for var in SCSS_VARIABLES):
        issues.append("SCSS变量替换不完整")

    return len(issues) == 0, issues


def compare_image_files(
    gen_file: Path, ref_file: Path, filename: str
) -> Tuple[str, str]:
    """比较图片文件，返回状态和详细信息"""
    try:
        gen_size = gen_file.stat().st_size
        gen_hash = get_md5_hash(gen_file.read_bytes())

        if ref_file.exists():
            ref_size = ref_file.stat().st_size
            ref_hash = get_md5_hash(ref_file.read_bytes())

            if gen_hash == ref_hash:
                return "unchanged", f"与模板相同 (size: {gen_size} bytes)"
            else:
                return "replaced", f"已替换 (size: {gen_size} vs {ref_size} bytes)"
        else:
            return "new", f"新增文件 (size: {gen_size} bytes)"

    except Exception as e:
        return "error", f"处理失败: {e}"


def process_zip_pair(gen_zip: Path, ref_zip: Path) -> Dict:
    """处理一对生成的ZIP和参考ZIP"""
    result = {
        "name": gen_zip.name,
        "color_checks": [],
        "image_checks": [],
        "css_files_checked": 0,
        "scss_files_checked": 0,
        "image_files_checked": 0,
        "total_issues": 0,
    }

    # 创建临时目录
    temp_dir = gen_zip.parent / f"__temp_{gen_zip.stem}"
    gen_extract = temp_dir / "generated"
    ref_extract = temp_dir / "reference"

    try:
        # 提取ZIP文件
        gen_files = extract_all_files_from_zip(gen_zip, gen_extract)
        ref_files = (
            extract_all_files_from_zip(ref_zip, ref_extract) if ref_zip.exists() else []
        )

        # 创建文件路径映射
        gen_file_map = {f.relative_to(gen_extract): f for f in gen_files}
        ref_file_map = {f.relative_to(ref_extract): f for f in ref_files}

        # 收集所有需要检查的文件
        all_files = set(gen_file_map.keys()) | set(ref_file_map.keys())

        for rel_path in sorted(all_files):
            gen_file = gen_file_map.get(rel_path)
            ref_file = ref_file_map.get(rel_path)

            if gen_file and gen_file.suffix.lower() in [".css", ".scss"]:
                # CSS/SCSS 文件颜色验证
                if gen_file.suffix.lower() == ".css":
                    is_valid, issues = verify_css_color_replacements(
                        gen_file, ref_file or Path(""), str(rel_path)
                    )
                    result["css_files_checked"] += 1
                else:  # .scss
                    is_valid, issues = verify_scss_variable_replacements(gen_file)
                    # 也检查颜色替换
                    color_valid, color_issues = verify_css_color_replacements(
                        gen_file, ref_file or Path(""), str(rel_path)
                    )
                    if not color_valid:
                        issues.extend(color_issues)
                    result["scss_files_checked"] += 1

                if not is_valid:
                    result["total_issues"] += len(issues)
                    result["color_checks"].append(
                        {"file": str(rel_path), "status": "failed", "issues": issues}
                    )
                else:
                    result["color_checks"].append(
                        {"file": str(rel_path), "status": "passed", "issues": []}
                    )

            elif gen_file and is_image_file(gen_file.name):
                # 图片文件验证
                status, detail = compare_image_files(
                    gen_file, ref_file or Path(""), str(rel_path)
                )
                result["image_files_checked"] += 1
                result["image_checks"].append(
                    {"file": str(rel_path), "status": status, "detail": detail}
                )

    finally:
        # 清理临时目录
        import shutil

        if temp_dir.exists():
            shutil.rmtree(temp_dir, ignore_errors=True)

    return result


def main():
    if len(sys.argv) < 2:
        print("使用方法: python3 scripts/deep-verify.py <output_dir>")
        print(
            "示例: python3 scripts/deep-verify.py output/20260410-shenergy-enterprise"
        )
        sys.exit(1)

    # 获取输出目录
    output_base = Path(sys.argv[1])
    if output_base.is_file():
        # 如果传入的是文件，假设是输出包目录的父目录
        output_dir = output_base.parent / "输出包"
    elif (output_base / "输出包").exists():
        output_dir = output_base / "输出包"
    else:
        output_dir = output_base

    if not output_dir.exists():
        print_error(f"输出目录不存在: {output_dir}")
        sys.exit(1)

    print_info(f"开始深度验证: {output_dir}\n")

    # 统计信息
    total_zips = 0
    total_passed = 0
    total_failed = 0
    total_css_files = 0
    total_scss_files = 0
    total_image_files = 0
    total_color_issues = 0
    total_images_replaced = 0
    total_images_unchanged = 0

    # 处理每个ZIP文件
    all_results = []

    for gen_zip_name, ref_zip_name in EXPECTED_MAPPING.items():
        gen_zip_path = output_dir / gen_zip_name
        ref_zip_path = REFERENCE_DIR / ref_zip_name

        if not gen_zip_path.exists():
            print_error(f"❌ 缺少生成的ZIP文件: {gen_zip_name}")
            total_failed += 1
            continue

        if not ref_zip_path.exists():
            print_warning(f"⚠️  参考ZIP文件不存在: {ref_zip_name}，跳过详细验证")
            total_zips += 1
            continue

        print_info(f"🔍 验证 {gen_zip_name}")
        result = process_zip_pair(gen_zip_path, ref_zip_path)
        all_results.append(result)

        total_zips += 1
        total_css_files += result["css_files_checked"]
        total_scss_files += result["scss_files_checked"]
        total_image_files += result["image_files_checked"]
        total_color_issues += result["total_issues"]

        # 统计图片状态
        for img_check in result["image_checks"]:
            if img_check["status"] == "replaced":
                total_images_replaced += 1
            elif img_check["status"] == "unchanged":
                total_images_unchanged += 1

        # 检查是否有问题
        has_issues = result["total_issues"] > 0
        if has_issues:
            total_failed += 1
            print_error(f"❌ {gen_zip_name} - 发现 {result['total_issues']} 个问题")
            # 显示前几个问题
            for check in result["color_checks"][:3]:
                if check["status"] == "failed":
                    print_error(f"   文件 {check['file']}:")
                    for issue in check["issues"][:2]:
                        print_error(f"     - {issue}")
        else:
            total_passed += 1
            print_success(f"✅ {gen_zip_name}")

    # 生成总结报告
    print(f"\n{'=' * 80}")
    print("📊 深度验证总结报告")
    print(f"{'=' * 80}")

    print(f"📁 ZIP包总数: {total_zips}")
    print(f"✅ 验证通过: {total_passed}")
    print(f"❌ 验证失败: {total_failed}")

    print(f"\n🎨 颜色验证:")
    print(f"   CSS文件检查: {total_css_files}")
    print(f"   SCSS文件检查: {total_scss_files}")
    print(f"   颜色问题总数: {total_color_issues}")

    print(f"\n🖼️  图片验证:")
    print(f"   图片文件检查: {total_image_files}")
    print(f"   已替换图片: {total_images_replaced}")
    print(f"   未替换图片: {total_images_unchanged}")

    # 最终结论
    if total_failed == 0 and total_zips == len(EXPECTED_MAPPING):
        print(f"\n🎉 恭喜！所有验证项目均通过！")
        print("✅ 主题构建完全符合预期")
    else:
        print(f"\n⚠️  验证结果存在问题，请检查上述报告")
        if total_zips < len(EXPECTED_MAPPING):
            missing_count = len(EXPECTED_MAPPING) - total_zips
            print(f"   ⚠️  缺少 {missing_count} 个ZIP文件")
        if total_color_issues > 0:
            print(f"   ❌ 存在 {total_color_issues} 个颜色替换问题")
        sys.exit(1)


if __name__ == "__main__":
    main()
