"""Download the MiDaS v2.1 small ONNX model for the /portion endpoint.

Usage (from backend/):
    python -m scripts.download_midas

The model is ~64 MB and ships from the official isl-org/MiDaS GitHub release.
It lands at the path configured by MIDAS_MODEL_PATH (default
models/midas_small_256.onnx) and is gitignored.
"""

import hashlib
import sys
import urllib.request
from pathlib import Path

from app.core.settings import get_settings

MIDAS_SMALL_URL = "https://github.com/isl-org/MiDaS/releases/download/v2_1/model-small.onnx"
CHUNK_SIZE = 1 << 20


def main() -> None:
    target = Path(get_settings().midas_model_path)
    if target.is_file():
        print(f"Already present: {target} ({target.stat().st_size / 1e6:.1f} MB)")
        print(f"sha256: {_sha256(target)}")
        return

    target.parent.mkdir(parents=True, exist_ok=True)
    tmp = target.with_suffix(".onnx.part")
    print(f"Downloading {MIDAS_SMALL_URL}")
    with urllib.request.urlopen(MIDAS_SMALL_URL, timeout=60) as response:  # noqa: S310
        total = int(response.headers.get("Content-Length") or 0)
        done = 0
        with tmp.open("wb") as out:
            while chunk := response.read(CHUNK_SIZE):
                out.write(chunk)
                done += len(chunk)
                if total:
                    sys.stdout.write(f"\r{done / 1e6:.0f}/{total / 1e6:.0f} MB")
                    sys.stdout.flush()
    sys.stdout.write("\n")
    tmp.replace(target)
    print(f"Saved to {target} ({target.stat().st_size / 1e6:.1f} MB)")
    print(f"sha256: {_sha256(target)}")


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while chunk := handle.read(CHUNK_SIZE):
            digest.update(chunk)
    return digest.hexdigest()


if __name__ == "__main__":
    main()
