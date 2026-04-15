#!/usr/bin/env python3
"""Prepare all pre-packaging assets from an asset snapshot."""

from __future__ import annotations

import argparse
import json
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
    args = parser.parse_args()

    snapshot_path = Path(args.snapshot).resolve()
    output_dir = Path(args.output).resolve()

    with snapshot_path.open("r", encoding="utf-8") as handle:
        snapshot = json.load(handle)

    manifest = prepare_assets_from_snapshot(snapshot, output_dir, PROJECT_ROOT)

    manifest_path = output_dir / "prepared-assets-manifest.json"
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"✅ Prepared assets manifest: {manifest_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
