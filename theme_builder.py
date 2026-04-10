#!/usr/bin/env python3
"""
Unified Theme Package Builder

Supports: MK (modern), EKP v12/v13.5/v14~v16/v17
Usage:
  python3 theme_builder.py --config theme-build-request.yaml
  python3 theme_builder.py --config theme-build-request.yaml --output ./output
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path
from typing import Dict, List, Optional, Any

# =============================================================================
# Constants
# =============================================================================

SAMPLES_ROOT = Path(__file__).parent / "assets/references/samples/主题样例包"

TEMPLATE_ZIPS = {
    "mk": {
        "theme": "主题-MK-2026清明主题.zip",
        "login": "登录-MK-2026清明.zip",
    },
    "ekp_v12": {
        "theme": "主题-V12-2026清明主题.zip",
        "login": "登录-V12-2026清明.zip",
    },
    "ekp_v13_5": {
        "theme": "主题-V13〜V13.5-2026清明主题.zip",
        "login": "登录-V13-2026清明.zip",
    },
    "ekp_v14_16": {
        "theme": "主题-V14〜V16-2026清明主题.zip",
        "login": "登录-V16-2026清明.zip",
    },
    "ekp_v17": {
        "theme": "主题-V17-2026清明主题.zip",
        "login": "登录-V17-2026清明.zip",
    },
}

VERSION_LABELS = {
    "ekp_v12": "V12",
    "ekp_v13_5": "V13〜V13.5",
    "ekp_v14_16": "V14〜V16",
    "ekp_v17": "V17",
}

LOGIN_VARIANTS = {
    "ekp_v13_5": [
        {"label": "V13", "template": "登录-V13-2026清明.zip"},
        {"label": "V13.5", "template": "登录-V13.5-2026清明.zip"},
    ],
    "ekp_v14_16": [
        {"label": "V14", "template": "登录-V14-2026清明.zip"},
        {"label": "V15", "template": "登录-V15-2026清明.zip"},
        {"label": "V16", "template": "登录-V16-2026清明.zip"},
    ],
}

# Color replacement mapping for CSS (MK/EKP shared)
COLOR_VARIANTS = {
    "#144e48": None,
    "#2c615c": None,
    "#36706a": None,
    "#56817d": None,
    "#228077": None,
    "#b72217": None,
    "#c92d24": None,
}

BG_VARIANTS = {
    "#fbfcf2": None,
    "#fbf9eb": None,
}

# RGB replacements (for rgba() variants)
RGB_REPLACEMENTS = [
    (r"255,\s*134,\s*36", None),  # orange
    (r"20,\s*78,\s*72", None),  # green RGB
    (r"44,\s*97,\s*92", None),  # green RGB secondary
]


# =============================================================================
# Utility Functions
# =============================================================================


def log(msg: str, emoji: str = "ℹ️"):
    print(f"{emoji} {msg}")


def error(msg: str):
    print(f"❌ {msg}", file=sys.stderr)


def success(msg: str):
    print(f"✅ {msg}")


def warn(msg: str):
    print(f"⚠️  {msg}")


def ensure_dir(path: Path):
    path.mkdir(parents=True, exist_ok=True)


def resolve_path(p: Any, base: Optional[Path] = None) -> Optional[Path]:
    """Resolve a path string to absolute Path, or None if invalid."""
    if not p:
        return None
    sp = str(p).strip()
    if not sp:
        return None
    resolved = (
        Path(sp)
        if Path(sp).is_absolute()
        else (base / sp if base else Path(sp).resolve())
    )
    return resolved if resolved.exists() else None


def load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def dump_json(path: Path, data):
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def read_text(path: Path) -> str:
    with path.open("r", encoding="utf-8") as f:
        return f.read()


def write_text(path: Path, content: str):
    with path.open("w", encoding="utf-8") as f:
        f.write(content)


# =============================================================================
# Color Injection
# =============================================================================


def hex_to_rgb(hex_color: str) -> tuple:
    """Convert #RRGGBB to (R, G, B) tuple."""
    clean = hex_color.lstrip("#")
    if len(clean) == 3:
        clean = "".join(c * 2 for c in clean)
    return tuple(int(clean[i : i + 2], 16) for i in (0, 2, 4))


def build_color_replacements(theme_color: str) -> Dict[str, str]:
    """Build all color variant replacements for a given theme color."""
    rgb = hex_to_rgb(theme_color)
    replacements = {}
    for hex_code in COLOR_VARIANTS:
        replacements[hex_code.lower()] = theme_color.lower()
        replacements[hex_code.upper()] = theme_color.upper()
    # RGB variants
    replacements[f"{rgb[0]}, {rgb[1]}, {rgb[2]}"] = f"{rgb[0]},{rgb[1]},{rgb[2]}"
    replacements[f"{rgb[0]},{rgb[1]},{rgb[2]}"] = f"{rgb[0]},{rgb[1]},{rgb[2]}"
    return replacements


def inject_color_into_css(
    content: str, theme_color: str, header_font: str = "#333333"
) -> str:
    replacements = build_color_replacements(theme_color)
    for hex_code in BG_VARIANTS:
        replacements[hex_code.lower()] = header_font.lower()
        replacements[hex_code.upper()] = header_font.upper()
    result = content
    for old, new in replacements.items():
        result = result.replace(old, new)
    return result


def inject_header_font_color(content: str, header_font: str) -> str:
    replacements = [
        "$header-font-color:#333;",
        "$header-font-color:#333333;",
        "$header-font-color: #333;",
        "$header-font-color: #333333;",
        "$portal-header-font-color:#333;",
        "$portal-header-font-color: #333;",
        "$tlayout-header-font-color:#333;",
        "$tlayout-header-font-color: #333;",
        "$single-header-font-color:#333;",
        "$single-header-font-color: #333;",
        "$tabpage-header-font-color:#333;",
        "$tabpage-header-font-color: #333;",
    ]
    result = content
    for old in replacements:
        new = old.replace("#333;", f"{header_font};").replace(
            "#333333;", f"{header_font};"
        )
        result = result.replace(old, new)
    return result


def inject_color_into_rgb(content: str, theme_color: str) -> str:
    """Replace RGB color triplets in CSS content with theme color RGB."""
    rgb = hex_to_rgb(theme_color)
    patterns = [
        (f"255, 134, 36", f"{rgb[0]},{rgb[1]},{rgb[2]}"),
        (f"255,134,36", f"{rgb[0]},{rgb[1]},{rgb[2]}"),
        (f"20, 78, 72", f"{rgb[0]},{rgb[1]},{rgb[2]}"),
        (f"20,78,72", f"{rgb[0]},{rgb[1]},{rgb[2]}"),
        (f"44, 97, 92", f"{rgb[0]},{rgb[1]},{rgb[2]}"),
        (f"44,97,92", f"{rgb[0]},{rgb[1]},{rgb[2]}"),
    ]
    result = content
    for old, new in patterns:
        result = result.replace(old, new)
    return result


# =============================================================================
# Image Replacement
# =============================================================================


def replace_image(src: Path, dest: Path) -> bool:
    """Copy image file to destination, creating directories as needed."""
    if not src.exists():
        warn(f"Image not found: {src}, skipping")
        return False
    ensure_dir(dest.parent)
    shutil.copy2(src, dest)
    return True


# =============================================================================
# MK Package Building
# =============================================================================


def build_mk_package(
    work_dir: Path,
    output_dir: Path,
    title: str,
    subtitle: str,
    button_text: str,
    theme_color: str,
    images: Dict[str, str],
    header_font: str = "#333333",
    config_base: Optional[Path] = None,
) -> List[Path]:
    """
    Build MK (modern) theme + login packages.

    Returns list of output zip paths.
    """
    if config_base is None:
        config_base = work_dir

    outputs = []

    # -------------------------------------------------------------------------
    # Theme package
    # -------------------------------------------------------------------------
    theme_zip = SAMPLES_ROOT / TEMPLATE_ZIPS["mk"]["theme"]
    theme_extract_dir = work_dir / "mk_theme_extract"
    theme_name = "mk-festival-26-qingm"  # inner folder name in zip

    log(f"Unzipping MK theme: {theme_zip}")
    if theme_zip.exists():
        shutil.unpack_archive(theme_zip, theme_extract_dir)
    else:
        error(f"MK theme template not found: {theme_zip}")
        return []

    # Find the actual inner directory (e.g. mk-festival-26-qingm/)
    inner_theme_dir = None
    for child in theme_extract_dir.iterdir():
        if child.is_dir() and child.name.startswith("mk-"):
            inner_theme_dir = child
            break
    if not inner_theme_dir:
        error("Could not find MK theme inner directory")
        return []

    # ---- Modify config.json ----
    config_file = inner_theme_dir / "config.json"
    if config_file.exists():
        config = load_json(config_file)
        walk_and_set_locale(config, "loginTitle", title)
        walk_and_set_locale(config, "loginTitleDesc", subtitle)
        walk_and_set_locale(config, "loginBtnText", button_text)
        dump_json(config_file, config)
        log(f"Updated config.json: title='{title}', btn='{button_text}'")

    # ---- Modify sample/sample.json ----
    sample_config = inner_theme_dir / "sample" / "sample.json"
    if sample_config.exists():
        sample = load_json(sample_config)
        if sample.get("config", {}).get("render"):
            sample["config"]["render"]["loginTitle"] = title
            sample["config"]["render"]["loginTitleDesc"] = subtitle
            sample["config"]["render"]["loginBtnText"] = button_text
            sample["config"]["render"]["logoURL"] = (
                "@user-login/login26-festival-spring/static/logo.png"
            )
            sample["config"]["render"]["backgroundURL"] = (
                "@user-login/login26-festival-spring/static/background.png"
            )
            dump_json(sample_config, sample)

    # ---- Inject theme color into CSS ----
    for css_name in ["style.css", "simple.css"]:
        css_file = inner_theme_dir / css_name
        if css_file.exists():
            content = read_text(css_file)
            content = inject_color_into_css(content, theme_color, header_font)
            content = inject_color_into_rgb(content, theme_color)
            content = inject_header_font_color(content, header_font)
            write_text(css_file, content)
            log(f"Injected color {theme_color} into {css_name}")

    # ---- Replace header images ----
    static_dir = inner_theme_dir / "static"
    image_map = {
        "header-banner.png": images.get("headerBanner"),
        "header-classic.png": images.get("headerClassic"),
        "header-simple.png": images.get("headerSimple"),
        "header-tabs.png": images.get("headerTabs"),
        "header-icon.png": images.get("headerIcon"),
        "header-sideheader.png": images.get("headerSideheader"),
    }
    for filename, src_path in image_map.items():
        if src_path:
            src = resolve_path(src_path, config_base)
            if src:
                replace_image(src, static_dir / filename)
                log(f"Replaced {filename}")

    # ---- Repack theme zip ----
    theme_output = output_dir / f"主题-MK-{title}.zip"
    repack_dir(theme_extract_dir, theme_output, inner_theme_dir.name)
    outputs.append(theme_output)
    success(f"MK theme package: {theme_output.name}")

    # Cleanup extract dir
    shutil.rmtree(theme_extract_dir, ignore_errors=True)

    # -------------------------------------------------------------------------
    # Login package
    # -------------------------------------------------------------------------
    login_zip = SAMPLES_ROOT / TEMPLATE_ZIPS["mk"]["login"]
    login_extract_dir = work_dir / "mk_login_extract"
    login_name = "login26-festival-qingm"

    log(f"Unzipping MK login: {login_zip}")
    if login_zip.exists():
        shutil.unpack_archive(login_zip, login_extract_dir)
    else:
        error(f"MK login template not found: {login_zip}")
        return outputs

    inner_login_dir = None
    for child in login_extract_dir.iterdir():
        if child.is_dir() and child.name.startswith("login26-"):
            inner_login_dir = child
            break
    if not inner_login_dir:
        error("Could not find MK login inner directory")
        return outputs

    # ---- Modify config.json ----
    login_config = inner_login_dir / "config.json"
    if login_config.exists():
        cfg = load_json(login_config)
        walk_and_set_locale(cfg, "loginTitle", title)
        walk_and_set_locale(cfg, "loginTitleDesc", subtitle)
        walk_and_set_locale(cfg, "loginBtnText", button_text)
        dump_json(login_config, cfg)

    # ---- Modify data.json ----
    login_data = inner_login_dir / "data.json"
    if login_data.exists():
        content = read_text(login_data)
        content = content.replace("$loginTitle$", title)
        content = content.replace("$loginBtnText$", button_text)
        write_text(login_data, content)

    # ---- Modify sample/sample.json ----
    login_sample = inner_login_dir / "sample" / "sample.json"
    if login_sample.exists():
        sample = load_json(login_sample)
        if sample.get("config", {}).get("render"):
            sample["config"]["render"]["loginTitle"] = title
            sample["config"]["render"]["loginTitleDesc"] = subtitle
            sample["config"]["render"]["loginBtnText"] = button_text
            sample["config"]["render"]["logoURL"] = (
                "@user-login/login26-festival-spring/static/logo.png"
            )
            sample["config"]["render"]["backgroundURL"] = (
                "@user-login/login26-festival-spring/static/background.png"
            )
            dump_json(login_sample, sample)

    # ---- Inject theme color into login CSS ----
    for css_file in login_extract_dir.rglob("*.css"):
        if "font/" in str(css_file):
            continue
        content = read_text(css_file)
        modified = inject_color_into_css(content, theme_color)
        modified = inject_color_into_rgb(modified, theme_color)
        write_text(css_file, modified)
    log(f"Injected color {theme_color} into login CSS")

    # ---- Replace login images ----
    login_static = inner_login_dir / "static"
    if images.get("loginBackground"):
        src = resolve_path(images["loginBackground"], config_base)
        if src:
            replace_image(src, login_static / "background.png")
            log("Replaced login background")
    if images.get("loginLogo"):
        src = resolve_path(images["loginLogo"], config_base)
        if src:
            replace_image(src, login_static / "logo.png")
            log("Replaced login logo")

    # ---- Repack login zip ----
    login_output = output_dir / f"登录-MK-{title}.zip"
    repack_dir(login_extract_dir, login_output, inner_login_dir.name)
    outputs.append(login_output)
    success(f"MK login package: {login_output.name}")

    shutil.rmtree(login_extract_dir, ignore_errors=True)
    return outputs


# =============================================================================
# EKP Package Building
# =============================================================================


def build_ekp_package(
    product_key: str,
    work_dir: Path,
    output_dir: Path,
    title: str,
    subtitle: str,
    button_text: str,
    theme_color: str,
    images: Dict[str, str],
    header_font: str = "#333333",
    config_base: Optional[Path] = None,
) -> List[Path]:
    """
    Build EKP (legacy) theme + login packages for a specific version.

    product_key: one of ekp_v12, ekp_v13_5, ekp_v14_16, ekp_v17
    Returns list of output zip paths.
    """
    if config_base is None:
        config_base = work_dir
    if product_key not in TEMPLATE_ZIPS:
        error(f"Unknown EKP product: {product_key}")
        return []

    templates = TEMPLATE_ZIPS[product_key]
    outputs = []

    version_label = VERSION_LABELS.get(
        product_key, product_key.replace("ekp_", "V").upper()
    )

    # -------------------------------------------------------------------------
    # EKP Theme package
    # -------------------------------------------------------------------------
    theme_zip = SAMPLES_ROOT / templates["theme"]
    theme_extract_dir = work_dir / f"ekp_theme_{version_label}_extract"

    log(f"Unzipping EKP {version_label} theme: {theme_zip}")
    if not theme_zip.exists():
        error(f"EKP theme template not found: {theme_zip}")
        return []

    shutil.unpack_archive(theme_zip, theme_extract_dir)

    # Find the actual theme root directory
    inner_theme_dir = find_first_subdir(theme_extract_dir)

    # ---- Modify theme.xml ----
    theme_xml = inner_theme_dir / "design-xml" / "theme.xml"
    if theme_xml.exists():
        content = read_text(theme_xml)
        content = content.replace("$loginTitle$", title)
        content = content.replace("$loginBtnText$", button_text)
        write_text(theme_xml, content)
        log(f"Updated theme.xml: title='{title}', btn='{button_text}'")

    # ---- Inject theme color into all CSS files in style/ ----
    style_dir = inner_theme_dir / "style"
    if style_dir.exists():
        for css_file in style_dir.rglob("*.css"):
            content = read_text(css_file)
            modified = inject_color_into_css(content, theme_color, header_font)
            modified = inject_color_into_rgb(modified, theme_color)
            modified = inject_header_font_color(modified, header_font)
            write_text(css_file, modified)
        log(f"Injected color {theme_color} into style/*.css")

    scss_dir = inner_theme_dir / "scss"
    if scss_dir.exists():
        for scss_file in scss_dir.rglob("*.scss"):
            content = read_text(scss_file)
            modified = inject_color_into_css(content, theme_color, header_font)
            modified = inject_header_font_color(modified, header_font)
            write_text(scss_file, modified)
        log(f"Injected color {theme_color} into scss/*.scss")

    # ---- Replace thumb.jpg (thumbnail) ----
    thumb = inner_theme_dir / "thumb.jpg"
    if images.get("loginBackground"):
        src = resolve_path(images["loginBackground"], config_base)
        if src:
            replace_image(src, thumb)
            log("Replaced thumb.jpg")

    image_style_dir = inner_theme_dir / "images" / "image-style"
    if image_style_dir.exists():
        ekl_image_map = {
            "header_tlayout_frame_bg.png": images.get("headerSimple"),
            "header_complex_frame_bg.png": images.get("headerClassic"),
            "header_menu_frame_bg.png": images.get("headerMenu"),
            "header_zone_frame_bg.png": images.get("headerTabs"),
            "header_zone_nav_frame_bg.png": images.get("headerTabs"),
            "header_single_menu_frame_bg.png": images.get("headerSimple"),
            "header-banner.png": images.get("headerBanner"),
            "header-sideheader.png": images.get("headerSideheader"),
        }
        for filename, src_path in ekl_image_map.items():
            if src_path:
                src = resolve_path(src_path, config_base)
                if src:
                    dest = image_style_dir / filename
                    if dest.parent.exists():
                        shutil.copy2(src, dest)
                        log(f"Replaced {filename}")

    # ---- Repack theme zip (flat: files at zip root, no wrapper folder) ----
    theme_output = output_dir / f"主题-{version_label}-{title}.zip"
    repack_dir(inner_theme_dir, theme_output, inner_name=None)
    outputs.append(theme_output)
    success(f"EKP {version_label} theme package: {theme_output.name}")

    shutil.rmtree(theme_extract_dir, ignore_errors=True)

    # -------------------------------------------------------------------------
    # EKP Login package
    # -------------------------------------------------------------------------
    login_zip = SAMPLES_ROOT / templates["login"]
    login_extract_dir = work_dir / f"ekp_login_{version_label}_extract"

    log(f"Unzipping EKP {version_label} login: {login_zip}")
    if not login_zip.exists():
        error(f"EKP login template not found: {login_zip}")
        return outputs

    shutil.unpack_archive(login_zip, login_extract_dir)

    inner_login_dir = find_first_subdir(login_extract_dir)
    repack_login_dir = login_extract_dir

    for css_file in login_extract_dir.rglob("*.css"):
        if "font/" in str(css_file):
            continue
        content = read_text(css_file)
        modified = inject_color_into_css(content, theme_color, header_font)
        modified = inject_color_into_rgb(modified, theme_color)
        write_text(css_file, modified)
    log(f"Injected color {theme_color} into EKP login CSS")

    login_static = inner_login_dir
    if images.get("loginBackground"):
        src = resolve_path(images["loginBackground"], config_base)
        if src:
            replaced = False
            for loc in ["login_bg/bg-login.jpg", "images/bg-login.jpg"]:
                dest = login_static / loc
                if dest.parent.exists():
                    replace_image(src, dest)
                    replaced = True
                    break
            if not replaced:
                replace_image(src, login_static / "images" / "bg-login.jpg")
            log("Replaced EKP login background")

            # Replace bg_login_iframe.png (V12 login iframe background)
            for iframe_loc in ["images/bg_login_iframe.png"]:
                iframe_dest = login_static / iframe_loc
                if iframe_dest.exists():
                    replace_image(src, iframe_dest)
                    log("Replaced bg_login_iframe.png")

            login_thumb_src = config_base / "login_thumb.jpg"
            if login_thumb_src.exists():
                for thumb_loc in ["login_thumb.jpg"]:
                    thumb_dest = login_static / thumb_loc
                    if thumb_dest.parent.exists():
                        replace_image(login_thumb_src, thumb_dest)
                        log("Replaced login_thumb.jpg")
                        break

            for thumb_name in ["thumb-1.jpg", "thumb-2.jpg"]:
                thumb_src = config_base / "login_bg" / thumb_name
                if thumb_src.exists():
                    thumb_dest = login_static / "login_bg" / thumb_name
                    if thumb_dest.parent.exists():
                        replace_image(thumb_src, thumb_dest)
                        log(f"Replaced login_bg/{thumb_name}")

    if images.get("loginLogo"):
        src = resolve_path(images["loginLogo"], config_base)
        if src:
            for logo_name in [
                "images/logo.png",
                "logo.png",
                "images/logo.jpg",
                "logo/logo.png",
            ]:
                logo_path = login_static / logo_name
                if logo_path.parent.exists():
                    replace_image(src, logo_path)
                    break
            log("Replaced EKP login logo")

    login_output = output_dir / f"登录-{version_label}-{title}.zip"
    repack_dir(repack_login_dir, login_output, inner_name=None)
    outputs.append(login_output)
    success(f"EKP {version_label} login package: {login_output.name}")

    shutil.rmtree(login_extract_dir, ignore_errors=True)

    # -------------------------------------------------------------------------
    # Login variants (V13.5 from V13 template, V14/V15 from V16 template)
    # -------------------------------------------------------------------------
    variants = LOGIN_VARIANTS.get(product_key, [])
    for variant in variants:
        variant_label = variant["label"]
        variant_template = variant["template"]
        variant_zip = SAMPLES_ROOT / variant_template

        if not variant_zip.exists():
            warn(f"Login variant template not found: {variant_zip}, skipping")
            continue

        variant_extract = work_dir / f"ekp_login_{variant_label}_extract"
        log(f"Building login variant: {variant_label}")

        shutil.unpack_archive(variant_zip, variant_extract)
        variant_inner = find_first_subdir(variant_extract)

        for css_file in variant_extract.rglob("*.css"):
            if "font/" in str(css_file):
                continue
            content = read_text(css_file)
            modified = inject_color_into_css(content, theme_color, header_font)
            modified = inject_color_into_rgb(modified, theme_color)
            write_text(css_file, modified)

        if images.get("loginBackground"):
            src = resolve_path(images["loginBackground"], config_base)
            if src:
                replaced = False
                for loc in ["login_bg/bg-login.jpg", "images/bg-login.jpg"]:
                    dest = variant_inner / loc
                    if dest.parent.exists():
                        replace_image(src, dest)
                        replaced = True
                        break
                if not replaced:
                    replace_image(src, variant_inner / "images" / "bg-login.jpg")
                log(f"Replaced {variant_label} login background")

                login_thumb_src = config_base / "login_thumb.jpg"
                if login_thumb_src.exists():
                    for thumb_loc in ["login_thumb.jpg"]:
                        thumb_dest = variant_inner / thumb_loc
                        if thumb_dest.parent.exists():
                            replace_image(login_thumb_src, thumb_dest)
                            log(f"Replaced {variant_label} login_thumb.jpg")
                            break

                for thumb_name in ["thumb-1.jpg", "thumb-2.jpg"]:
                    thumb_src = config_base / "login_bg" / thumb_name
                    if thumb_src.exists():
                        thumb_dest = variant_inner / "login_bg" / thumb_name
                        if thumb_dest.parent.exists():
                            replace_image(thumb_src, thumb_dest)
                            log(f"Replaced {variant_label} login_bg/{thumb_name}")

        variant_output = output_dir / f"登录-{variant_label}-{title}.zip"
        repack_dir(variant_extract, variant_output, inner_name=None)
        outputs.append(variant_output)
        success(f"EKP {variant_label} login variant: {variant_output.name}")

        shutil.rmtree(variant_extract, ignore_errors=True)

    return outputs


# =============================================================================
# Helper: Walk & Set Locale
# =============================================================================


def walk_and_set_locale(obj, key: str, value: str):
    """Recursively set a locale-type key in a nested config dict."""
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k == key:
                if isinstance(v, dict):
                    v["zh-cn"] = value
                    v["en-us"] = value
                elif isinstance(v, str):
                    obj[k] = value
            else:
                walk_and_set_locale(v, key, value)
    elif isinstance(obj, list):
        for item in obj:
            walk_and_set_locale(item, key, value)


# =============================================================================
# Helper: Repack Directory to Zip
# =============================================================================

SKIP_NAMES = {".DS_Store", "__MACOSX"}


def iter_files_skip(root: Path, skip_names=None):
    if skip_names is None:
        skip_names = SKIP_NAMES
    for path in sorted(root.rglob("*")):
        if path.is_dir():
            continue
        if path.name in skip_names:
            continue
        # Skip paths containing __MACOSX
        if "__MACOSX" in path.parts:
            continue
        yield path


def repack_dir(source_dir: Path, output_zip: Path, inner_name: Optional[str] = None):
    """Repack a directory into a zip file.

    If inner_name is provided, files are placed inside that named folder in the zip
    (used for MK packages which have mk-festival-26-qingm/ or login26-festival-qingm/).

    If inner_name is None, files are placed at the zip root directly
    (used for EKP packages which should have flat structure).
    """
    ensure_dir(output_zip.parent)
    if output_zip.exists():
        output_zip.unlink()

    if inner_name:
        content_dir = (
            source_dir / inner_name
            if (source_dir / inner_name).exists()
            else source_dir
        )
    else:
        content_dir = source_dir

    with zipfile.ZipFile(output_zip, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for file_path in iter_files_skip(content_dir):
            rel = file_path.relative_to(content_dir)
            if inner_name:
                arcname = str(Path(inner_name) / rel)
            else:
                arcname = str(rel)
            zf.write(file_path, arcname)


def find_first_subdir(parent: Path) -> Path:
    """Find the content directory inside an extracted zip.

    For EKP theme zips: content is nested inside a subfolder (design-xml/, style/ etc.)
    For EKP login zips (V14-V17): content is directly at root (config.ini, css/ etc.)
    For MK zips: content is inside mk-festival-* or login26-* subfolder
    """
    # Check if root IS the content dir (V14-V17 login: config.ini or login.css at root)
    login_markers = ["config.ini"]
    for marker in login_markers:
        if (parent / marker).exists():
            return parent

    # V14-V17 login: login.css directly under a css/ subdir at root
    if (parent / "css" / "login.css").exists() and not (parent / "style").exists():
        return parent

    # Check if root has style/ or scss/ (theme packages with CSS at root)
    content_dirs = ["style", "scss"]
    for d in content_dirs:
        if (parent / d).exists():
            return parent

    # Otherwise, descend into the first non-hidden subdirectory
    for child in sorted(parent.iterdir()):
        if (
            child.is_dir()
            and not child.name.startswith(".")
            and child.name not in SKIP_NAMES
        ):
            return child
    return parent


# =============================================================================
# Main Build Flow
# =============================================================================


def load_config(config_path: Path) -> dict:
    """Load YAML config file."""
    try:
        import yaml
    except ImportError:
        error("PyYAML is required. Install it with: pip3 install pyyaml")
        sys.exit(1)
    with config_path.open("r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def build_all(config_path: Path, output_dir: Path):
    cfg = load_config(config_path)

    title = cfg.get("title", "未命名主题")
    subtitle = cfg.get("subtitle", "")
    button_text = cfg.get("buttonText", "立即进入")
    theme_color = cfg.get("themeColor", "#144e48")
    header_font = cfg.get("headerFont", "#333333")
    images = cfg.get("images", {})
    products = cfg.get("products", ["mk"])
    config_base = config_path.parent.resolve()

    ensure_dir(output_dir)

    work_base = output_dir / "__build_work"
    ensure_dir(work_base)

    all_outputs = []

    for product in products:
        log(f"\n{'=' * 60}")
        log(f"Building: {product.upper()}")
        log(f"{'=' * 60}")

        if product == "mk":
            outs = build_mk_package(
                work_dir=work_base / "mk",
                output_dir=output_dir,
                title=title,
                subtitle=subtitle,
                button_text=button_text,
                theme_color=theme_color,
                images=images,
                header_font=header_font,
                config_base=config_base,
            )
            all_outputs.extend(outs)

        elif product.startswith("ekp_"):
            outs = build_ekp_package(
                product_key=product,
                work_dir=work_base / product,
                output_dir=output_dir,
                title=title,
                subtitle=subtitle,
                button_text=button_text,
                theme_color=theme_color,
                images=images,
                header_font=header_font,
                config_base=config_base,
            )
            all_outputs.extend(outs)

        else:
            warn(f"Unknown product '{product}', skipping")

    # Cleanup work directory
    shutil.rmtree(work_base, ignore_errors=True)

    # Summary
    log(f"\n{'=' * 60}")
    log(f"Build Summary")
    log(f"{'=' * 60}")
    if all_outputs:
        for p in all_outputs:
            size_kb = p.stat().st_size // 1024
            success(f"  {p.name} ({size_kb} KB)")
        log(f"\nOutput directory: {output_dir}")
    else:
        error("No packages were generated!")
    return all_outputs


# =============================================================================
# CLI
# =============================================================================


def parse_args():
    parser = argparse.ArgumentParser(
        description="Unified Theme Package Builder — MK + EKP"
    )
    parser.add_argument(
        "--config",
        "-c",
        required=True,
        help="Path to theme-build-request.yaml config file",
    )
    parser.add_argument(
        "--output",
        "-o",
        help="Output directory (default: ./output in config's directory)",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    config_path = Path(args.config).resolve()

    if not config_path.exists():
        error(f"Config file not found: {config_path}")
        sys.exit(1)

    if args.output:
        output_dir = Path(args.output).resolve()
    else:
        output_dir = config_path.parent / "output"

    ensure_dir(output_dir)
    success(f"Output directory: {output_dir}")

    build_all(config_path, output_dir)


if __name__ == "__main__":
    raise SystemExit(main())
