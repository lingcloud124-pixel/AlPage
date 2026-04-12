#!/usr/bin/env python3
"""
Update a .pen theme file with new colors, text, gradients, and background images.

Usage: python3 scripts/update-pen-theme.py {nameEn}

Example: python3 scripts/update-pen-theme.py superman-superhero
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
COLORS_DIR = ROOT / "colors"
DESIGNS_DIR = ROOT / "designs"

TEMPLATES = {
    "light-ui": {
        "primary-color": "#2C615C",
        "primary-color-hover": "#228077",
        "alter-color": "#144E48",
        "alter-color-hover-on": "#56817D",
        "primary-color-opacity-10": "#EAF0EF",
        "primary-color-opacity-20": "#D5DFDE",
        "primary-color-opacity-30": "#C0D0CF",
        "portal-header-bg-extend-color": "#FBFCF2",
        "sidebar-panel-bg": "#FBF9EB",
        "login-bg-color": "#FDFFF6",
    },
    "dark-ui": {
        "primary-color": "#1A1A2E",
        "primary-color-hover": "#4A4A7E",
        "alter-color": "#0F3460",
        "alter-color-hover-on": "#3A3A6E",
        "primary-color-opacity-10": "#1A1A2E1A",
        "primary-color-opacity-20": "#1A1A2E33",
        "primary-color-opacity-30": "#1A1A2E4D",
        "portal-header-bg-extend-color": "#3A3A6E",
        "sidebar-panel-bg": "#3A3A6E",
        "login-bg-color": "#0F3460",
    },
}

MAPPING_RULES = [
    ("primary-color", "primary"),
    ("primary-color-hover", "primaryHover"),
    ("alter-color", "alterColor"),
    ("alter-color-hover-on", "alterColorHoverOn"),
    ("primary-color-opacity-10", "primaryOpacity10"),
    ("primary-color-opacity-20", "primaryOpacity20"),
    ("primary-color-opacity-30", "primaryOpacity30"),
    ("portal-header-bg-extend-color", "sidebarBg", "contentBg"),
    ("sidebar-panel-bg", "sidebarBg"),
    ("login-bg-color", "contentBg"),
]

VARIABLES_MAP = {
    "primary-color": ("primary", None),
    "primary-color-hover": ("primaryHover", None),
    "alter-color": ("alterColor", None),
    "alter-color-hover-on": ("alterColorHoverOn", None),
    "primary-color-opacity-10": ("primaryOpacity10", None),
    "primary-color-opacity-20": ("primaryOpacity20", None),
    "primary-color-opacity-30": ("primaryOpacity30", None),
    "header-font-color": ("headerFont", "#333333"),
    "portal-header-bg-extend-color": ("sidebarBg", None),
    "portal-header-simple-bg-extend-color": (None, "$portal-header-bg-extend-color"),
    "portal-header-pure-extend-color": ("primary", None),
    "sidebar-panel-bg": ("sidebarBg", None),
    "login-bg-color": ("contentBg", None),
}

# Gradient node IDs to update
GRADIENT_IDS = {"RWYIx", "6U9v0", "wPSk8", "aRs7H"}

HARDCODED_CLEANUP_DARK = {
    "#a7160b": "$primary-color",
    "#94170e": "$alter-color",
    "#C41B00": "$alter-color",
    "#c41a00": "$alter-color",
    "#fdd0a3": "$primary-color-hover",
    "#DCB496": "$header-font-color",
    "#FFE4CF": "$header-font-color",
    "#FBFCF2": "$sidebar-panel-bg",
    "#FDFFF6": "$login-bg-color",
}

HARDCODED_CLEANUP_LIGHT = {
    "#b72217": "$primary-color",
    "#c92d24": "$alter-color",
}

# Patterns that identify background image nodes to replace
BG_MATCH_PATTERNS = ["bg-login.jpg", "bg-login-spring.jpg", "图片生成", "ued"]


def build_hex_mapping(template_type: str, theme_colors: dict) -> dict:
    template_vars = TEMPLATES.get(template_type, TEMPLATES.get("light-ui", {}))
    hex_map = {}
    for rule in MAPPING_RULES:
        var_name = rule[0]
        color_key = rule[1]
        fallback_key = rule[2] if len(rule) > 2 else None
        old_hex = template_vars.get(var_name)
        if not old_hex:
            continue
        new_hex = theme_colors.get(color_key) or (
            fallback_key and theme_colors.get(fallback_key)
        )
        if not new_hex or new_hex.upper() == old_hex.upper():
            continue
        hex_map[old_hex.replace("#", "").upper()] = new_hex
        hex_map[old_hex.upper()] = new_hex
    return hex_map


def replace_hex_in_text(text: str, hex_map: dict) -> str:
    if not text or not text.startswith("$"):
        return text
    result = text
    for old_hex, new_hex in hex_map.items():
        old_clean = old_hex.replace("#", "").upper()
        pattern = f"(?:^|(?<=\n))#{old_clean}[0-9a-fA-F]*"
        result = re.sub(pattern, new_hex, result, flags=re.IGNORECASE)
    return result


def walk(obj, visitor):
    if isinstance(obj, dict):
        visitor(obj)
        for v in obj.values():
            if isinstance(v, (dict, list)):
                walk(v, visitor)
    elif isinstance(obj, list):
        for item in obj:
            walk(item, visitor)


def apply_theme(pen_path: str, nameEn: str):
    color_path = COLORS_DIR / f"{nameEn}.json"
    with open(color_path) as f:
        theme = json.load(f)

    print(f"Theme: {theme['name']} ({nameEn})")
    print(f"Type: {theme.get('templateType', 'light-ui')}")

    with open(pen_path) as f:
        data = json.load(f)

    theme_colors = theme["colors"]
    theme_name_cn = theme["name"]

    # === Step 1: Update frame names ===
    for child in data.get("children", []):
        name = child.get("name", "")
        if name.startswith("【") and "】" in name and "勿删除" not in name:
            old_name = re.findall(r"【(.*?)】", name)
            if old_name:
                child["name"] = name.replace(
                    f"【{old_name[0]}】", f"【{theme_name_cn}】"
                )
                print(f"  frame: {old_name[0]} -> {theme_name_cn}")

    # === Step 2: Update variables ===
    variables = data.get("variables", {})
    for var_name, (color_key, fallback) in VARIABLES_MAP.items():
        if var_name not in variables:
            continue
        if fallback and fallback.startswith("$"):
            new_val = fallback
        elif color_key and color_key in theme_colors:
            new_val = theme_colors[color_key]
        elif fallback:
            new_val = fallback
        else:
            continue
        if variables[var_name].get("value") != new_val:
            variables[var_name]["value"] = new_val

    # === Step 3: Update text hex values ===
    hex_map = build_hex_mapping(theme.get("templateType", "light-ui"), theme["colors"])
    text_updated = 0

    def update_text(obj):
        nonlocal text_updated
        if obj.get("type") == "text" and isinstance(obj.get("content"), str):
            old_content = obj["content"]
            new_content = replace_hex_in_text(old_content, hex_map)
            if new_content != old_content:
                obj["content"] = new_content
                text_updated += 1
        if isinstance(obj.get("content"), list):
            for item in obj["content"]:
                if isinstance(item, dict) and isinstance(item.get("content"), str):
                    old_c = item["content"]
                    new_c = replace_hex_in_text(old_c, hex_map)
                    if new_c != old_c:
                        item["content"] = new_c
                        text_updated += 1

    for child in data.get("children", []):
        walk(child, update_text)
    print(f"  text hex: {text_updated} updated")

    # === Step 3.5: Clean up hardcoded old colors ===
    cleanup_map = (
        HARDCODED_CLEANUP_DARK
        if template_type == "dark-ui"
        else HARDCODED_CLEANUP_LIGHT
    )
    cleanup_count = 0

    def cleanup_hardcoded(obj):
        nonlocal cleanup_count
        fill = obj.get("fill")
        if isinstance(fill, dict):
            fill_color = fill.get("color")
            if isinstance(fill_color, str) and fill_color.upper() in {
                k.upper() for k in cleanup_map
            }:
                for old_hex, var_ref in cleanup_map.items():
                    if fill_color.upper() == old_hex.upper():
                        fill["color"] = var_ref
                        cleanup_count += 1
                        break
            stroke = obj.get("stroke")
            if isinstance(stroke, str):
                for old_hex in cleanup_map:
                    if stroke.upper() == old_hex.upper():
                        obj["stroke"] = cleanup_map[old_hex]
                        cleanup_count += 1
                        break
        if isinstance(obj.get("content"), str):
            for old_hex in cleanup_map:
                if old_hex in obj["content"] or old_hex.upper() in obj["content"]:
                    obj["content"] = obj["content"].replace(
                        old_hex, cleanup_map[old_hex]
                    )
                    obj["content"] = obj["content"].replace(
                        old_hex.upper(), cleanup_map[old_hex]
                    )
                    cleanup_count += 1

    for child in data.get("children", []):
        walk(child, cleanup_hardcoded)
    print(f"  hardcoded cleanup: {cleanup_count} replaced")

    # === Step 4: Update gradient fills ===
    primary_op30 = theme_colors.get("primaryOpacity30", "#F8D67A")
    primary_light = theme_colors.get("primaryLight", "#FAE2A0")
    grad_updated = 0

    def update_gradients(obj):
        nonlocal grad_updated
        obj_id = obj.get("id", "")
        if obj_id in GRADIENT_IDS:
            fill = obj.get("fill")
            if isinstance(fill, dict) and fill.get("type") == "gradient":
                fill["colors"] = [
                    {"color": primary_op30, "position": 0},
                    {"color": primary_light, "position": 0.5},
                    {"color": primary_light + "00", "position": 1},
                ]
                grad_updated += 1

    for child in data.get("children", []):
        walk(child, update_gradients)
    print(f"  gradients: {grad_updated} updated")

    # === Step 5: Set background images (SINGLE PASS, absolute paths) ===
    bg_full = str((DESIGNS_DIR / f"{nameEn}-bg.png").resolve())
    if not Path(bg_full).exists():
        print(f"  WARNING: bg image not found: {bg_full}")
        return

    bg_count = 0

    def set_bg_images(obj):
        nonlocal bg_count
        fill = obj.get("fill")
        if isinstance(fill, dict) and fill.get("type") == "image":
            old_url = fill.get("url", "")
            if any(pat.lower() in old_url.lower() for pat in BG_MATCH_PATTERNS):
                bg_count += 1
            # ALWAYS set to absolute path regardless of match
            fill["url"] = bg_full

    for child in data.get("children", []):
        walk(child, set_bg_images)
    print(f"  bg images: {bg_count} matched + set, path={bg_full[:60]}...")

    # === Step 6: Write once and verify ===
    with open(pen_path, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    with open(pen_path) as f:
        data_check = json.load(f)

    abs_count = 0
    rel_count = 0

    def count_images(obj):
        nonlocal abs_count, rel_count
        fill = obj.get("fill")
        if isinstance(fill, dict) and fill.get("type") == "image":
            url = fill.get("url", "")
            if url.startswith("/"):
                abs_count += 1
            else:
                rel_count += 1
                obj["url"] = bg_full

    for child in data_check.get("children", []):
        walk(child, count_images)

    if rel_count > 0:
        with open(pen_path, "w") as f:
            json.dump(data_check, f, indent=2, ensure_ascii=False)
        print(f"  image paths: FIXED {rel_count} relative -> absolute")

    with open(pen_path) as f:
        data_final = json.load(f)

    final_abs = 0
    final_rel = 0

    def final_count(obj):
        nonlocal final_abs, final_rel
        fill = obj.get("fill")
        if isinstance(fill, dict) and fill.get("type") == "image":
            url = fill.get("url", "")
            if url.startswith("/"):
                final_abs += 1
            else:
                final_rel += 1

    for child in data_final.get("children", []):
        walk(child, final_count)

    if final_rel == 0:
        print(f"  image paths: {final_abs}/{final_abs + final_rel} absolute VERIFIED")
    else:
        print(
            f"  image paths: {final_rel}/{final_abs + final_rel} STILL RELATIVE - BUG!"
        )

    print(f"\nDone: {Path(pen_path).name}")


def main():
    nameEn = sys.argv[1] if len(sys.argv) > 1 else None
    if not nameEn:
        print("Usage: python3 scripts/update-pen-theme.py {nameEn}")
        sys.exit(1)

    pen_files = sorted(
        DESIGNS_DIR.glob("Topic-*.pen"), key=lambda p: p.stat().st_mtime, reverse=True
    )
    if not pen_files:
        print("No pen files found")
        sys.exit(1)

    apply_theme(str(pen_files[0]), nameEn)


if __name__ == "__main__":
    main()
