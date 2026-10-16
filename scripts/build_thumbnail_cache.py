from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
from io import BytesIO
import json
from pathlib import Path
import re
from typing import Mapping
from urllib.parse import urlsplit
from urllib.request import Request, urlopen
from uuid import UUID

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
CATALOG_PATH = ROOT / "data" / "krea_moodboards_slim.json"
CACHE_DIR = ROOT / "data" / "thumb_cache"
THUMB_SIZE = 256
WORKERS = 8
UUID_PATTERN = re.compile(r"^[0-9a-fA-F-]{36}$")


def build_thumbnail(board: Mapping[str, object]) -> tuple[str, int]:
    board_uuid = str(board.get("uuid") or "")
    image_url = str(board.get("primary_image_url") or "")
    if not UUID_PATTERN.fullmatch(board_uuid) or str(UUID(board_uuid)) != board_uuid.lower():
        raise ValueError(f"Invalid moodboard UUID: {board_uuid!r}")

    parsed_url = urlsplit(image_url)
    if parsed_url.scheme != "https" or parsed_url.hostname != "optim-images.krea.ai":
        raise ValueError(f"Unexpected thumbnail URL for {board_uuid}: {image_url!r}")

    path = CACHE_DIR / f"{board_uuid}-256.webp"
    if path.is_file() and path.stat().st_size:
        return board_uuid, path.stat().st_size

    request = Request(image_url, headers={"User-Agent": "ComfyUI-Krea-Moodboards-Local"})
    with urlopen(request, timeout=45) as response:
        source = response.read()

    with Image.open(BytesIO(source)) as image:
        image.thumbnail((THUMB_SIZE, THUMB_SIZE), Image.Resampling.LANCZOS)
        if image.mode not in ("RGB", "RGBA"):
            image = image.convert("RGBA" if "A" in image.getbands() else "RGB")
        output = BytesIO()
        image.save(output, format="WEBP", quality=82, method=4)

    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    temporary_path = path.with_suffix(".webp.tmp")
    temporary_path.write_bytes(output.getvalue())
    temporary_path.replace(path)
    return board_uuid, path.stat().st_size


def main() -> None:
    payload = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    boards = [
        board for board in payload["moodboards"]
        if board.get("uuid") and board.get("primary_image_url")
    ]
    failures: list[tuple[str, str]] = []
    CACHE_DIR.mkdir(parents=True, exist_ok=True)

    with ThreadPoolExecutor(max_workers=WORKERS) as executor:
        futures = {executor.submit(build_thumbnail, board): board for board in boards}
        for count, future in enumerate(as_completed(futures), start=1):
            try:
                future.result()
            except Exception as exc:
                board = futures[future]
                failures.append((str(board.get("uuid") or "?"), str(exc)))
            if count % 100 == 0 or count == len(boards):
                print(f"Prepared {count}/{len(boards)} thumbnails")

    if failures:
        for board_uuid, error in failures[:20]:
            print(f"Failed {board_uuid}: {error}")
        raise SystemExit(f"Could not build {len(failures)} of {len(boards)} thumbnails.")

    cache_bytes = sum(path.stat().st_size for path in CACHE_DIR.glob("*-256.webp"))
    print(f"Prepared {len(boards)} thumbnails ({cache_bytes / (1024 * 1024):.1f} MiB).")


if __name__ == "__main__":
    main()
