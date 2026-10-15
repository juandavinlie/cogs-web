# Website guide source

Builds `docs/COGS-Website-Guide.pdf` (macOS; uses Georgia/Arial system fonts).

```bash
python3 -m venv .venv && .venv/bin/pip install reportlab pillow
.venv/bin/python docs/guide-src/build_guide.py docs/COGS-Website-Guide.pdf
```

Screenshots in `img/` were taken at phone width (375px) from the running site.
Set `SITE` in `build_guide.py` to the live website address once it's known.
