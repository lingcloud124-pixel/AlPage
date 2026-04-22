#!/usr/bin/env python3
"""Color scheme validation against Dark-UI and Light-UI rules."""

import json
import sys
from pathlib import Path
from colorsys import rgb_to_hls
from typing import Dict, List, Optional, Any, Tuple

ROOT = Path(__file__).parent.parent
COLORS_DIR = ROOT / "colors"

FIELD_ALIASES = {
    "primary": ["primary", "primary-color"],
    "primaryHover": ["primaryHover", "primary-color-hover"],
    "alterColor": ["alterColor", "alter-color"],
    "alterColorHoverOn": ["alterColorHoverOn", "alter-color-hover-on"],
    "headerFont": ["headerFont", "headerFontColor", "header-font-color"],
    "sidebarPanelBg": ["sidebarPanelBg", "sidebar-panel-bg"],
    "loginBg": ["loginBg", "loginBgColor", "login-bg-color"],
    "primaryOpacity10": ["primaryOpacity10", "primary-color-opacity-10"],
    "primaryOpacity20": ["primaryOpacity20", "primary-color-opacity-20"],
    "primaryOpacity30": ["primaryOpacity30", "primary-color-opacity-30"],
}


def resolve_colors(data: Dict) -> Dict:
    """Extract canonical color dict from {colors: {...}} or top-level fields."""
    if "colors" in data and isinstance(data["colors"], dict):
        return data["colors"]
    return data


def resolve_field(colors: Dict, field_alias: str) -> Optional[str]:
    """Get color value by checking all known aliases (kebab-case/camelCase)."""
    for alias in FIELD_ALIASES.get(field_alias, [field_alias]):
        if alias in colors:
            val = colors[alias]
            if val and isinstance(val, str) and val.startswith("#"):
                return val
    return None


def hex_to_hls(hex_color: str) -> Tuple[float, float, float]:
    hex_color = hex_color.lstrip("#")
    r = int(hex_color[0:2], 16) / 255.0
    g = int(hex_color[2:4], 16) / 255.0
    b = int(hex_color[4:6], 16) / 255.0
    h, l, s = rgb_to_hls(r, g, b)
    return (h * 360, l * 100, s * 100)


def validate_dark_ui(colors: Dict, nameEn: str) -> List[Dict]:
    issues = []

    primary = resolve_field(colors, "primary")
    primaryHover = resolve_field(colors, "primaryHover")

    if not primary:
        issues.append(
            {"field": "primary", "rule": "缺少 primary 色值", "severity": "error"}
        )
    if not primaryHover:
        issues.append(
            {
                "field": "primaryHover",
                "rule": "缺少 primaryHover 色值",
                "severity": "error",
            }
        )

    if not primary or not primaryHover:
        return issues

    p_h, p_l, p_s = hex_to_hls(primary)
    ph_h, ph_l, ph_s = hex_to_hls(primaryHover)

    hue_diff = (ph_h - p_h + 360) % 360
    if abs(hue_diff - 26) > 5:
        issues.append(
            {
                "field": "primaryHover",
                "rule": f"Hue 偏移量 {hue_diff:.1f}° 不符合 Dark-UI +26° 规则（允许 ±5° 误差）",
                "severity": "error",
                "current": f"{primaryHover} (H={ph_h:.1f}°)",
                "expected": f"H ≈ {(p_h + 26) % 360:.1f}° → L≈85%",
            }
        )

    if ph_l < 80:
        issues.append(
            {
                "field": "primaryHover",
                "rule": f"primaryHover 亮度过低 ({ph_l:.0f}%)，Dark-UI 要求 L≈85%（极浅色）",
                "severity": "error",
                "current": f"{primaryHover} (L={ph_l:.0f}%)",
            }
        )

    headerFont = resolve_field(colors, "headerFont")
    if headerFont:
        hf_h, hf_l, hf_s = hex_to_hls(headerFont)
        header_hue_diff = (hf_h - p_h + 360) % 360
        if abs(header_hue_diff - 22) > 5:
            issues.append(
                {
                    "field": "headerFont",
                    "rule": f"headerFont Hue 偏移量 {header_hue_diff:.1f}° 不符合 +22° 规则（允许 ±5° 误差）",
                    "severity": "error",
                    "current": f"{headerFont} (H={hf_h:.1f}°)",
                    "expected": f"H ≈ {(p_h + 22) % 360:.1f}° → L≈90%",
                }
            )
        if hf_l < 70:
            issues.append(
                {
                    "field": "headerFont",
                    "rule": f"headerFont 亮度过低 ({hf_l:.0f}%)，Dark-UI 要求 L≈90%（浅色文字）",
                    "severity": "error",
                    "current": f"{headerFont} (L={hf_l:.0f}%)",
                }
            )
    else:
        issues.append(
            {
                "field": "headerFont",
                "rule": "缺少 headerFont/headerFontColor 色值",
                "severity": "error",
            }
        )

    sidebarPanelBg = resolve_field(colors, "sidebarPanelBg")
    if sidebarPanelBg and headerFont:
        if sidebarPanelBg.upper() != headerFont.upper():
            issues.append(
                {
                    "field": "sidebarPanelBg",
                    "rule": "sidebarPanelBg 必须等于 headerFont",
                    "severity": "error",
                    "current": f"sidebarPanelBg={sidebarPanelBg}, headerFont={headerFont}",
                }
            )
    elif not sidebarPanelBg:
        issues.append(
            {
                "field": "sidebarPanelBg",
                "rule": "缺少 sidebarPanelBg 色值",
                "severity": "error",
            }
        )

    loginBg = resolve_field(colors, "loginBg")
    if not loginBg:
        issues.append(
            {
                "field": "loginBg",
                "rule": "缺少 loginBg/loginBgColor 色值",
                "severity": "error",
            }
        )

    alterColor = resolve_field(colors, "alterColor")
    if alterColor:
        ac_h, ac_l, ac_s = hex_to_hls(alterColor)
        if ac_l > p_l:
            issues.append(
                {
                    "field": "alterColor",
                    "rule": f"alterColor ({ac_l:.0f}%) 不应比 primary ({p_l:.0f}%) 亮",
                    "severity": "warning",
                    "current": f"{alterColor} (L={ac_l:.0f}%)",
                }
            )

    alterColorHoverOn = resolve_field(colors, "alterColorHoverOn")
    if alterColorHoverOn and ph_l > 0:
        aco_h, aco_l, aco_s = hex_to_hls(alterColorHoverOn)
        if aco_l > ph_l:
            issues.append(
                {
                    "field": "alterColorHoverOn",
                    "rule": f"alterColorHoverOn ({aco_l:.0f}%) 不应比 primaryHover ({ph_l:.0f}%) 亮",
                    "severity": "warning",
                    "current": f"{alterColorHoverOn} (L={aco_l:.0f}%)",
                }
            )

    return issues


def validate_light_ui(colors: Dict, nameEn: str) -> List[Dict]:
    issues = []

    primary = resolve_field(colors, "primary")
    primaryHover = resolve_field(colors, "primaryHover")

    if not primary or not primaryHover:
        for f in ["primary", "primaryHover"]:
            if not resolve_field(colors, f):
                issues.append(
                    {"field": f, "rule": f"缺少 {f} 色值", "severity": "error"}
                )
        return issues

    p_h, p_l, p_s = hex_to_hls(primary)
    ph_h, ph_l, ph_s = hex_to_hls(primaryHover)

    if p_l < 35 or p_l > 70:
        issues.append(
            {
                "field": "primary",
                "rule": f"primary 亮度 {p_l:.0f}% 不在推荐范围 35-70%",
                "severity": "warning",
                "current": f"{primary} (L={p_l:.0f}%)",
            }
        )

    if ph_l <= p_l:
        issues.append(
            {
                "field": "primaryHover",
                "rule": f"primaryHover ({ph_l:.0f}%) 应比 primary ({p_l:.0f}%) 浅",
                "severity": "error",
                "current": f"primary={p_l:.0f}%, primaryHover={ph_l:.0f}%",
            }
        )

    return issues


def fix_interstellar() -> Dict:
    primary = "#1A2845"
    primaryHover = "#BAB2FF"
    headerFont = "#CDCCFE"
    return {
        "name": "星际探索，我的征途是星辰大海",
        "nameEn": "interstellar",
        "templateType": "dark-ui",
        "description": "星际探索主题，深邃宇宙蓝紫色调，星光点，科幻感与探索精神，浩瀚星空围",
        "colors": {
            "primary": primary,
            "primaryHover": primaryHover,
            "alterColor": "#101B32",
            "alterColorHoverOn": "#A095E0",
            "headerFont": headerFont,
            "sidebarIconColor": "#B8A9F0",
            "sidebarPanelBg": headerFont,
            "loginBg": "#101B32",
            "primaryOpacity10": "#1F222A",
            "primaryOpacity20": "#272E3B",
            "primaryOpacity30": "#2E394D",
        },
        "gradient": {"start": primary, "end": primaryHover},
        "backgroundImage": {
            "prompt": "A breathtaking deep space scene, vast cosmic ocean with shimmering stars across indigo and deep blue nebula, modern tech aesthetic, clean composition, no text, no interface elements"
        },
        "hueCalculation": {
            "backgroundHue": 220,
            "primary": 220,
            "primaryHover": 246,
            "headerFont": 242,
            "note": "主题色调偏移计算：primaryHover = H+26° (L≈85%), headerFont = H+22° (L≈90%)",
        },
    }


def fix_national_day() -> Dict:
    primary = "#A60905"
    primaryHover = "#FFD3B2"
    headerFont = "#FEDECC"
    return {
        "name": "国庆节",
        "nameEn": "national-day",
        "templateType": "dark-ui",
        "description": "国庆节主题，深红色系，庄重喜庆，适合国庆节爱国氛围，现代科技感表现",
        "colors": {
            "primary": primary,
            "primaryHover": primaryHover,
            "alterColor": "#8A0A05",
            "alterColorHoverOn": "#E8A090",
            "primaryOpacity10": "#FFEBE8",
            "primaryOpacity20": "#FFD6D0",
            "primaryOpacity30": "#FFC2B8",
            "headerFont": headerFont,
            "sidebarPanelBg": headerFont,
            "loginBg": "#8A0A05",
            "sidebarColor": "#333333",
            "sidebarIconColor": headerFont,
            "auxiliaryGray": "#999999",
            "auxiliaryGrayDark": "#666666",
            "borderColor": "#EEEEEE",
            "borderIconColor": "#EEEEEE",
        },
        "gradient": {"start": primary, "end": primaryHover},
        "backgroundImage": {
            "prompt": "Modern technology background with deep red accents, abstract geometric patterns suggesting Chinese architectural elements in minimalist style, digital data network overlay, golden highlights on dark navy base, clean corporate tech aesthetic, no text, no interface elements"
        },
        "hueCalculation": {
            "backgroundHue": 0,
            "primary": 0,
            "primaryHover": 26,
            "headerFont": 22,
            "note": "主题色调偏移计算：primaryHover = H+26° (L≈85%), headerFont = H+22° (L≈90%)",
        },
    }


def fix_national_day_dark() -> Dict:
    return fix_national_day()


def fix_overtime_worker() -> Dict:
    primary = "#1A1A2E"
    primaryHover = "#D3B2FF"
    headerFont = "#DECCFE"
    alterColor = "#141422"
    return {
        "name": "深夜加班的打工人",
        "nameEn": "overtime-worker",
        "templateType": "dark-ui",
        "description": "深夜加班主题，深蓝夜色配暖橙灯光，传达夜晚奋斗依然积极向上的正能量，现代科技感",
        "colors": {
            "primary": primary,
            "primaryHover": primaryHover,
            "alterColor": alterColor,
            "alterColorHoverOn": "#C4A0E0",
            "primaryOpacity10": "#222238",
            "primaryOpacity20": "#2A2A42",
            "primaryOpacity30": "#32324C",
            "headerFont": headerFont,
            "sidebarPanelBg": headerFont,
            "loginBg": alterColor,
            "sidebarColor": "#333333",
            "sidebarIconColor": primaryHover,
            "auxiliaryGray": "#999999",
            "auxiliaryGrayDark": "#666666",
            "bodyBgColor": "#F8F8F8",
            "hoverBgColor": "#F8F8F8",
            "loginBgColor": alterColor,
            "borderColor": "#EEEEEE",
            "borderIconColor": "#EEEEEE",
        },
        "gradient": {"start": primary, "end": primaryHover},
        "backgroundImage": {
            "prompt": "Modern night city skyline with abstract geometric buildings, deep navy blue gradient sky, warm orange window lights forming a subtle network pattern, digital data streams flowing between skyscrapers, minimalist tech atmosphere, no text, no interface elements, clean composition"
        },
        "hueCalculation": {
            "backgroundHue": 240,
            "primary": 240,
            "primaryHover": 266,
            "headerFont": 262,
            "note": "主题色调偏移计算：primary = 深蓝(240°), primaryHover = H+26°→L≈85%, headerFont = H+22°→L≈90%",
        },
    }


def fix_panda_night() -> Dict:
    primary = "#4A3F6B"
    primaryHover = "#E6B2FF"
    headerFont = "#EBCCFE"
    return {
        "name": "熊猫咪咪晚上睡觉看星星",
        "nameEn": "panda-night",
        "description": "深夜星空下，可爱熊猫咪咪睡觉看星星的温馨场景。深紫蓝夜空配淡紫星光，营造梦幻童趣氛围，现代科技风格表现。",
        "templateType": "dark-ui",
        "colors": {
            "primary": primary,
            "primaryHover": primaryHover,
            "alterColor": "#3A2F5B",
            "alterColorHoverOn": "#C4A0E0",
            "primaryOpacity10": "#4A3F6B1A",
            "primaryOpacity20": "#4A3F6B33",
            "primaryOpacity30": "#4A3F6B4D",
            "headerFont": headerFont,
            "sidebarIconColor": "#C8B8F0",
            "sidebarPanelBg": headerFont,
            "loginBg": "#3A2F5B",
        },
        "gradient": {"start": primary, "end": primaryHover},
        "backgroundImage": {
            "prompt": "Dreamy night sky with deep purple and indigo gradient, abstract geometric constellation lines connecting soft glowing star nodes, minimal low-poly network pattern suggesting stars and space, no text, no interface elements, no recognizable objects, modern tech aesthetic"
        },
        "hueCalculation": {
            "backgroundHue": 255,
            "primary": 255,
            "primaryHover": 281,
            "headerFont": 277,
            "note": "主题色调偏移计算：primaryHover = H+26° (L≈85%), headerFont = H+22° (L≈90%)",
        },
    }


def fix_cherry_blossom() -> Dict:
    return {
        "name": "武汉的樱花开了",
        "nameEn": "cherry-blossom",
        "templateType": "light-ui",
        "description": "武汉樱花园艺展，淡粉色樱花配色，樱花季节氛围，樱花飞舞，粉白相间",
        "colors": {
            "primary": "#C55266",
            "primaryHover": "#E8A0B0",
            "alterColor": "#9E3E52",
            "alterColorHoverOn": "#E8C0D0",
            "primaryOpacity10": "#FDF1F3",
            "primaryOpacity20": "#FAE0E5",
            "primaryOpacity30": "#D0C3D5",
            "headerFont": "#333333",
            "sidebarIconColor": "#333333",
            "sidebarPanelBg": "#F8F8F8",
            "loginBg": "#FDF6FF",
        },
        "gradient": {"start": "#C55266", "end": "#C55266"},
        "backgroundImage": {
            "prompt": "Soft light pink cherry blossom petals abstract pattern, minimal geometric shapes inspired by sakura flowers, clean white and blush pink gradient, modern fresh atmosphere, no text, no interface elements"
        },
    }


def fix_basketball_match() -> Dict:
    primary = "#F07828"
    primaryHover = "#FAB088"
    return {
        "name": "篮球对抗赛，热血青春燃起来",
        "nameEn": "basketball-match",
        "templateType": "light-ui",
        "description": "篮球赛事主题，活力橙色系，运动竞技氛围",
        "colors": {
            "primary": primary,
            "primaryHover": primaryHover,
            "alterColor": "#C86020",
            "alterColorHoverOn": "#FDC8A8",
            "primaryOpacity10": "#FDF1E9",
            "primaryOpacity20": "#FCE4D4",
            "primaryOpacity30": "#FAD6BE",
            "headerFont": "#333333",
            "sidebarPanelBg": "#F9F6F5",
            "loginBg": "#FCE4D4",
        },
        "gradient": {"start": primary, "end": primaryHover},
        "backgroundImage": {
            "prompt": "Abstract energetic orange and basketball-themed geometric patterns, dynamic angular shapes suggesting motion and energy, clean modern sports technology aesthetic, warm orange gradient background, no text, no interface elements"
        },
    }


def fix_football_match() -> Dict:
    primary = "#8DD22C"
    primaryHover = "#C4E890"
    return {
        "name": "足球对抗赛，绿茵场上展雄风",
        "nameEn": "football-match",
        "templateType": "light-ui",
        "description": "足球赛事主题，活力绿色系，运动竞技氛围",
        "colors": {
            "primary": primary,
            "primaryHover": primaryHover,
            "alterColor": "#71A828",
            "alterColorHoverOn": "#D8F0B8",
            "primaryOpacity10": "#F3FAE9",
            "primaryOpacity20": "#E8F6D4",
            "primaryOpacity30": "#DCF1BF",
            "headerFont": "#333333",
            "sidebarPanelBg": "#F9FCF4",
            "loginBg": "#EDF8DF",
        },
        "gradient": {"start": primary, "end": "#A7D288"},
        "backgroundImage": {
            "prompt": "Abstract green technology grid patterns, subtle hexagonal field markings suggesting soccer field, modern sports digital aesthetic, clean geometric lines on bright white and light green base, no text, no interface elements"
        },
    }


def fix_national_day_generated() -> Dict:
    return fix_national_day()


def fix_shenergy_enterprise() -> Dict:
    primary = "#226F3B"
    primaryHover = "#B2FFE6"
    headerFont = "#CCFEEB"
    return {
        "name": "申能企业",
        "nameEn": "shenergy-enterprise",
        "templateType": "dark-ui",
        "description": "申能企业Dark-UI主题，深绿+科技配色，营造高效、有序、富有科技感的数智办公空间",
        "colors": {
            "primary": primary,
            "primaryHover": primaryHover,
            "alterColor": "#1A5530",
            "alterColorHoverOn": "#73CAA6",
            "primaryOpacity10": "#E9F1EB",
            "primaryOpacity20": "#D3E2D8",
            "primaryOpacity30": "#BDD4C4",
            "headerFont": headerFont,
            "sidebarPanelBg": headerFont,
            "sidebarColor": "#333333",
            "sidebarIconColor": headerFont,
            "loginBg": "#1A5530",
            "auxiliaryGray": "#999999",
            "auxiliaryGrayDark": "#666666",
            "bodyBgColor": "#F8F8F8",
            "borderColor": "#EEEEEE",
            "borderIconColor": "#EEEEEE",
        },
        "gradient": {"start": primary, "end": primaryHover},
        "backgroundImage": {
            "prompt": "Abstract technology background with deep green geometric patterns, subtle grid lines and data flow effects, digital enterprise workspace atmosphere, clean modern design without text or interface elements"
        },
        "hueCalculation": {
            "backgroundHue": 135,
            "primary": 135,
            "primaryHover": 161,
            "headerFont": 157,
            "note": "主题色调偏移计算：primaryHover = H+26° (L≈85%), headerFont = H+22° (L≈90%)",
        },
    }


def fix_dark_ui_spring() -> Dict:
    primary = "#A7160B"
    primaryHover = "#FFD3B2"
    headerFont = "#FEDECC"
    return {
        "name": "春节（Dark-UI）",
        "nameEn": "dark-ui-spring",
        "templateType": "dark-ui",
        "description": "Dark-UI 春节主题，深红色系，金橙辅助，适合深色背景主题",
        "colors": {
            "primary": primary,
            "primaryHover": primaryHover,
            "alterColor": "#8A1209",
            "alterColorHoverOn": "#E6A87A",
            "primaryOpacity10": "#F7E8E6",
            "primaryOpacity20": "#EFD2CF",
            "primaryOpacity30": "#E7BCB8",
            "headerFont": headerFont,
            "portalHeaderBgExtendColor": primary,
            "portalHeaderPureExtendColor": primary,
            "sidebarColor": "#333333",
            "sidebarIconColor": headerFont,
            "sidebarIconColorHover": "#FFFFFF",
            "sidebarPanelBg": headerFont,
            "loginBgColor": "#8A1209",
            "auxiliaryGray": "#999999",
            "auxiliaryGrayDark": "#666666",
            "bodyBgColor": "#F8F8F8",
            "borderColor": "#EEEEEE",
            "borderIconColor": "#EEEEEE",
        },
        "gradient": {"start": primary, "end": primaryHover},
        "backgroundImage": {
            "prompt": "Deep red Chinese New Year atmosphere, elegant lantern glow on dark background, subtle golden sparkles, traditional festive mood without text or elements, 1920x1080",
            "style": "Dark background traditional Chinese New Year, warm red and gold tones, elegant and modern",
        },
        "hueCalculation": {
            "backgroundHue": 0,
            "primary": 0,
            "primaryHover": 26,
            "headerFont": 22,
            "note": "主题色调偏移计算：primaryHover = H+26° (L≈85%), headerFont = H+22° (L≈90%)",
        },
    }


FIXES = {
    "interstellar": fix_interstellar,
    "national-day": fix_national_day,
    "national-day-dark": fix_national_day_dark,
    "overtime-worker": fix_overtime_worker,
    "panda-night": fix_panda_night,
    "cherry-blossom": fix_cherry_blossom,
    "basketball-match": fix_basketball_match,
    "football-match": fix_football_match,
    "national-day-generated": fix_national_day_generated,
    "shenergy-enterprise": fix_shenergy_enterprise,
    "dark-ui-spring": fix_dark_ui_spring,
}


def main():
    print("=" * 60)
    print("📊 Color Scheme Validation Report")
    print("=" * 60)

    json_files = sorted(COLORS_DIR.glob("*.json"))

    total_issues = 0
    error_count = 0
    warning_count = 0
    files_checked = 0

    for json_file in json_files:
        nameEn = json_file.stem
        try:
            with open(json_file) as f:
                data = json.load(f)
        except json.JSONDecodeError:
            print(f"\n❌ {json_file.name}: Invalid JSON")
            continue

        if "templateType" not in data:
            print(f"\n⚠️ {json_file.name} ({nameEn}): Missing templateType, skipping")
            continue

        template_type = data["templateType"]
        colors = resolve_colors(data)

        if template_type == "dark-ui":
            issues = validate_dark_ui(colors, nameEn)
        elif template_type == "light-ui":
            issues = validate_light_ui(colors, nameEn)
        else:
            print(f"\n⚠️ {json_file.name}: Unknown templateType '{template_type}'")
            continue

        if issues:
            severity_icon = {"error": "❌", "warning": "⚠️"}
            for issue in issues:
                severity = issue.get("severity", "error")
                if severity == "error":
                    error_count += 1
                else:
                    warning_count += 1
                total_issues += 1
                print(
                    f"\n{severity_icon.get(severity, '❓')} {json_file.name} ({nameEn})"
                )
                print(f"   Field: {issue['field']}")
                print(f"   Rule: {issue['rule']}")
                if "current" in issue:
                    print(f"   Current: {issue['current']}")
                if "expected" in issue:
                    print(f"   Expected: {issue['expected']}")
        else:
            print(f"\n✅ {json_file.name} ({nameEn}): All checks passed")

        files_checked += 1

    print("\n" + "=" * 60)
    print(f"📈 Summary")
    print(f"   Files checked: {files_checked}")
    print(f"   Total issues: {total_issues}")
    print(f"   Errors: {error_count}")
    print(f"   Warnings: {warning_count}")
    if error_count == 0 and warning_count == 0:
        print("   🎉 All color schemes compliant!")
    print("=" * 60)

    return error_count == 0


def apply_fixes():
    """Apply all pending color fixes."""
    fixed = []
    for nameEn, fix_func in FIXES.items():
        filepath = COLORS_DIR / f"{nameEn}.json"
        if filepath.exists():
            print(f"\n🔧 Fixing {nameEn}.json...")
            new_data = fix_func()
            with open(filepath, "w") as f:
                json.dump(new_data, f, indent=2, ensure_ascii=False)
            print(f"   ✅ Fixed {nameEn}.json")
            fixed.append(nameEn)

    print(f"\n📦 Applied fixes to {len(fixed)} files: {', '.join(fixed)}")
    return fixed


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--fix":
        apply_fixes()
        print("\nRun without --fix to verify results.")
    else:
        success = main()
        print(f"\nTip: Run 'python3 {__file__} --fix' to apply automatic fixes.")
        sys.exit(0 if success else 1)
