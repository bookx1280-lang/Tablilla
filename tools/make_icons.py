#!/usr/bin/env python3
"""Genera iconos PNG para la PWA sin dependencias externas.

Dibuja una tablilla: fondo azul redondeado con una cuadrícula de
pictogramas blancos. Salida: assets/icons/*.png
"""
import os
import struct
import zlib

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "assets", "icons")

BG = (37, 99, 235)        # #2563eb
BG_DARK = (29, 78, 216)   # #1d4ed8
WHITE = (255, 255, 255)
ACCENT = (255, 212, 0)    # #ffd400


def rounded_rect_mask(x, y, w, h, r):
    """Devuelve True si (x,y) está dentro del rectángulo redondeado."""
    if x < 0 or y < 0 or x >= w or y >= h:
        return False
    cx = min(max(x, r), w - 1 - r)
    cy = min(max(y, r), h - 1 - r)
    dx = x - cx
    dy = y - cy
    return dx * dx + dy * dy <= r * r


def make_icon(size, maskable=False):
    px = [[(0, 0, 0, 0) for _ in range(size)] for _ in range(size)]

    radius = 0 if maskable else int(size * 0.22)
    # Para maskable, el fondo cubre todo (safe zone al centro).
    for y in range(size):
        for x in range(size):
            if maskable or rounded_rect_mask(x, y, size, size, radius):
                # Degradado vertical suave
                t = y / max(1, size - 1)
                r = int(BG[0] * (1 - t) + BG_DARK[0] * t)
                g = int(BG[1] * (1 - t) + BG_DARK[1] * t)
                b = int(BG[2] * (1 - t) + BG_DARK[2] * t)
                px[y][x] = (r, g, b, 255)

    # Cuadrícula 2x2 de pictogramas
    margin = int(size * (0.30 if maskable else 0.22))
    gap = int(size * 0.06)
    cell = (size - 2 * margin - gap) // 2
    cr = max(2, int(cell * 0.18))
    origin = margin

    for row in range(2):
        for col in range(2):
            ox = origin + col * (cell + gap)
            oy = origin + row * (cell + gap)
            color = ACCENT if (row == 0 and col == 1) else WHITE
            for y in range(oy, oy + cell):
                for x in range(ox, ox + cell):
                    if rounded_rect_mask(x - ox, y - oy, cell, cell, cr):
                        px[y][x] = color + (255,)

    return px


def write_png(path, px):
    size = len(px)
    raw = bytearray()
    for y in range(size):
        raw.append(0)  # filtro None
        for x in range(size):
            raw.extend(px[y][x])

    def chunk(tag, data):
        c = struct.pack(">I", len(data)) + tag + data
        c += struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        return c

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", ihdr)
    png += chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    png += chunk(b"IEND", b"")

    with open(path, "wb") as f:
        f.write(png)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    jobs = [
        ("icon-192.png", 192, False),
        ("icon-512.png", 512, False),
        ("icon-maskable-512.png", 512, True),
    ]
    for name, size, maskable in jobs:
        path = os.path.join(OUT_DIR, name)
        write_png(path, make_icon(size, maskable))
        print("escrito:", os.path.relpath(path))


if __name__ == "__main__":
    main()
