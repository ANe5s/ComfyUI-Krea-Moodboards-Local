# Data Notice

This repository includes a prompt-only catalog derived from public Krea moodboard pages and local prompt-style enrichment.

The bundled file is:

```text
data/krea_moodboards_slim.json
```

It includes moodboard metadata and prompt guidance:

- source Krea moodboard URL
- public Krea thumbnail URL
- slug and UUID
- title
- taste profile
- keywords
- prompt guidance
- negative guidance
- style axes
- conditioning notes
- source summary

The repository also bundles `data/andrometa_moodboards.json`, an original curated set of Andro.Meta prompt moods (text only).

Simplified Chinese card titles and summaries for both catalogs are bundled in `data/moodboard_translations_zh.json`. They are static Google Translate machine translations; the plugin does not contact the translation service at runtime.

It does not include:

- full image URL lists
- Krea model weights
- ComfyUI model weights

The Registry publishing workflow downloads public Krea thumbnail URLs, resizes them to 256-pixel WebP files, and includes them in the package under `data/thumb_cache/`. The cache stays out of Git history. ComfyUI serves thumbnails from disk, so browsing makes no image or translation requests to Krea, its CDN, or the translation service. A source checkout can build the same cache with `python scripts/build_thumbnail_cache.py` (requires Pillow and network access during the build). The 60 Andro.Meta prompt moods are text-only and have no source image URLs.

Users can visually inspect the source styles on Krea's public moodboard gallery:

https://www.krea.ai/app?gallery=moodboards

This project is unofficial and is not affiliated with, endorsed by, or sponsored by Krea AI.
