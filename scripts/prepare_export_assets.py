#!/usr/bin/env python3
"""Prepare all pre-packaging assets from an asset snapshot."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent.parent

try:
    from scripts.lib.asset_pipeline import prepare_assets_from_snapshot
except ModuleNotFoundError:
    sys.path.insert(0, str(PROJECT_ROOT))
    from scripts.lib.asset_pipeline import prepare_assets_from_snapshot


def main() -> int:
    parser = argparse.ArgumentParser(description="Prepare export assets for Theme Studio")
    parser.add_argument("--snapshot", required=True, help="Path to asset-snapshot.json")
    parser.add_argument("--output", required=True, help="Output directory for prepared assets")
    parser.add_argument(
        "--metadata-dir",
        help="Directory for non-image build metadata files. Defaults to the snapshot directory.",
    )
    parser.add_argument(
        "--skip-preview-capture",
        action="store_true",
        help="Only prepare background-image assets and manifest, skip HTML preview screenshots.",
    )
    args = parser.parse_args()

    snapshot_path = Path(args.snapshot).resolve()
    output_dir = Path(args.output).resolve()
    metadata_dir = Path(args.metadata_dir).resolve() if args.metadata_dir else snapshot_path.parent
    metadata_dir.mkdir(parents=True, exist_ok=True)

    with snapshot_path.open("r", encoding="utf-8") as handle:
        snapshot = json.load(handle)

    # Critical invariant: background-derived assets and preview-HTML captures are split here
    # and then consumed by the main packaging chain. Keep this behavior aligned with
    # docs/internal/IMPORTANT-EXPORT-INVARIANTS.md during any future refactor.
    manifest = prepare_assets_from_snapshot(snapshot, output_dir, PROJECT_ROOT, metadata_dir)

    manifest_path = metadata_dir / "prepared-assets-manifest.json"
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"✅ Prepared assets manifest: {manifest_path}")

    if not args.skip_preview_capture and manifest.get("pendingPreviewCaptures"):
        screenshot_script = PROJECT_ROOT / "web" / "scripts" / "screenshot.ts"
        tsx_loader = PROJECT_ROOT / "web" / "node_modules" / "tsx" / "dist" / "loader.mjs"
        command = [
            "node",
            "--import",
            str(tsx_loader),
            str(screenshot_script),
            "--manifest",
            str(manifest_path),
            "--snapshot",
            str(snapshot_path),
            "--output",
            str(output_dir),
        ]
        print("🖼️ Capturing preview-based thumbnail assets...")
        subprocess.run(command, cwd=PROJECT_ROOT / "web", check=True)
        print("✅ Preview-based thumbnail assets captured")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
