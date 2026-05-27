"""
Genera apple-touch-icon.png per iOS PWA.
Esegui dalla root della repo: python3 genera_apple_icon.py

Richiede Pillow: pip install Pillow
"""

from PIL import Image, ImageDraw
import os

SIZE = 180
BG_COLOR = (11, 61, 27)   # --green-dark #0b3d1b
GOLD     = (244, 196, 48)  # --gold #f4c430
LOGO_SRC = "Marzenego.png"
OUT_FILE = "apple-touch-icon.png"

if not os.path.exists(LOGO_SRC):
    print(f"Errore: {LOGO_SRC} non trovato. Esegui lo script dalla root della repo.")
    exit(1)

# ── Crea base 180×180 con angoli arrotondati ──────────────
icon = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
draw = ImageDraw.Draw(icon)

# Sfondo verde scuro con angoli arrotondati
draw.rounded_rectangle([0, 0, SIZE - 1, SIZE - 1], radius=22, fill=BG_COLOR)

# Pattern diagonale sottile (coerente con la webapp)
for i in range(-SIZE, SIZE * 2, 20):
    draw.line([(i, 0), (i + SIZE, SIZE)], fill=(255, 255, 255, 10), width=1)

# Bordo oro
draw.rounded_rectangle([3, 3, SIZE - 4, SIZE - 4], radius=20, outline=GOLD, width=2)

# ── Carica e centra il logo ───────────────────────────────
logo = Image.open(LOGO_SRC).convert("RGBA")

# Ritaglia eventuale spazio bianco/trasparente attorno al logo
bbox = logo.getbbox()
if bbox:
    logo = logo.crop(bbox)

# Ridimensiona con padding
PAD = 28
logo_size = SIZE - PAD * 2
logo.thumbnail((logo_size, logo_size), Image.LANCZOS)

# Centra
lw, lh = logo.size
x = (SIZE - lw) // 2
y = (SIZE - lh) // 2
icon.paste(logo, (x, y), logo)

# ── Salva come RGB (iOS non usa trasparenza per le icone) ──
final = Image.new("RGB", (SIZE, SIZE), BG_COLOR)
final.paste(icon, mask=icon.split()[3])
final.save(OUT_FILE, "PNG", optimize=True)

print(f"✅ {OUT_FILE} generato ({SIZE}×{SIZE}px) — caricalo nella root della repo su GitHub.")
