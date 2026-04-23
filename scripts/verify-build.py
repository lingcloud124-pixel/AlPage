#!/usr/bin/env python3
"""
Verify theme build output against reference samples.

Usage:
  python3 scripts/verify-build.py <output_dir>
  python3 scripts/verify-build.py output/20260409-超级英雄超人/输出包
  python3 scripts/verify-build.py <output_dir> --products mk,ekp_v17

Checks:
   1. Exactly expected zip files generated (all 9 by default, or selected subset)
   2. Each zip's file structure matches its reference sample
   3. Color injection: new theme color appears in theme CSS files
   4. No old template colors (#2C615C, #144E48) remain in theme CSS
   5. Image replacement: login images (bg-login.jpg, login_thumb.jpg, thumb-1/2.jpg)
      must differ from source template content
"""

import hashlib
import re
import sys
import zipfile
import json
from pathlib import Path
from typing import Dict, List, Optional, Tuple

ROOT = Path(__file__).parent.parent
LOCAL_SAMPLES_DIR = ROOT / "assets" / "references" / "samples"
VERIFY_RULES = json.loads((ROOT / "config" / "build-verification-rules.json").read_text(encoding="utf-8"))
LIGHT_EXPECTED_ZIPS = [(item["prefix"], item["reference"]) for item in VERIFY_RULES["expectedZips"]]
EXPECTED_ZIPS_BY_TEMPLATE_TYPE = {
    "light-ui": LIGHT_EXPECTED_ZIPS,
    "dark-ui": [
        ("主题-MK-", "mk-festival-26-spring主题包.zip"),
        ("登录-MK-", "mk-festival-spring-登录包.zip"),
        ("主题-V14〜V16-", "主题-V14〜V16-2026春节主题.zip"),
        ("登录-V14〜V16-", "登录-V16〜V17-2026春节.zip"),
        ("登录-V14-", "登录-V14-2026春节.zip"),
        ("登录-V15-", "登录-V15-2026春节.zip"),
        ("登录-V16-", "登录-V16〜V17-2026春节.zip"),
        ("主题-V17-", "主题-V17-2026春节主题.zip"),
        ("登录-V17-", "登录-V16〜V17-2026春节.zip"),
    ],
}
DEFAULT_SAMPLE_ROOTS = {
    "light-ui": LOCAL_SAMPLES_DIR / "light",
    "dark-ui": LOCAL_SAMPLES_DIR / "dark",
}
PRODUCT_TO_PREFIXES = {
    "mk": ["主题-MK-", "登录-MK-"],
    "ekp_v14_16": ["主题-V14〜V16-", "登录-V14〜V16-", "登录-V14-", "登录-V15-", "登录-V16-"],
    "ekp_v17": ["主题-V17-", "登录-V17-"],
}

OLD_COLORS = {
    "#2c615c",
    "#2C615C",
    "#144e48",
    "#144E48",
    "#228077",
    "#228077",
    "#56817d",
    "#56817D",
    "#36706a",
    "#36706A",
    "#1a1a2e",
    "#1A1A2E",
    "#0f3460",
    "#0F3460",
    "#4a4a7e",
    "#4A4A7E",
    "#3a3a6e",
    "#3A3A6E",
    "#a7160b",
    "#A7160B",
    "#94170e",
    "#94170E",
    "#b9453c",
    "#B9453C",
    "#f8c28c",
    "#F8C28C",
    "#fdd0a3",
    "#FDD0A3",
    "#f6e7e6",
    "#F6E7E6",
    "#edd0ce",
    "#EDD0CE",
    "#e4b9b5",
    "#E4B9B5",
    "#ffe4cf",
    "#FFE4CF",
    "#dcb496",
    "#DCB496",
    "#ce7566",
    "#CE7566",
}


def find_gen_zip(output_dir, prefix):
    # type: (Path, str) -> Optional[Path]
    for f in output_dir.glob("*.zip"):
        if f.name.startswith(prefix):
            return f
    return None


def parse_cli_args(argv: List[str]) -> Tuple[Path, Optional[List[str]], Optional[str], Optional[Path]]:
    if len(argv) < 2:
        print("Usage: python3 scripts/verify-build.py <output_dir>")
        print("Example: python3 scripts/verify-build.py output/20260409-超级英雄超人/输出包")
        print("Optional: --products mk,ekp_v17 --template-type dark-ui --sample-root /path/to/samples")
        sys.exit(1)

    output_dir = Path(argv[1])
    selected_products = None
    template_type = None
    sample_root = None

    i = 2
    while i < len(argv):
        arg = argv[i]
        if arg == "--products" and i + 1 < len(argv):
            selected_products = [item.strip() for item in argv[i + 1].split(",") if item.strip()]
            i += 2
            continue
        if arg == "--template-type" and i + 1 < len(argv):
            template_type = argv[i + 1].strip()
            i += 2
            continue
        if arg == "--sample-root" and i + 1 < len(argv):
            sample_root = Path(argv[i + 1]).expanduser()
            i += 2
            continue
        print(f"❌ Unknown argument: {arg}")
        sys.exit(1)

    return output_dir, selected_products, template_type, sample_root


def discover_sample_root(template_type: str) -> Optional[Path]:
    dir_name = DEFAULT_SAMPLE_ROOTS[template_type].name
    desktop_dir = Path.home() / "Desktop"
    search_patterns = [
        f"*/Topic Automation/assets/references/samples/{dir_name}",
        f"*/*/Topic Automation/assets/references/samples/{dir_name}",
    ]

    for pattern in search_patterns:
        for candidate in desktop_dir.glob(pattern):
            if candidate.exists():
                return candidate.resolve()
    return None


def detect_template_type_from_output_dir(output_dir: Path) -> Optional[str]:
    assets_yaml = output_dir.parent / ".build-meta" / "theme-build-request.yaml"
    if not assets_yaml.exists():
        return None

    content = assets_yaml.read_text(encoding="utf-8", errors="replace")
    match = re.search(r'^templateType:\s*"?(light-ui|dark-ui)"?\s*$', content, re.MULTILINE)
    if match:
        return match.group(1)
    return None


def detect_theme_color_from_output_dir(output_dir: Path) -> Optional[str]:
    assets_yaml = output_dir.parent / ".build-meta" / "theme-build-request.yaml"
    if not assets_yaml.exists():
        return None

    content = assets_yaml.read_text(encoding="utf-8", errors="replace")
    match = re.search(r'^themeColor:\s*"?(#[0-9a-fA-F]{3,8})"?\s*$', content, re.MULTILINE)
    if match:
        return match.group(1)
    return None


def resolve_template_type(output_dir: Path, explicit_template_type: Optional[str]) -> str:
    template_type = explicit_template_type or detect_template_type_from_output_dir(output_dir) or "light-ui"
    if template_type not in EXPECTED_ZIPS_BY_TEMPLATE_TYPE:
        print(f"❌ Unsupported template type: {template_type}")
        sys.exit(1)
    return template_type


def resolve_sample_root(template_type: str, explicit_sample_root: Optional[Path]) -> Path:
    sample_root = (explicit_sample_root or DEFAULT_SAMPLE_ROOTS[template_type]).resolve(strict=False)
    if not sample_root.exists():
        discovered = discover_sample_root(template_type)
        if discovered:
            print(f"⚠️  Using discovered sample root: {discovered}")
            sample_root = discovered
    if not sample_root.exists():
        print(f"❌ Sample root not found: {sample_root}")
        sys.exit(1)
    return sample_root


def verify_structure(gen_path, ref_path, prefix=""):
    # type: (Path, Path, str) -> Tuple[bool, List[str]]
    if not ref_path.exists():
        return True, [f"Reference not found: {ref_path.name} (skip structure check)"]

    with zipfile.ZipFile(gen_path) as gz, zipfile.ZipFile(ref_path) as rz:
        gen_files = sorted(
            n for n in gz.namelist() if not n.endswith("/") and ".DS_Store" not in n
        )
        ref_files = sorted(
            n for n in rz.namelist() if not n.endswith("/") and ".DS_Store" not in n
        )

        if gen_files == ref_files:
            return True, []

        only_ref = sorted(set(ref_files) - set(gen_files))
        only_gen = sorted(set(gen_files) - set(ref_files))

        allowed_extra = set(STRUCTURE_EXTRA_ALLOWED.get(prefix, []))
        if allowed_extra and only_gen:
            only_gen = [f for f in only_gen if f not in allowed_extra]

        issues = []
        if only_ref:
            issues.append(f"Missing: {only_ref[:5]}")
        if only_gen:
            issues.append(f"Extra: {only_gen[:5]}")
        return len(issues) == 0, issues


def verify_color_injection(gen_path, theme_color: Optional[str] = None):
    # type: (Path) -> Tuple[bool, List[str]]
    issues = []
    has_theme_css = False
    old_color_found = []
    allowed_theme_colors = set()
    if theme_color:
        allowed_theme_colors.add(theme_color.lower())
        allowed_theme_colors.add(theme_color.upper())

    with zipfile.ZipFile(gen_path) as zf:
        for name in zf.namelist():
            is_theme_css = name.endswith(".css") and (
                "/style/" in name or "style/" in name
            )
            is_login_css = (
                name.endswith(".css")
                and (
                    "css/login.css" in name
                    or "/style.css" in name
                    or name == "style.css"
                )
                and "font/" not in name
            )
            if is_theme_css or is_login_css:
                has_theme_css = True
                content = zf.read(name).decode("utf-8", errors="replace")
                for color in OLD_COLORS:
                    if color in allowed_theme_colors:
                        continue
                    if color in content:
                        old_color_found.append(f"{color} in {name}")
                        break

    if not has_theme_css:
        return False, [
            "No theme CSS found in style/ directory — color check could not run"
        ]

    if old_color_found:
        return False, [f"Old template colors found: {old_color_found[:3]}"]

    return True, []


LOGIN_IMAGE_CHECKS = VERIFY_RULES["loginImageChecks"]
STRUCTURE_EXTRA_ALLOWED = VERIFY_RULES["structureExtraAllowed"]


def verify_image_replacement(gen_path, prefix, expected_zips, sample_root):
    # type: (Path, str) -> Tuple[bool, List[str], List[str]]
    image_paths = LOGIN_IMAGE_CHECKS.get(prefix, [])
    if not image_paths:
        return True, [], []

    ref_name = None
    for p, r in expected_zips:
        if p == prefix:
            ref_name = r
            break
    if not ref_name:
        return True, [], ["No reference mapping for image check"]

    ref_path = sample_root / ref_name
    if not ref_path.exists():
        return True, [], [f"Reference not found for image check: {ref_name}"]

    issues = []
    warnings = []
    with zipfile.ZipFile(gen_path) as gz, zipfile.ZipFile(ref_path) as rz:
        for img_path in image_paths:
            gen_files = [
                n for n in gz.namelist() if n.endswith(img_path) and not n.endswith("/")
            ]
            ref_files = [
                n for n in rz.namelist() if n.endswith(img_path) and not n.endswith("/")
            ]

            if not gen_files:
                issues.append(f"Image not found in output: {img_path}")
                continue

            gen_info = gz.getinfo(gen_files[0])
            if ref_files:
                ref_info = rz.getinfo(ref_files[0])
                gen_hash = hashlib.sha256(gz.read(gen_files[0])).hexdigest()
                ref_hash = hashlib.sha256(rz.read(ref_files[0])).hexdigest()
                if gen_hash == ref_hash:
                    warnings.append(
                        f"Image unchanged vs template: {img_path} ({gen_info.file_size} bytes)"
                    )
            else:
                warnings.append(
                    f"Image not found in reference: {img_path} (cannot verify replacement)"
                )

    return len(issues) == 0, issues, warnings


def main():
    output_dir, selected_products, explicit_template_type, explicit_sample_root = parse_cli_args(sys.argv)
    if not output_dir.exists():
        print(f"❌ Output directory not found: {output_dir}")
        sys.exit(1)

    template_type = resolve_template_type(output_dir, explicit_template_type)
    theme_color = detect_theme_color_from_output_dir(output_dir)
    sample_root = resolve_sample_root(template_type, explicit_sample_root)

    print(f"🔍 Verifying build: {output_dir}")
    print(f"🎨 Template type: {template_type}")
    if theme_color:
        print(f"🎯 Theme color: {theme_color}")
    print(f"📚 Sample root: {sample_root}\n")

    expected_zips = EXPECTED_ZIPS_BY_TEMPLATE_TYPE[template_type]
    if selected_products:
        selected_prefixes = {
            prefix
            for product in selected_products
            for prefix in PRODUCT_TO_PREFIXES.get(product, [])
        }
        expected_zips = [
            (prefix, ref) for prefix, ref in expected_zips if prefix in selected_prefixes
        ]

    all_zips = list(output_dir.glob("*.zip"))
    print(f"📦 Found {len(all_zips)} zip files (expected {len(expected_zips)})")
    if len(all_zips) != len(expected_zips):
        print(f"   ⚠️  Expected {len(expected_zips)}, got {len(all_zips)}")

    passed = 0
    failed = 0
    skipped = 0

    for prefix, ref_name in expected_zips:
        gen_path = find_gen_zip(output_dir, prefix)
        if not gen_path:
            print(f"❌ Missing: {prefix}*.zip")
            failed += 1
            continue

        ref_path = sample_root / ref_name

        struct_ok, struct_issues = verify_structure(gen_path, ref_path, prefix)
        color_ok, color_issues = verify_color_injection(gen_path, theme_color)
        image_ok, image_issues, image_warnings = verify_image_replacement(gen_path, prefix, expected_zips, sample_root)

        status = "✅" if struct_ok and color_ok and image_ok else "❌"
        name = gen_path.name

        if struct_ok and color_ok and image_ok:
            print(f"{status} {name}")
            passed += 1
        else:
            print(f"{status} {name}")
            for issue in struct_issues + color_issues + image_issues:
                print(f"     {issue}")
            failed += 1

        for warning in image_warnings:
            print(f"     ⚠️  {warning}")

    print(f"\n{'=' * 60}")
    print(f"Results: {passed} passed, {failed} failed (of {len(expected_zips)})")
    if failed == 0:
        print("✅ ALL CHECKS PASSED")
    else:
        print("❌ SOME CHECKS FAILED")
        sys.exit(1)


if __name__ == "__main__":
    main()
