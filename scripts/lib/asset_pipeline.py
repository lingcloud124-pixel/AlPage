from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any, Dict, List, Tuple
from urllib.parse import unquote, urlparse
from urllib.request import Request, urlopen

try:
    from PIL import Image, ImageColor, ImageDraw
except ImportError as exc:
    raise SystemExit(
        "Pillow is required for export asset preparation. Install it with: python3 -m pip install pillow"
    ) from exc


def _load_json(path: Path) -> Dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def _ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def _normalize_color(value: str, fallback: str) -> Tuple[int, int, int]:
    raw = (value or fallback or "#000000").strip()
    if not raw:
        raw = fallback
    return ImageColor.getrgb(raw)


def _download_remote_image(source: str, output_dir: Path) -> Path:
    parsed = urlparse(source)
    suffix = Path(unquote(parsed.path)).suffix or ".png"
    cache_dir = output_dir / ".cache"
    _ensure_dir(cache_dir)

    digest = hashlib.sha1(source.encode("utf-8")).hexdigest()[:16]
    cached_path = cache_dir / f"background-{digest}{suffix}"
    if cached_path.exists() and cached_path.stat().st_size > 0:
        return cached_path

    request = Request(source, headers={"User-Agent": "ThemeStudioAssetPipeline/1.0"})
    with urlopen(request, timeout=30) as response:
        payload = response.read()
    if not payload:
        raise ValueError(f"Downloaded background image is empty: {source}")

    cached_path.write_bytes(payload)
    return cached_path


def _resolve_source_image(snapshot: Dict[str, Any], project_root: Path, output_dir: Path) -> Path:
    source = (
        snapshot.get("sourceImages", {}).get("background")
        or snapshot.get("project", {}).get("background")
        or ""
    )
    if not source:
        raise ValueError("Asset snapshot is missing sourceImages.background")

    parsed = urlparse(source)
    if parsed.scheme in {"http", "https"}:
        return _download_remote_image(source, output_dir)

    candidate = Path(source)
    if candidate.is_absolute() and candidate.exists():
        return candidate

    options = [
        project_root / source.lstrip("/"),
        project_root / "web" / source.lstrip("/"),
        project_root / "web" / "public" / source.lstrip("/"),
    ]
    for option in options:
        if option.exists():
            return option
    raise FileNotFoundError(f"Cannot resolve background image: {source}")


def _open_rgba(path: Path) -> Image.Image:
    return Image.open(path).convert("RGBA")


def _cover_resize(image: Image.Image, width: int, height: int) -> Image.Image:
    src_w, src_h = image.size
    target_ratio = width / height
    src_ratio = src_w / src_h if src_h else 1

    if src_ratio > target_ratio:
        new_height = height
        new_width = int(new_height * src_ratio)
    else:
        new_width = width
        new_height = int(new_width / src_ratio) if src_ratio else height

    resized = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
    left = max(0, (new_width - width) // 2)
    top = max(0, (new_height - height) // 2)
    return resized.crop((left, top, left + width, top + height))


def _build_linear_gradient(
    size: Tuple[int, int],
    color: Tuple[int, int, int],
    direction: str,
    alpha_start: float,
    alpha_end: float,
) -> Image.Image:
    width, height = size
    gradient = Image.new("RGBA", (width, height))
    draw = ImageDraw.Draw(gradient)

    steps = height if direction == "vertical" else width
    max_steps = max(steps - 1, 1)

    for index in range(steps):
        ratio = index / max_steps
        alpha = int((alpha_start + (alpha_end - alpha_start) * ratio) * 255)
        fill = (*color, max(0, min(255, alpha)))
        if direction == "vertical":
            draw.line([(0, index), (width, index)], fill=fill)
        else:
            draw.line([(index, 0), (index, height)], fill=fill)

    return gradient


def _with_overlay(image: Image.Image, overlay: Image.Image, alpha: float = 1.0) -> Image.Image:
    if alpha >= 1:
        return Image.alpha_composite(image, overlay)
    overlay = overlay.copy()
    alpha_channel = overlay.getchannel("A").point(lambda value: int(value * alpha))
    overlay.putalpha(alpha_channel)
    return Image.alpha_composite(image, overlay)


def _save_image(image: Image.Image, output_path: Path, fmt: str) -> None:
    _ensure_dir(output_path.parent)
    save_format = fmt.upper()
    if save_format == "JPEG":
        image.convert("RGB").save(output_path, "JPEG", quality=95)
        return
    image.save(output_path, save_format)


def _render_login_background(source: Image.Image, width: int, height: int) -> Image.Image:
    return _cover_resize(source, width, height)


def _extract_region(source: Image.Image, left: int, top: int, width: int, height: int) -> Image.Image:
    return source.crop((left, top, left + width, top + height))


def _render_sandwich(
    source: Image.Image,
    width: int,
    height: int,
    rule: Dict[str, Any],
    colors: Dict[str, str],
) -> Image.Image:
    fallback = rule.get("fallbackColor", "#F1F1F1")
    base_rgb = _normalize_color(colors.get(rule.get("baseColorVar", ""), fallback), fallback)
    gradient_rgb = _normalize_color(colors.get(rule.get("gradientColorVar", ""), fallback), fallback)

    base = Image.new("RGBA", (width, height), (*base_rgb, 255))
    cover = _cover_resize(source, width, height)
    cover_alpha = float(rule.get("imageOpacity", 1))
    if cover_alpha < 1:
        cover_alpha_channel = cover.getchannel("A").point(lambda value: int(value * cover_alpha))
        cover.putalpha(cover_alpha_channel)
    merged = Image.alpha_composite(base, cover)

    gradient = _build_linear_gradient(
        (width, height),
        gradient_rgb,
        rule.get("gradientDirection", "horizontal"),
        float(rule.get("gradientOpacityStart", 1)),
        float(rule.get("gradientOpacityEnd", 1)),
    )
    return Image.alpha_composite(merged, gradient)


def _render_desktop_thumbnail(source: Image.Image, width: int, height: int, primary_color: str, panel_color: str) -> Image.Image:
    base = _cover_resize(source, width, height)
    overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    panel_rgb = _normalize_color(panel_color, "#FFFFFF")
    primary_rgb = _normalize_color(primary_color, "#2C615C")
    sidebar_width = round(width * 0.28)
    header_height = max(60, round(height * 0.12))

    draw.rectangle((0, 0, sidebar_width, height), fill=(*panel_rgb, 185))
    draw.rectangle((0, 0, width, header_height), fill=(*primary_rgb, 54))
    draw.rectangle((sidebar_width, header_height, width - 40, height - 40), outline=(255, 255, 255, 180), width=2)
    return Image.alpha_composite(base, overlay)


def _render_layout_thumbnail(source: Image.Image, width: int, height: int, accent_color: str) -> Image.Image:
    base = _cover_resize(source, width, height)
    overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    accent_rgb = _normalize_color(accent_color, "#2C615C")
    draw.rectangle((0, 0, width, height), fill=(255, 255, 255, 18))
    draw.rounded_rectangle((40, 36, width - 40, height - 36), radius=26, outline=(255, 255, 255, 196), width=3)
    draw.rectangle((40, 36, width - 40, 94), fill=(*accent_rgb, 84))
    draw.rectangle((40, 94, 320, height - 36), fill=(255, 255, 255, 134))
    return Image.alpha_composite(base, overlay)


def _prepare_login_assets(source: Image.Image, output_dir: Path, mapping: List[Dict[str, Any]], manifest: Dict[str, str]) -> None:
    rendered: Dict[str, Image.Image] = {}
    for item in mapping:
        output_path = output_dir / item["output"]
        recipe = item["recipe"]
        width = int(item["width"])
        height = int(item["height"])

        if recipe == "login-background":
            rendered[item["output"]] = _render_login_background(source, width, height)
        elif recipe == "login-background-inner":
            bg = rendered[item["source"]]
            rendered[item["output"]] = _extract_region(bg, 147, 0, width, height)
        elif recipe == "login-thumbnail":
            bg = rendered[item["source"]]
            rendered[item["output"]] = _cover_resize(bg, width, height)
        elif recipe == "login-thumb-1":
            bg = rendered[item["source"]]
            rendered[item["output"]] = _extract_region(bg, 0, 345, width, height)
        elif recipe == "login-thumb-2":
            bg = rendered[item["source"]]
            rendered[item["output"]] = _extract_region(bg, 800, 345, width, height)
        else:
            raise ValueError(f"Unknown login recipe: {recipe}")

        _save_image(rendered[item["output"]], output_path, item["format"])
        manifest[item["id"]] = str(output_path)


def _resolve_dimension(item: Dict[str, Any], template_type: str, key: str) -> int:
    direct = item.get(key)
    if direct is not None:
        return int(direct)
    keyed = item.get(f"{key}ByTheme", {})
    return int(keyed[template_type])


def _prepare_header_sidebar_assets(
    source: Image.Image,
    output_dir: Path,
    mapping: List[Dict[str, Any]],
    rules: Dict[str, Any],
    colors: Dict[str, str],
    template_type: str,
    manifest: Dict[str, str],
) -> None:
    for item in mapping:
        width = _resolve_dimension(item, template_type, "width")
        height = _resolve_dimension(item, template_type, "height")
        output_path = output_dir / item["output"]
        rendered = _render_sandwich(source, width, height, rules[item["recipe"]], colors)
        _save_image(rendered, output_path, item["format"])
        manifest[item["id"]] = str(output_path)


def _prepare_thumbnails(
    source: Image.Image,
    output_dir: Path,
    mapping: List[Dict[str, Any]],
    colors: Dict[str, str],
    manifest: Dict[str, str],
) -> None:
    primary = colors.get("primary-color", "#2C615C")
    panel_bg = colors.get("panel-bg-color", "#FFFFFF")
    for item in mapping:
        width = int(item["width"])
        height = int(item["height"])
        output_path = output_dir / item["output"]
        recipe = item["recipe"]
        if recipe == "desktop-thumbnail":
            rendered = _render_desktop_thumbnail(source, width, height, primary, panel_bg)
        elif recipe == "layout-thumbnail":
            rendered = _render_layout_thumbnail(source, width, height, primary)
        else:
            raise ValueError(f"Unknown thumbnail recipe: {recipe}")
        _save_image(rendered, output_path, item["format"])
        manifest[item["id"]] = str(output_path)


def prepare_assets_from_snapshot(snapshot: Dict[str, Any], output_dir: Path, project_root: Path) -> Dict[str, Any]:
    _ensure_dir(output_dir)
    config_dir = project_root / "config"
    sandwich_rules = _load_json(config_dir / "image-sandwich-rules.json")
    output_mapping = _load_json(config_dir / "image-output-mapping.json")
    pipeline = _load_json(config_dir / "export-asset-pipeline.json")

    template_type = snapshot["project"]["templateType"]
    colors = snapshot.get("colors", {})
    source_path = _resolve_source_image(snapshot, project_root, output_dir)
    source = _open_rgba(source_path)

    manifest: Dict[str, str] = {}
    _prepare_login_assets(source, output_dir, output_mapping["login"], manifest)
    _prepare_header_sidebar_assets(
        source,
        output_dir,
        output_mapping["headerSidebar"],
        sandwich_rules[template_type],
        colors,
        template_type,
        manifest,
    )
    _prepare_thumbnails(source, output_dir, output_mapping["thumbnails"], colors, manifest)

    snapshot_copy = output_dir / "asset-snapshot.json"
    snapshot_copy.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    return {
        "version": 1,
        "templateType": template_type,
        "sourceImage": str(source_path),
        "steps": pipeline.get("steps", []),
        "assets": manifest,
    }
