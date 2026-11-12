"""
Genera versiones WebP optimizadas de las imágenes pesadas de `public/`.

Uso (desde NOVEX_FRONTEND):
    python scripts/optimize-images.py            # crea/actualiza los .webp
    python scripts/optimize-images.py --check    # solo informa, no escribe

Los originales NO se tocan: cada `foo.png|jpg` obtiene un `foo.webp` al lado,
y el código referencia el `.webp`. Si el WebP no ahorra al menos un 15 % (p. ej.
PNG de paleta ya mínimos) se descarta y se sigue sirviendo el original. El script es idempotente: solo regenera un
WebP si el original es más reciente.

Tamaños máximos (lado largo, px) elegidos por cómo se pintan en pantalla, con
margen para pantallas 2x–2,5x: así no se pierde nitidez en retina.
  · Cartas de coordinación: se pintan ≤252 px de ancho → 640 px de ancho.
  · Ornamentos de ticket: iconos pequeños → 600 px; bandas anchas → 1400 px.
  · Marcas de agua de ticket: ≤360 px → 900 px.
  · Papel del ticket y escenarios a pantalla completa: tamaño original
    (≤1920 px), solo recompresión.
Requiere Pillow con soporte WebP (`python -m pip install pillow`).
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent / "public"

# (patrón glob relativo a public/, lado largo máximo | None, calidad)
RULES: list[tuple[str, int | None, int]] = [
    ("CoordCards/*.png", 960, 84),  # 640×960 (retrato 2:3)
    ("assets/tickets/**/ornament-*.png", 0, 84),  # 0 = según proporción
    ("assets/tickets/**/watermark-*.png", 900, 84),
    ("assets/tickets/common/ticket-paper-cream.png", None, 80),
    ("assets/scenes/*.png", 1920, 82),
    ("assets/login/*.png", 1920, 84),
    # `assests/scenes/` (ciudades y sala del tema azul anterior) ya no se usa:
    # no se genera WebP para no volver a publicarlas.
    ("analysis/*.png", 1920, 82),
    ("novex-mark.png", 512, 90),
]


def target_long_side(img: Image.Image, rule_max: int | None) -> int | None:
    if rule_max != 0:
        return rule_max
    w, h = img.size
    ratio = max(w, h) / max(1, min(w, h))
    return 1400 if ratio >= 1.8 else 600


# Un WebP que no ahorra al menos esto no compensa: se borra y se sirve el original.
MIN_SAVING = 0.15


def worth_it(src: Path, dst: Path) -> bool:
    return dst.stat().st_size <= src.stat().st_size * (1 - MIN_SAVING)


def convert(src: Path, rule_max: int | None, quality: int, check: bool) -> tuple[int, int] | None:
    dst = src.with_suffix(".webp")
    if dst.exists() and dst.stat().st_mtime >= src.stat().st_mtime:
        if not check and not worth_it(src, dst):
            dst.unlink()
        return None
    with Image.open(src) as img:
        img.load()
        has_alpha = img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info)
        img = img.convert("RGBA" if has_alpha else "RGB")
        limit = target_long_side(img, rule_max)
        if limit and max(img.size) > limit:
            scale = limit / max(img.size)
            img = img.resize(
                (round(img.width * scale), round(img.height * scale)),
                Image.Resampling.LANCZOS,
            )
        if check:
            return src.stat().st_size, -1
        img.save(dst, "WEBP", quality=quality, method=6, alpha_quality=90)
    if not worth_it(src, dst):
        dst.unlink()
        return src.stat().st_size, src.stat().st_size
    return src.stat().st_size, dst.stat().st_size


def main() -> int:
    check = "--check" in sys.argv
    before = after = count = 0
    seen: set[Path] = set()
    for pattern, rule_max, quality in RULES:
        for src in sorted(ROOT.glob(pattern)):
            if src in seen or not src.is_file():
                continue
            seen.add(src)
            result = convert(src, rule_max, quality, check)
            if result is None:
                continue
            count += 1
            before += result[0]
            if result[1] >= 0:
                after += result[1]
                print(f"{result[0] // 1024:>6} KB -> {result[1] // 1024:>5} KB  {src.relative_to(ROOT)}")
            else:
                print(f"{result[0] // 1024:>6} KB  pendiente  {src.relative_to(ROOT)}")
    if count:
        print(f"\n{count} imágenes · {before / 1048576:.1f} MB -> {after / 1048576:.1f} MB")
    else:
        print("Todo al día.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
