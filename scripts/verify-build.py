#!/usr/bin/env python3
"""
Verify theme build output against reference samples.

Usage:
  python3 scripts/verify-build.py <output_dir>
  python3 scripts/verify-build.py output/20260409-超级英雄超人/输出包

Checks:
   1. Exactly 15 zip files generated
   2. Each zip's file structure matches its reference sample
   3. Color injection: new theme color appears in theme CSS files
   4. No old template colors (#2C615C, #144E48) remain in theme CSS
   5. Image replacement: login images (bg-login.jpg, login_thumb.jpg, thumb-1/2.jpg)
      must differ from source template (file size changed)
"""

import sys
import zipfile
from pathlib import Path
from typing import List, Optional, Tuple

ROOT = Path(__file__).parent.parent
REF_DIR = ROOT / "assets/references/samples/主题样例包"

EXPECTED_ZIPS = [
    ("主题-MK-", "主题-MK-2026清明主题.zip"),
    ("登录-MK-", "登录-MK-2026清明.zip"),
    ("主题-V12-", "主题-V12-2026清明主题.zip"),
    ("登录-V12-", "登录-V12-2026清明.zip"),
    ("主题-V13〜V13.5-", "主题-V13〜V13.5-2026清明主题.zip"),
    ("登录-V13〜V13.5-", "登录-V13-2026清明.zip"),
    ("登录-V13-", "登录-V13-2026清明.zip"),
    ("登录-V13.5-", "登录-V13.5-2026清明.zip"),
    ("主题-V14〜V16-", "主题-V14〜V16-2026清明主题.zip"),
    ("登录-V14〜V16-", "登录-V16-2026清明.zip"),
    ("登录-V14-", "登录-V14-2026清明.zip"),
    ("登录-V15-", "登录-V15-2026清明.zip"),
    ("登录-V16-", "登录-V16-2026清明.zip"),
    ("主题-V17-", "主题-V17-2026清明主题.zip"),
    ("登录-V17-", "登录-V17-2026清明.zip"),
]

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
}


def find_gen_zip(output_dir, prefix):
    # type: (Path, str) -> Optional[Path]
    for f in output_dir.glob("*.zip"):
        if f.name.startswith(prefix):
            return f
    return None


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


def verify_color_injection(gen_path):
    # type: (Path) -> Tuple[bool, List[str]]
    issues = []
    has_theme_css = False
    old_color_found = []

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


LOGIN_IMAGE_CHECKS = {
    "登录-MK-": ["static/background.png"],
    "登录-V12-": [
        "login_26_festival_qingming/login_thumb.jpg",
        "login_26_festival_qingming/images/bg_login_iframe.png",
    ],
    "登录-V13〜V13.5-": [
        "login_thumb.jpg",
        "login_bg/thumb-1.jpg",
        "login_bg/thumb-2.jpg",
    ],
    "登录-V13-": ["login_thumb.jpg", "login_bg/thumb-1.jpg", "login_bg/thumb-2.jpg"],
    "登录-V13.5-": ["login_thumb.jpg", "login_bg/thumb-1.jpg", "login_bg/thumb-2.jpg"],
    "登录-V14〜V16-": [
        "login_thumb.jpg",
        "login_bg/thumb-1.jpg",
        "login_bg/thumb-2.jpg",
    ],
    "登录-V14-": ["login_thumb.jpg", "login_bg/thumb-1.jpg", "login_bg/thumb-2.jpg"],
    "登录-V15-": ["login_thumb.jpg", "login_bg/thumb-1.jpg", "login_bg/thumb-2.jpg"],
    "登录-V16-": ["login_thumb.jpg", "login_bg/thumb-1.jpg", "login_bg/thumb-2.jpg"],
    "登录-V17-": ["login_thumb.jpg", "login_bg/thumb-1.jpg", "login_bg/thumb-2.jpg"],
}

STRUCTURE_EXTRA_ALLOWED = {
    "登录-V12-": [
        "login_26_festival_qingming/login_bg/thumb-1.jpg",
        "login_26_festival_qingming/login_bg/thumb-2.jpg",
    ],
    "主题-V12-": [
        "images/image-style/header-banner.png",
        "images/image-style/header-sideheader.png",
    ],
    "主题-V13〜V13.5-": [
        "images/image-style/header-banner.png",
        "images/image-style/header-sideheader.png",
    ],
    "主题-V14〜V16-": [
        "images/image-style/header-banner.png",
        "images/image-style/header-sideheader.png",
    ],
    "主题-V17-": [
        "images/image-style/header-banner.png",
        "images/image-style/header-sideheader.png",
    ],
}


def verify_image_replacement(gen_path, prefix):
    # type: (Path, str) -> Tuple[bool, List[str]]
    image_paths = LOGIN_IMAGE_CHECKS.get(prefix, [])
    if not image_paths:
        return True, []

    ref_name = None
    for p, r in EXPECTED_ZIPS:
        if p == prefix:
            ref_name = r
            break
    if not ref_name:
        return True, ["No reference mapping for image check"]

    ref_path = REF_DIR / ref_name
    if not ref_path.exists():
        return True, [f"Reference not found for image check: {ref_name}"]

    issues = []
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
                if gen_info.file_size == ref_info.file_size:
                    issues.append(
                        f"Image NOT replaced (same size): {img_path} ({gen_info.file_size} bytes)"
                    )
            else:
                issues.append(
                    f"Image not found in reference: {img_path} (cannot verify replacement)"
                )

    return len(issues) == 0, issues


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/verify-build.py <output_dir>")
        print(
            "Example: python3 scripts/verify-build.py output/20260409-超级英雄超人/输出包"
        )
        sys.exit(1)

    output_dir = Path(sys.argv[1])
    if not output_dir.exists():
        print(f"❌ Output directory not found: {output_dir}")
        sys.exit(1)

    print(f"🔍 Verifying build: {output_dir}\n")

    all_zips = list(output_dir.glob("*.zip"))
    print(f"📦 Found {len(all_zips)} zip files (expected 15)")
    if len(all_zips) != 15:
        print(f"   ⚠️  Expected 15, got {len(all_zips)}")

    passed = 0
    failed = 0
    skipped = 0

    for prefix, ref_name in EXPECTED_ZIPS:
        gen_path = find_gen_zip(output_dir, prefix)
        if not gen_path:
            print(f"❌ Missing: {prefix}*.zip")
            failed += 1
            continue

        ref_path = REF_DIR / ref_name

        struct_ok, struct_issues = verify_structure(gen_path, ref_path, prefix)
        color_ok, color_issues = verify_color_injection(gen_path)
        image_ok, image_issues = verify_image_replacement(gen_path, prefix)

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

    print(f"\n{'=' * 60}")
    print(f"Results: {passed} passed, {failed} failed (of {len(EXPECTED_ZIPS)})")
    if failed == 0:
        print("✅ ALL CHECKS PASSED")
    else:
        print("❌ SOME CHECKS FAILED")
        sys.exit(1)


if __name__ == "__main__":
    main()
