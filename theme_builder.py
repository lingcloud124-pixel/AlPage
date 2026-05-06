#!/usr/bin/env python3
"""
Unified Theme Package Builder

Supports: MK (modern), EKP v14/v15/v16/v17
Usage:
  python3 theme_builder.py --config theme-build-request.yaml
  python3 theme_builder.py --config theme-build-request.yaml --output ./output
"""

import argparse
import json
import math
import os
import re
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple

try:
    from PIL import Image, ImageDraw
except ImportError:
    Image = None
    ImageDraw = None

# =============================================================================
# Constants
# =============================================================================

PROJECT_ROOT = Path(__file__).parent
LOCAL_SAMPLES_DIR = PROJECT_ROOT / "assets" / "references" / "samples"

DEFAULT_SAMPLES_ROOTS = {
    "light-ui": LOCAL_SAMPLES_DIR / "light",
    "dark-ui": LOCAL_SAMPLES_DIR / "dark",
}

TEMPLATE_ZIPS_BY_TYPE = {
    "light-ui": {
        "mk": {
            "theme": "主题-MK-2026清明主题.zip",
            "login": "登录-MK-2026清明.zip",
        },
        "ekp_v14": {
            "theme": "主题-V14-2026清明.zip",
            "login": "登录-V14-2026清明.zip",
        },
        "ekp_v15": {
            "theme": "主题-V15-2026清明.zip",
            "login": "登录-V15-2026清明.zip",
        },
        "ekp_v16": {
            "theme": "主题-V16-2026清明.zip",
            "login": "登录-V16-2026清明.zip",
        },
        "ekp_v17": {
            "theme": "主题-V17-2026清明.zip",
            "login": "登录-V17-2026清明.zip",
        },
    },
    "dark-ui": {
        "mk": {
            "theme": "mk-festival-26-spring主题包.zip",
            "login": "mk-festival-spring-登录包.zip",
        },
        "ekp_v14": {
            "theme": "主题-V14-2026春节.zip",
            "login": "登录-V14-2026春节.zip",
        },
        "ekp_v15": {
            "theme": "主题-V15-2026春节.zip",
            "login": "登录-V15-2026春节.zip",
        },
        "ekp_v16": {
            "theme": "主题-V16-2026春节.zip",
            "login": "登录-V16-2026春节.zip",
        },
        "ekp_v17": {
            "theme": "主题-V17-2026春节.zip",
            "login": "登录-V17-2026春节.zip",
        },
    },
}

VERSION_LABELS = {
    "ekp_v14": "V14",
    "ekp_v15": "V15",
    "ekp_v16": "V16",
    "ekp_v17": "V17",
}

PACKAGE_README_NAME = "readme.txt"
PACKAGE_README_CONTENT = """主题包使用说明

1. 压缩包为导入原始包，请勿提前解压后再导入系统。
2. 主题包与登录包需要按产品版本分别导入，请确认版本匹配后再操作。
3. 导入前建议先备份当前线上主题与登录配置。
4. 若压缩包内包含预览图或背景图，属于交付内容的一部分，请勿删除。
5. 如需二次修改，请基于本次导出的源素材重新打包，不建议直接改动压缩包内部文件。
"""

# Color replacement mapping for CSS (MK/EKP shared)
COLOR_VARIANTS = {
    "#144e48": None,
    "#2c615c": None,
    "#36706a": None,
    "#56817d": None,
    "#228077": None,
    "#b72217": None,
    "#c92d24": None,
    "#1a1a2e": None,
    "#0f3460": None,
    "#4a4a7e": None,
    "#3a3a6e": None,
}

BG_VARIANTS = {
    "#fbfcf2": None,
    "#fbf9eb": None,
}

LEGACY_VARIABLE_COLOR_VARIANTS = {
    "header-font-color": ["#ffe4cf", "#FFE4CF"],
    "sidebar-icon-color": ["#dcb496", "#DCB496"],
    "portal-header-bg-extend-color": ["#c41b00", "#C41B00", "#fbfcf2", "#FBFCF2", "#fbf9eb", "#FBF9EB"],
}

DEFAULT_THEME_VARIABLES = {
    "primary-color": "#2C615C",
    "primary-color-hover": "#B2FFE6",
    "alter-color": "#144E48",
    "alter-color-hover-on": "#73CAA6",
    "primary-color-opacity-10": "#E9F1EB",
    "primary-color-opacity-20": "#D3E2D8",
    "primary-color-opacity-30": "#BDD4C4",
    "header-font-color": "#333333",
    "auxiliary-gray": "#999999",
    "auxiliary-gray-dark": "#666666",
    "body-bg-color": "#F8F8F8",
    "portal-header-bg-extend-color": "#FBFCF2",
    "portal-header-complex-bg-extend-color": "#FBFCF2",
    "login-bg-color": "#144E48",
    "panel-bg-color": "#FFFFFF",
    "sidebar-panel-bg": "#B8A9D9",
    "sidebar-color": "#333333",
    "sidebar-icon-color": "#9B8FC7",
    "border-color": "#E5E7EB",
    "border-icon-color": "#E5E7EB",
    "gradient-start": "#FDFFF5",
    "gradient-mid": "#F7F3CD",
}

PREFERRED_RAW_COLOR_VARIABLES = {
    "#144e48": "alter-color",
    "#333333": "header-font-color",
    "#fbfcf2": "portal-header-bg-extend-color",
    "#e5e7eb": "border-color",
}

# RGB replacements (for rgba() variants)
RGB_REPLACEMENTS = [
    (r"255,\s*134,\s*36", None),  # orange
    (r"20,\s*78,\s*72", None),  # green RGB
    (r"44,\s*97,\s*92", None),  # green RGB secondary
]

MAX_PACKAGE_TITLE_LENGTH = 10
MK_LOGIN_PART_CODE_MAX_LENGTH = 36

DIRECT_THEME_PATTERNS: List[Tuple[str, List[str]]] = [
    ("shenergy-enterprise", [r"申能", r"\bshenergy\b"]),
    ("happy-xishuangbanna", [r"西双版纳", r"\bxishuangbanna\b"]),
    ("maldives-vacation", [r"马尔代夫", r"\bmaldives\b"]),
    ("mount-tai", [r"泰山", r"\bmount\s*tai\b"]),
    ("superman-superhero", [r"超级英雄", r"超人", r"\bsuper(hero|man)\b"]),
    ("yellow-duck", [r"小黄鸭", r"\byellow duck\b"]),
    ("watermelon-harvest", [r"西瓜", r"\bwatermelon\b"]),
    ("cherry-blossom", [r"樱花", r"\bcherry blossom\b", r"\bsakura\b"]),
    ("peach-blossom", [r"桃花", r"\bpeach blossom\b"]),
    ("basketball-match", [r"篮球", r"\bbasketball\b"]),
    ("football-match", [r"足球", r"\bfootball\b", r"\bsoccer\b"]),
    ("interstellar", [r"星际", r"宇宙", r"太空", r"\binterstellar\b", r"\bspace\b"]),
    ("ice-wonderland", [r"冰雪", r"冰川", r"雪境", r"\bice\b", r"\bsnow\b"]),
    ("panda", [r"熊猫", r"\bpanda\b"]),
    ("sanya", [r"三亚", r"\bsanya\b"]),
    ("gaokao", [r"高考", r"\bgaokao\b"]),
    ("christmas", [r"圣诞", r"\bchristmas\b"]),
    ("mid-autumn", [r"中秋", r"\bmid[- ]autumn\b", r"\bmoon festival\b"]),
    ("dragon-boat", [r"端午", r"龙舟", r"\bdragon boat\b"]),
    ("spring-festival", [r"春节", r"新春", r"过年", r"\bspring festival\b", r"\blunar new year\b"]),
    ("winter-solstice", [r"冬至", r"\bwinter solstice\b"]),
    ("women-day", [r"妇女节", r"女神节", r"\bwomen'?s day\b"]),
    ("childrens-day", [r"儿童节", r"六一", r"\bchildren'?s day\b"]),
    ("anniversary", [r"周年", r"周年", r"\banniversary\b"]),
    ("1024", [r"1024", r"程序员节"]),
    ("qingming", [r"清明", r"\bqingming\b"]),
    ("national-day", [r"国庆", r"\bnational day\b"]),
    ("dark-spring", [r"暗夜春", r"春.*暗色", r"暗色.*春", r"\bdark\b.*\bspring\b", r"\bspring\b.*\bdark\b"]),
    ("corporate-blue", [r"企业蓝", r"\bcorporate blue\b"]),
    ("overtime-worker", [r"加班", r"夜班", r"深夜", r"\bovertime\b", r"\bnight shift\b"]),
    ("work-hard", [r"奋斗", r"拼搏", r"加油干", r"\bwork hard\b"]),
]

GENERIC_TOKEN_PATTERNS: List[Tuple[str, List[str]]] = [
    ("dark", [r"暗色", r"深色", r"夜景", r"夜晚", r"\bdark\b", r"\bnight\b"]),
    ("light", [r"亮色", r"浅色", r"\blight\b"]),
    ("spring", [r"春", r"\bspring\b"]),
    ("summer", [r"夏", r"\bsummer\b"]),
    ("autumn", [r"秋", r"\bautumn\b", r"\bfall\b"]),
    ("winter", [r"冬", r"\bwinter\b"]),
    ("festival", [r"节", r"\bfestival\b", r"\bholiday\b"]),
    ("enterprise", [r"企业", r"商务", r"办公", r"\benterprise\b", r"\bcorporate\b"]),
    ("tech", [r"科技", r"\btech\b", r"\bfuture\b"]),
    ("ocean", [r"海", r"海洋", r"\bocean\b", r"\bsea\b"]),
    ("mountain", [r"山", r"\bmountain\b"]),
    ("forest", [r"森林", r"林", r"\bforest\b"]),
    ("flower", [r"花", r"\bflower\b", r"\bblossom\b"]),
    ("blue", [r"蓝", r"\bblue\b"]),
    ("green", [r"绿", r"\bgreen\b"]),
    ("red", [r"红", r"\bred\b"]),
    ("gold", [r"金", r"\bgold(en)?\b"]),
]

ASCII_STOPWORDS = {
    "a", "an", "and", "app", "bg", "for", "image", "make", "me", "of", "page",
    "please", "style", "theme", "ui", "with", "workspace",
}

PINYIN_CHAR_MAP = {
    "春": "chun",
    "夏": "xia",
    "秋": "qiu",
    "冬": "dong",
    "清": "qing",
    "明": "ming",
    "国": "guo",
    "庆": "qing",
    "端": "duan",
    "午": "wu",
    "中": "zhong",
    "樱": "ying",
    "花": "hua",
    "桃": "tao",
    "山": "shan",
    "海": "hai",
    "星": "xing",
    "空": "kong",
    "企": "qi",
    "业": "ye",
    "蓝": "lan",
    "红": "hong",
    "绿": "lv",
    "金": "jin",
    "熊": "xiong",
    "猫": "mao",
    "夜": "ye",
    "申": "shen",
    "能": "neng",
    "三": "san",
    "亚": "ya",
    "西": "xi",
    "双": "shuang",
    "版": "ban",
    "纳": "na",
    "泰": "tai",
    "科": "ke",
    "技": "ji",
}


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


def normalize_name_en(value: Any) -> str:
    if value is None:
        return ""
    slug = re.sub(r"['\"`]", "", str(value).strip().lower())
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    slug = re.sub(r"^-+|-+$", "", slug)
    slug = re.sub(r"-{2,}", "-", slug)
    return slug[:64]


def _extract_direct_theme_slug(text: str) -> Optional[str]:
    for slug, patterns in DIRECT_THEME_PATTERNS:
        if any(re.search(pattern, text, flags=re.IGNORECASE) for pattern in patterns):
            if slug == "national-day" and re.search(r"暗色|深色|dark", text, flags=re.IGNORECASE):
                return "national-day-dark"
            return slug
    return None


def _extract_generic_tokens(text: str) -> List[str]:
    tokens = [
        token
        for token, patterns in GENERIC_TOKEN_PATTERNS
        if any(re.search(pattern, text, flags=re.IGNORECASE) for pattern in patterns)
    ]
    ascii_words = [
        word.lower()
        for word in re.findall(r"[a-z0-9]+", text, flags=re.IGNORECASE)
        if word.lower() not in ASCII_STOPWORDS
    ]
    merged = []
    for item in [*tokens, *ascii_words]:
        if item and item not in merged:
            merged.append(item)
    return merged[:4]


def _transliterate_chinese_text(text: str) -> str:
    chars = re.findall(r"[\u4e00-\u9fff]", text)
    transliterated = "-".join(PINYIN_CHAR_MAP.get(char, "") for char in chars if PINYIN_CHAR_MAP.get(char, ""))
    return normalize_name_en(transliterated)


def derive_name_en_from_text(text: Any) -> str:
    source = str(text or "").strip()
    if not source:
        return "project"

    direct_match = _extract_direct_theme_slug(source)
    if direct_match:
        return direct_match

    normalized = normalize_name_en(source)
    if normalized and re.search(r"[a-z]", normalized) and not normalized.isdigit():
        return normalized

    tokens = _extract_generic_tokens(source)
    if tokens:
        return normalize_name_en("-".join(tokens)) or "project"

    transliterated = _transliterate_chinese_text(source)
    return transliterated or "project"


def discover_sample_root(template_type: str) -> Optional[Path]:
    dir_name = DEFAULT_SAMPLES_ROOTS.get(template_type, LOCAL_SAMPLES_DIR / "主题样例包").name
    desktop_dir = Path.home() / "Desktop"
    search_patterns = [
        f"*/Topic Automation/assets/references/samples/{dir_name}",
        f"*/*/Topic Automation/assets/references/samples/{dir_name}",
    ]

    # Light-UI historically reused the generic "主题样例包" alias.
    if template_type == "light-ui":
        search_patterns.extend(
            [
                "*/Topic Automation/assets/references/samples/主题样例包",
                "*/*/Topic Automation/assets/references/samples/主题样例包",
            ]
        )

    for pattern in search_patterns:
        for candidate in desktop_dir.glob(pattern):
            if candidate.exists():
                return candidate.resolve()

    return None


def resolve_samples_root(template_type: str, configured_root: Optional[str] = None) -> Path:
    if configured_root:
        configured = Path(configured_root).expanduser().resolve()
        if configured.exists():
            return configured
        warn(f"Configured sample root not found: {configured}")

    default_root = DEFAULT_SAMPLES_ROOTS.get(
        template_type, Path(__file__).parent / "assets/references/samples/light"
    )
    if default_root.exists():
        return default_root.resolve()

    if default_root.is_symlink():
        warn(f"Default sample root symlink is broken: {default_root}")

    discovered = discover_sample_root(template_type)
    if discovered:
        warn(f"Using discovered sample root: {discovered}")
        return discovered

    return default_root.resolve(strict=False)


def get_template_zips(template_type: str) -> Dict[str, Dict[str, str]]:
    return TEMPLATE_ZIPS_BY_TYPE.get(template_type, TEMPLATE_ZIPS_BY_TYPE["light-ui"])


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
    if resolved.exists():
        return resolved
    if base and not Path(sp).is_absolute():
        fallback = base.parent / "素材包" / sp
        if fallback.exists():
            return fallback
    return None


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


def replace_text_in_tree(root: Path, replacements: List[Tuple[str, str]]) -> int:
    """Replace plain-text occurrences in UTF-8 decodable files under a directory."""
    changed = 0
    for path in sorted(root.rglob("*")):
        if not path.is_file():
            continue
        try:
            content = path.read_text(encoding="utf-8")
        except Exception:
            continue
        updated = content
        for old, new in replacements:
            updated = updated.replace(old, new)
        if updated != content:
            path.write_text(updated, encoding="utf-8")
            changed += 1
    return changed


def rename_tree_entries(root: Path, replacements: List[Tuple[str, str]]) -> None:
    """Rename files and directories when their names contain replacement tokens."""
    paths = sorted(root.rglob("*"), key=lambda item: len(item.parts), reverse=True)
    for path in paths:
        renamed = path.name
        for old, new in replacements:
            renamed = renamed.replace(old, new)
        if renamed != path.name:
            path.rename(path.with_name(renamed))


def build_mk_theme_slug(template_name: str, name_en: str) -> str:
    slug = normalize_name_en(name_en) or "project"
    if template_name.startswith("mk-festival-"):
        return f"mk-festival-{slug}"
    return f"mk-{slug}"


def build_mk_login_slug(template_name: str, name_en: str) -> str:
    slug = normalize_name_en(name_en) or "project"
    match = re.match(r"^(login\d+-festival-).+$", template_name)
    if match:
        prefix = match.group(1)
        max_slug_length = max(1, MK_LOGIN_PART_CODE_MAX_LENGTH - len(prefix))
        return f"{prefix}{slug[:max_slug_length]}"
    prefix = "login-"
    max_slug_length = max(1, MK_LOGIN_PART_CODE_MAX_LENGTH - len(prefix))
    return f"{prefix}{slug[:max_slug_length]}"


# =============================================================================
# Color Injection
# =============================================================================


def hex_to_rgb(hex_color: str) -> tuple:
    """Convert #RRGGBB to (R, G, B) tuple."""
    clean = hex_color.lstrip("#")
    if len(clean) == 3:
        clean = "".join(c * 2 for c in clean)
    return tuple(int(clean[i : i + 2], 16) for i in (0, 2, 4))


def _match_hex_style(reference: str, actual: str) -> str:
    return actual.upper() if any(c.isalpha() and c.isupper() for c in reference) else actual.lower()


def _replace_theme_variable_declarations(
    content: str,
    colors: Optional[Dict[str, str]] = None,
) -> str:
    result = content
    palette = colors or {}
    for var_name, actual in palette.items():
        if not isinstance(actual, str) or not actual.startswith("#"):
            continue
        pattern = re.compile(
            rf"(?P<prefix>(?:\$|--){re.escape(var_name)}\s*:\s*)(?P<value>#[0-9A-Fa-f]{{3,8}})"
        )

        def _replace(match: re.Match) -> str:
            styled = _match_hex_style(match.group("value"), actual)
            return f"{match.group('prefix')}{styled}"

        result = pattern.sub(_replace, result)
    return result


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
    content: str,
    theme_color: str,
    header_font: str = "#333333",
    colors: Optional[Dict[str, str]] = None,
) -> str:
    result = _replace_theme_variable_declarations(content, colors)
    replacements = build_color_replacements(theme_color)
    for hex_code in BG_VARIANTS:
        replacements[hex_code.lower()] = header_font.lower()
        replacements[hex_code.upper()] = header_font.upper()
    for legacy_hex in LEGACY_VARIABLE_COLOR_VARIANTS.get("header-font-color", []):
        replacements[legacy_hex.lower()] = header_font.lower()
        replacements[legacy_hex.upper()] = header_font.upper()
    for var_name, default_hex in DEFAULT_THEME_VARIABLES.items():
        actual = (colors or {}).get(var_name)
        if not actual:
            continue
        preferred_var = PREFERRED_RAW_COLOR_VARIABLES.get(default_hex.lower())
        if preferred_var == var_name:
            replacements[default_hex.lower()] = actual.lower()
            replacements[default_hex.upper()] = actual.upper()
        for legacy_hex in LEGACY_VARIABLE_COLOR_VARIANTS.get(var_name, []):
            replacements[legacy_hex.lower()] = actual.lower()
            replacements[legacy_hex.upper()] = actual.upper()
    placeholder_map = {}
    for index, (old, new) in enumerate(replacements.items()):
        token = f"__THEME_REPLACEMENT_{index}__"
        placeholder_map[token] = new
        result = result.replace(old, token)
    for token, new in placeholder_map.items():
        result = result.replace(token, new)
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


def replace_image_bottom_crop(src: Path, dest: Path, width: int, height: int) -> bool:
    """Crop the bottom area from an image and save it to destination."""
    if Image is None:
        warn("Pillow not installed, cannot crop image_down fallback")
        return replace_image(src, dest)
    if not src.exists():
        warn(f"Image not found: {src}, skipping")
        return False

    ensure_dir(dest.parent)
    with Image.open(src) as image:
        left = max(0, (image.width - width) // 2)
        top = max(0, image.height - height)
        cropped = image.crop((left, top, left + min(width, image.width), top + min(height, image.height)))
        cropped.save(dest)
    return True


def _resolve_light_sidebar_overlay_color(colors: Optional[Dict[str, str]] = None) -> str:
    palette = colors or {}
    return (
        palette.get("tlayout-header-bg-extend-color")
        or palette.get("portal-header-bg-extend-color")
        or "#F1F1F1"
    )


def _resolve_dark_sidebar_overlay_color(colors: Optional[Dict[str, str]] = None) -> str:
    palette = colors or {}
    return palette.get("header-font-color") or "#F1F1F1"


def replace_image_bottom_crop_with_sidebar_gradient(
    src: Path,
    dest: Path,
    width: int,
    height: int,
    template_type: str,
    colors: Optional[Dict[str, str]] = None,
) -> bool:
    """Crop the bottom area, then apply the sidebar vertical gradient overlay."""
    if Image is None or ImageDraw is None:
        warn("Pillow not installed, cannot render image_down sidebar gradient")
        return replace_image_bottom_crop(src, dest, width, height)
    if not src.exists():
        warn(f"Image not found: {src}, skipping")
        return False

    ensure_dir(dest.parent)
    with Image.open(src).convert("RGBA") as image:
        left = max(0, (image.width - width) // 2)
        top = max(0, image.height - height)
        cropped = image.crop((left, top, left + min(width, image.width), top + min(height, image.height)))

        if template_type == "dark-ui":
            overlay_hex = _resolve_dark_sidebar_overlay_color(colors)
        else:
            overlay_hex = _resolve_light_sidebar_overlay_color(colors)

        overlay_rgb = hex_to_rgb(overlay_hex)
        overlay = Image.new("RGBA", cropped.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)
        max_steps = max(cropped.height - 1, 1)
        for y in range(cropped.height):
            ratio = y / max_steps
            alpha = round((1.0 + (0.2 - 1.0) * ratio) * 255)
            draw.line([(0, y), (cropped.width, y)], fill=(*overlay_rgb, alpha))

        merged = Image.alpha_composite(cropped, overlay)
        merged.save(dest)
    return True


def _hex_to_rgb(hex_color: str) -> Tuple[int, int, int]:
    clean = str(hex_color).strip().lstrip("#")
    if len(clean) == 3:
        clean = "".join(char * 2 for char in clean)
    clean = clean[:6].ljust(6, "0")
    return tuple(int(clean[index : index + 2], 16) for index in (0, 2, 4))


def _rgb_distance(left: Tuple[int, int, int], right: Tuple[int, int, int]) -> float:
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(left, right)))


def recolor_icon_directory(
    base_dir: Path,
    relative_dirs: List[str],
    colors: Optional[Dict[str, str]] = None,
    exclude_names: Optional[List[str]] = None,
    threshold: float = 80.0,
) -> Tuple[int, int]:
    if Image is None:
        warn("Pillow not installed, skipping icon recolor step")
        return (0, 0)

    palette = colors or {}
    replacement_map = {
        "#2c615c": palette.get("primary-color", "#2C615C"),
        "#144e48": palette.get("alter-color", "#144E48"),
        "#56817d": palette.get("alter-color-hover-on", "#73CAA6"),
        "#eaf0ef": palette.get("primary-color-opacity-10", "#E9F1EB"),
        "#d5dfde": palette.get("primary-color-opacity-20", "#D3E2D8"),
        "#c0d0cf": palette.get("primary-color-opacity-30", "#BDD4C4"),
        "#fbfcf2": palette.get("portal-header-bg-extend-color", "#FBFCF2"),
        "#ffe4cf": palette.get("header-font-color", "#333333"),
        "#dcb496": palette.get("sidebar-icon-color", "#9B8FC7"),
    }
    mappings = [(_hex_to_rgb(source), _hex_to_rgb(target)) for source, target in replacement_map.items()]
    excluded = set(exclude_names or [])

    files_processed = 0
    pixels_changed = 0
    for relative_dir in relative_dirs:
        icon_dir = base_dir / relative_dir
        if not icon_dir.exists():
            continue
        for icon_path in icon_dir.rglob("*.png"):
            if icon_path.name in excluded:
                continue
            with Image.open(icon_path).convert("RGBA") as image:
                pixels = image.load()
                modified = 0
                for x in range(image.width):
                    for y in range(image.height):
                        red, green, blue, alpha = pixels[x, y]
                        if alpha == 0:
                            continue
                        for source_rgb, target_rgb in mappings:
                            if _rgb_distance((red, green, blue), source_rgb) <= threshold:
                                pixels[x, y] = (*target_rgb, alpha)
                                modified += 1
                                break
                if modified > 0:
                    image.save(icon_path, "PNG")
                    files_processed += 1
                    pixels_changed += modified
    return (files_processed, pixels_changed)


# =============================================================================
# MK Package Building
# =============================================================================


def build_mk_package(
    work_dir: Path,
    output_dir: Path,
    title: str,
    name_en: str,
    subtitle: str,
    button_text: str,
    theme_color: str,
    images: Dict[str, str],
    template_type: str,
    sample_root: Path,
    header_font: str = "#333333",
    colors: Optional[Dict[str, str]] = None,
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
    template_zips = get_template_zips(template_type)
    theme_zip = sample_root / template_zips["mk"]["theme"]
    theme_extract_dir = work_dir / "mk_theme_extract"
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

    old_theme_slug = inner_theme_dir.name
    new_theme_slug = build_mk_theme_slug(old_theme_slug, name_en)
    old_theme_package = f"@user-theme/{old_theme_slug}"
    new_theme_package = f"@user-theme/{new_theme_slug}"
    theme_display_title = f"{title}-主题"
    theme_variant_title = f"{title}主题"
    theme_variant_en = name_en or new_theme_slug

    # ---- Modify config.json ----
    config_file = inner_theme_dir / "config.json"
    if config_file.exists():
        config = load_json(config_file)
        config["name"] = new_theme_package
        walk_and_set_locale(config, "loginTitle", title)
        walk_and_set_locale(config, "loginTitleDesc", subtitle)
        walk_and_set_locale(config, "loginBtnText", button_text)
        dump_json(config_file, config)
        log(f"Updated config.json: title='{title}', btn='{button_text}'")

    theme_index = inner_theme_dir / "index.json"
    if theme_index.exists():
        index_data = load_json(theme_index)
        index_data["name"] = new_theme_package
        if isinstance(index_data.get("title"), dict):
            index_data["title"]["zh-cn"] = theme_display_title
        if isinstance(index_data.get("desc"), dict):
            index_data["desc"]["zh-cn"] = theme_display_title
        for skin in index_data.get("skins", []):
            if isinstance(skin, dict):
                skin["name"] = str(skin.get("name", "")).replace(old_theme_package, new_theme_package)
                if isinstance(skin.get("title"), dict):
                    skin["title"]["zh-cn"] = theme_variant_title
                    skin["title"]["en-us"] = theme_variant_en
        dump_json(theme_index, index_data)

    theme_meta = inner_theme_dir / "meta.json"
    if theme_meta.exists():
        meta_data = load_json(theme_meta)
        meta_data["name"] = new_theme_package
        if isinstance(meta_data.get("title"), dict):
            meta_data["title"]["zh-cn"] = theme_display_title
        if isinstance(meta_data.get("desc"), dict):
            meta_data["desc"]["zh-cn"] = title
        variants = meta_data.get("variants", {})
        if isinstance(variants, dict):
            for variant in variants.values():
                if isinstance(variant, dict):
                    variant["name"] = str(variant.get("name", "")).replace(old_theme_package, new_theme_package)
                    if isinstance(variant.get("title"), dict):
                        variant["title"]["zh-cn"] = theme_variant_title
                        variant["title"]["en-us"] = theme_variant_en
        dump_json(theme_meta, meta_data)

    # ---- Modify sample/sample.json ----
    sample_config = inner_theme_dir / "sample" / "sample.json"
    if sample_config.exists():
        sample = load_json(sample_config)
        sample["renderID"] = new_theme_package
        if sample.get("config", {}).get("render"):
            sample["config"]["render"]["loginTitle"] = title
            sample["config"]["render"]["loginTitleDesc"] = subtitle
            sample["config"]["render"]["loginBtnText"] = button_text
        dump_json(sample_config, sample)

    # ---- Inject theme color into CSS ----
    for css_name in ["style.css", "simple.css"]:
        css_file = inner_theme_dir / css_name
        if css_file.exists():
            content = read_text(css_file)
            content = inject_color_into_css(content, theme_color, header_font, colors)
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

    sample_thumb_dir = inner_theme_dir / "sample" / "thumbnail"
    if sample_thumb_dir.exists():
        mk_thumb_map = {
            "desktop.png": images.get("desktop"),
            "layout-banner": images.get("layoutBanner"),
            "fullscreen-sideheader": images.get("fullscreenSideheader"),
            "fullscreen-sidenav": images.get("fullscreenSidenav"),
            "center-sidenav": images.get("centerSidenav"),
        }
        for prefix, src_path in mk_thumb_map.items():
            if not src_path:
                continue
            src = resolve_path(src_path, config_base)
            if not src:
                continue
            for existing in sample_thumb_dir.iterdir():
                if existing.is_file() and (existing.name == prefix or existing.name.startswith(f"{prefix}.")):
                    replace_image(src, existing)
                    log(f"Replaced sample thumbnail {existing.name}")

    icon_files, icon_pixels = recolor_icon_directory(
        inner_theme_dir,
        ["static", "icon", "src/static", "src/static/icon"],
        colors,
        exclude_names=[
            "header-banner.png",
            "header-classic.png",
            "header-icon.png",
            "header-sideheader.png",
            "header-simple.png",
            "header-tabs.png",
        ],
    )
    if icon_files > 0:
        log(f"Recolored MK icons: {icon_files} files / {icon_pixels} pixels")

    theme_text_updates = replace_text_in_tree(
        inner_theme_dir,
        [
            (old_theme_package, new_theme_package),
            (old_theme_slug, new_theme_slug),
        ],
    )
    rename_tree_entries(
        inner_theme_dir,
        [
            (old_theme_slug, new_theme_slug),
        ],
    )
    if new_theme_slug != old_theme_slug:
        inner_theme_dir = inner_theme_dir.rename(inner_theme_dir.with_name(new_theme_slug))
    if theme_text_updates > 0:
        log(f"Updated MK theme package identifiers in {theme_text_updates} text files")

    # ---- Repack theme zip ----
    # MK delivery must preserve the template's outer wrapper directory so the
    # import format stays identical to the sample package.
    theme_output = output_dir / f"主题-MK-{title}.zip"
    repack_dir(theme_extract_dir, theme_output, inner_theme_dir.name)
    outputs.append(theme_output)
    success(f"MK theme package: {theme_output.name}")

    # Cleanup extract dir
    shutil.rmtree(theme_extract_dir, ignore_errors=True)

    # -------------------------------------------------------------------------
    # Login package
    # -------------------------------------------------------------------------
    login_zip = sample_root / template_zips["mk"]["login"]
    login_extract_dir = work_dir / "mk_login_extract"
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

    old_login_slug = inner_login_dir.name
    new_login_slug = build_mk_login_slug(old_login_slug, name_en)
    old_login_package = f"@user-login/{old_login_slug}"
    new_login_package = f"@user-login/{new_login_slug}"
    login_display_title = f"登录-{title}"

    # ---- Modify config.json ----
    login_config = inner_login_dir / "config.json"
    if login_config.exists():
        cfg = load_json(login_config)
        cfg["name"] = new_login_package
        walk_and_set_locale(cfg, "loginTitle", title)
        walk_and_set_locale(cfg, "loginTitleDesc", subtitle)
        walk_and_set_locale(cfg, "loginBtnText", button_text)
        dump_json(login_config, cfg)

    # ---- Modify data.json ----
    login_data = inner_login_dir / "data.json"
    if login_data.exists():
        content = read_text(login_data)
        content = content.replace(old_login_package, new_login_package)
        content = content.replace("$loginTitle$", title)
        content = content.replace("$loginBtnText$", button_text)
        write_text(login_data, content)

    login_index = inner_login_dir / "index.json"
    if login_index.exists():
        index_data = load_json(login_index)
        if isinstance(index_data, list):
            for entry in index_data:
                if isinstance(entry, dict):
                    entry["name"] = new_login_package
                    if isinstance(entry.get("title"), dict):
                        entry["title"]["zh-cn"] = login_display_title
                    if isinstance(entry.get("desc"), dict):
                        entry["desc"]["zh-cn"] = login_display_title
        dump_json(login_index, index_data)

    login_meta = inner_login_dir / "meta.json"
    if login_meta.exists():
        meta_data = load_json(login_meta)
        meta_data["name"] = new_login_package
        if isinstance(meta_data.get("title"), dict):
            meta_data["title"]["zh-cn"] = login_display_title
        if isinstance(meta_data.get("desc"), dict):
            meta_data["desc"]["zh-cn"] = login_display_title
        dump_json(login_meta, meta_data)

    # ---- Modify sample/sample.json ----
    login_sample = inner_login_dir / "sample" / "sample.json"
    if login_sample.exists():
        sample = load_json(login_sample)
        sample["renderID"] = new_login_package
        sample["composeID"] = new_login_package
        if sample.get("config", {}).get("render"):
            sample["config"]["render"]["loginTitle"] = title
            sample["config"]["render"]["loginTitleDesc"] = subtitle
            sample["config"]["render"]["loginBtnText"] = button_text
            sample["config"]["render"]["logoURL"] = (
                f"{new_login_package}/static/logo.png"
            )
            sample["config"]["render"]["backgroundURL"] = (
                f"{new_login_package}/static/background.png"
            )
            dump_json(login_sample, sample)

    # ---- Inject theme color into login CSS ----
    for css_file in login_extract_dir.rglob("*.css"):
        if "font/" in str(css_file):
            continue
        content = read_text(css_file)
        modified = inject_color_into_css(content, theme_color, colors=colors)
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
    if images.get("loginBackgroundPng"):
        src = resolve_path(images["loginBackgroundPng"], config_base)
        if src:
            replace_image(src, login_static / "background.png")
            log("Replaced login background PNG")
    if images.get("loginLogo"):
        src = resolve_path(images["loginLogo"], config_base)
        if src:
            replace_image(src, login_static / "logo.png")
            log("Replaced login logo")

    login_thumb = resolve_path(images.get("loginThumb"), config_base) if images.get("loginThumb") else None
    sample_thumb_dir = inner_login_dir / "sample" / "thumbnail"
    if sample_thumb_dir.exists() and login_thumb:
        for existing in sample_thumb_dir.iterdir():
            if existing.is_file() and not existing.name.startswith("."):
                replace_image(login_thumb, existing)
                log(f"Replaced login sample thumbnail {existing.name}")

    login_text_updates = replace_text_in_tree(
        inner_login_dir,
        [
            (old_login_package, new_login_package),
            (old_login_slug, new_login_slug),
            ("@user-login/login26-festival-spring", new_login_package),
            ("@user-login/login-test-rcj77", new_login_package),
        ],
    )
    rename_tree_entries(
        inner_login_dir,
        [
            (old_login_slug, new_login_slug),
        ],
    )
    if new_login_slug != old_login_slug:
        inner_login_dir = inner_login_dir.rename(inner_login_dir.with_name(new_login_slug))
    if login_text_updates > 0:
        log(f"Updated MK login package identifiers in {login_text_updates} text files")

    # ---- Repack login zip ----
    # MK login packages must keep the template wrapper directory unchanged.
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
    name_en: str,
    subtitle: str,
    button_text: str,
    theme_color: str,
    images: Dict[str, str],
    template_type: str,
    sample_root: Path,
    header_font: str = "#333333",
    colors: Optional[Dict[str, str]] = None,
    config_base: Optional[Path] = None,
) -> List[Path]:
    """
    Build EKP theme + login packages for a specific version.

    product_key: one of ekp_v14, ekp_v15, ekp_v16, ekp_v17
    Returns list of output zip paths.
    """
    if config_base is None:
        config_base = work_dir
    template_zips = get_template_zips(template_type)
    if product_key not in template_zips:
        error(f"Unknown EKP product: {product_key}")
        return []

    templates = template_zips[product_key]
    outputs = []

    version_label = VERSION_LABELS.get(
        product_key, product_key.replace("ekp_", "V").upper()
    )

    # -------------------------------------------------------------------------
    # EKP Theme package
    # -------------------------------------------------------------------------
    theme_zip = sample_root / templates["theme"]
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
    import datetime
    current_year = str(datetime.datetime.now().year)
    theme_id = f"ekp_theme_{version_label}_{name_en}"
    theme_name = f"ekp_theme_{version_label}_{title}"
    if theme_xml.exists():
        content = read_text(theme_xml)
        content = content.replace("$themeId$", theme_id)
        content = content.replace("$themeName$", theme_name)
        write_text(theme_xml, content)
        log(f"Updated theme.xml: themeId='{theme_id}', themeName='{theme_name}'")

    # ---- Modify ui.ini ----
    ui_ini = inner_theme_dir / "ui.ini"
    if ui_ini.exists():
        content = read_text(ui_ini)
        content = content.replace("$themeId$", theme_id)
        content = content.replace("$themeName$", theme_name)
        write_text(ui_ini, content)
        log(f"Updated ui.ini: id='{theme_id}', name='{theme_name}'")

    # ---- Inject theme color into all CSS files in style/ ----
    style_dir = inner_theme_dir / "style"
    if style_dir.exists():
        for css_file in style_dir.rglob("*.css"):
            content = read_text(css_file)
            modified = inject_color_into_css(content, theme_color, header_font, colors)
            modified = inject_color_into_rgb(modified, theme_color)
            modified = inject_header_font_color(modified, header_font)
            write_text(css_file, modified)
        log(f"Injected color {theme_color} into style/*.css")

    scss_dir = inner_theme_dir / "scss"
    if scss_dir.exists():
        for scss_file in scss_dir.rglob("*.scss"):
            content = read_text(scss_file)
            modified = inject_color_into_css(content, theme_color, header_font, colors)
            modified = inject_header_font_color(modified, header_font)
            write_text(scss_file, modified)
        log(f"Injected color {theme_color} into scss/*.scss")

    # ---- Replace thumb.jpg (thumbnail) ----
    thumb = inner_theme_dir / "thumb.jpg"
    thumb_src = resolve_path(images.get("themeThumb"), config_base) if images.get("themeThumb") else None
    if not thumb_src and images.get("desktop"):
        thumb_src = resolve_path(images["desktop"], config_base)
    if thumb_src:
        replace_image(thumb_src, thumb)
        log("Replaced thumb.jpg")

    image_style_dir = inner_theme_dir / "images" / "image-style"
    if image_style_dir.exists():
        ekl_image_map = {
            "header_tlayout_frame_bg.png": images.get("headerSimple"),
            "header_complex_frame_bg.png": images.get("headerClassic"),
            "header_simple_frame_bg.png": images.get("headerSimpleFrame", images.get("headerSimple")),
            "header_menu_frame_bg.png": images.get("headerMenu"),
            "header_zone_frame_bg.png": images.get("headerTabs"),
            "header_zone_nav_frame_bg.png": images.get("headerIcon", images.get("headerTabs")),
            "header_single_menu_frame_bg.png": images.get("headerSingleMenuFrameBg", images.get("headerSideheader")),
            "header-banner.png": images.get("headerBanner"),
            "header-sideheader.png": images.get("headerSideheader"),
            "image_down.png": images.get("imageDown", images.get("headerSideheader")),
            "banner_personal.png": images.get("bannerPersonal", images.get("layoutBanner")),
            "study_banner.png": images.get("studyBanner", images.get("layoutBanner")),
        }
        for filename, src_path in ekl_image_map.items():
            if src_path:
                src = resolve_path(src_path, config_base)
                if src:
                    dest = image_style_dir / filename
                    if dest.parent.exists():
                        if filename == "image_down.png" and not images.get("imageDown"):
                            replace_image_bottom_crop_with_sidebar_gradient(
                                src,
                                dest,
                                width=200,
                                height=488,
                                template_type=template_type,
                                colors=colors,
                            )
                        else:
                            shutil.copy2(src, dest)
                        log(f"Replaced {filename}")

    icon_files, icon_pixels = recolor_icon_directory(
        inner_theme_dir,
        [
            "icon",
            "images/icon-primary",
            "images/icon-multi-sprite",
            "images/icons",
            "images/icon-multi",
            "images/panel",
        ],
        colors,
    )
    if icon_files > 0:
        log(f"Recolored EKP {version_label} theme icons: {icon_files} files / {icon_pixels} pixels")

    # ---- Repack theme zip (flat: files at zip root, no wrapper folder) ----
    theme_output = output_dir / f"主题-{version_label}-{title}.zip"
    repack_dir(inner_theme_dir, theme_output, inner_name=None)
    outputs.append(theme_output)
    success(f"EKP {version_label} theme package: {theme_output.name}")

    shutil.rmtree(theme_extract_dir, ignore_errors=True)

    # -------------------------------------------------------------------------
    # EKP Login package
    # -------------------------------------------------------------------------
    login_zip = sample_root / templates["login"]
    login_extract_dir = work_dir / f"ekp_login_{version_label}_extract"

    log(f"Unzipping EKP {version_label} login: {login_zip}")
    if not login_zip.exists():
        error(f"EKP login template not found: {login_zip}")
        return outputs

    shutil.unpack_archive(login_zip, login_extract_dir)

    inner_login_dir = find_first_subdir(login_extract_dir)
    repack_login_dir = login_extract_dir

    # ---- Modify config.ini ----
    config_ini = inner_login_dir / "config.ini"
    # login_id = f"ekp_login_{version_label}_{current_year}_{name_en}"
    login_id = f"login_{version_label}_{name_en}"
    login_name = f"ekp_login_{version_label}_{title}"
    if config_ini.exists():
        content = read_text(config_ini)
        content = content.replace("$loginId$", login_id)
        content = content.replace("$loginName$", login_name)
        write_text(config_ini, content)
        log(f"Updated config.ini: id='{login_id}', name='{login_name}'")

    # ---- Modify login.jsp ----
    login_jsp = inner_login_dir / "login.jsp"
    if login_jsp.exists():
        content = read_text(login_jsp)
        content = content.replace("$loginId$", login_id)
        write_text(login_jsp, content)
        log(f"Updated login.jsp: loginId='{login_id}'") 

    for css_file in login_extract_dir.rglob("*.css"):
        if "font/" in str(css_file):
            continue
        content = read_text(css_file)
        modified = inject_color_into_css(content, theme_color, header_font, colors)
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

            # Replace bg_login_iframe.png when the template contains iframe backgrounds
            for iframe_loc in ["images/bg_login_iframe.png"]:
                iframe_dest = login_static / iframe_loc
                if iframe_dest.exists():
                    replace_image(src, iframe_dest)
                    log("Replaced bg_login_iframe.png")

            login_thumb_src = resolve_path(images.get("loginThumb"), config_base) if images.get("loginThumb") else None
            if login_thumb_src:
                for thumb_loc in ["login_thumb.jpg"]:
                    thumb_dest = login_static / thumb_loc
                    if thumb_dest.parent.exists():
                        replace_image(login_thumb_src, thumb_dest)
                        log("Replaced login_thumb.jpg")
                        break

            login_thumb_variants = {
                "thumb-1.jpg": resolve_path(images.get("loginThumb1"), config_base) if images.get("loginThumb1") else None,
                "thumb-2.jpg": resolve_path(images.get("loginThumb2"), config_base) if images.get("loginThumb2") else None,
            }
            for thumb_name, thumb_src in login_thumb_variants.items():
                if thumb_src:
                    thumb_dest = login_static / "login_bg" / thumb_name
                    if thumb_dest.parent.exists():
                        replace_image(thumb_src, thumb_dest)
                        log(f"Replaced login_bg/{thumb_name}")

    icon_files, icon_pixels = recolor_icon_directory(
        inner_login_dir,
        ["images", "icon", "login_bg"],
        colors,
    )
    if icon_files > 0:
        log(f"Recolored EKP {version_label} login icons: {icon_files} files / {icon_pixels} pixels")

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
        if inner_name:
            readme_arcname = str(Path(inner_name) / PACKAGE_README_NAME)
        else:
            readme_arcname = PACKAGE_README_NAME
        zf.writestr(readme_arcname, PACKAGE_README_CONTENT)


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


def clamp_package_title(value: str) -> str:
    title = (value or "").strip()
    if not title:
        return "未命名主题"
    return "".join(list(title)[:MAX_PACKAGE_TITLE_LENGTH])


def build_all(config_path: Path, output_dir: Path):
    cfg = load_config(config_path)

    title = clamp_package_title(cfg.get("title", "未命名主题"))
    cfg["title"] = title
    name_en = normalize_name_en(cfg.get("nameEn")) or derive_name_en_from_text(title)
    cfg["nameEn"] = name_en
    subtitle = cfg.get("subtitle", "") or title
    button_text = cfg.get("buttonText", "立即进入")
    theme_color = cfg.get("themeColor", "#144e48")
    header_font = cfg.get("headerFont", "#333333")
    colors = cfg.get("colors", {})
    images = cfg.get("images", {})
    products = cfg.get("products", ["mk"])
    template_type = cfg.get("templateType", "light-ui")
    sample_root = resolve_samples_root(template_type, cfg.get("sampleRoot"))
    config_base = config_path.parent.resolve()

    log(f"Resolved theme nameEn: {name_en}")

    if not sample_root.exists():
        error(f"Sample root not found: {sample_root}")
        return []

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
                name_en=name_en,
                subtitle=subtitle,
                button_text=button_text,
                theme_color=theme_color,
                images=images,
                template_type=template_type,
                sample_root=sample_root,
                header_font=header_font,
                colors=colors,
                config_base=config_base,
            )
            all_outputs.extend(outs)

        elif product.startswith("ekp_"):
            outs = build_ekp_package(
                product_key=product,
                work_dir=work_base / product,
                output_dir=output_dir,
                title=title,
                name_en=name_en,
                subtitle=subtitle,
                button_text=button_text,
                theme_color=theme_color,
                images=images,
                template_type=template_type,
                sample_root=sample_root,
                header_font=header_font,
                colors=colors,
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

    outputs = build_all(config_path, output_dir)
    if not outputs:
        sys.exit(1)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
