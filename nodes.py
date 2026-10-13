from __future__ import annotations

import json
from functools import lru_cache

try:
    from .moodboard_catalog import CATALOG_PATH, load_catalog, resolve_board_reference, style_from_board
except ImportError:
    from moodboard_catalog import CATALOG_PATH, load_catalog, resolve_board_reference, style_from_board


STRENGTHS = ["concise", "normal", "strong"]
NODE_CATEGORY = "ANe5s Nodes/Krea2"


@lru_cache(maxsize=1)
def _catalog():
    return load_catalog(CATALOG_PATH)


class KreaMoodboardVisualBrowser:
    CATEGORY = NODE_CATEGORY
    RETURN_TYPES = ("STRING", "STRING", "STRING", "STRING", "STRING")
    RETURN_NAMES = ("positive", "negative", "title", "uuid", "metadata_json")
    FUNCTION = "select"
    DESCRIPTION = "Visual Krea moodboard picker with search, local thumbnails, and browser favorites."

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "query": ("STRING", {"default": "", "multiline": False}),
                "selected_uuid": ("STRING", {"default": "", "multiline": False}),
                "selected_title": ("STRING", {"default": "", "multiline": False}),
                "selected_url": ("STRING", {"default": "", "multiline": False}),
                "selected_metadata_json": ("STRING", {"default": "", "multiline": True}),
                "strength": (STRENGTHS, {"default": "normal"}),
            }
        }

    def select(
        self,
        query: str,
        selected_uuid: str,
        selected_title: str,
        selected_url: str,
        selected_metadata_json: str,
        strength: str,
    ):
        catalog = _catalog()
        board_ref = selected_metadata_json or selected_uuid or selected_url or selected_title or query
        board = resolve_board_reference(catalog, board_ref)
        style = style_from_board(board, strength=strength)
        metadata = json.loads(style["metadata_json"])
        return (
            style["positive"],
            style["negative"],
            style["title"],
            str(metadata.get("uuid", "")),
            style["metadata_json"],
        )
