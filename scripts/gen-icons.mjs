// Generates the PWA icons (indigo background, white check mark) with no dependencies.
import { deflateSync, crc32 } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

function png(size, { rounded }) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const pts = [
    [0.29, 0.53],
    [0.44, 0.67],
    [0.72, 0.35],
  ];
  const half = 0.055;
  const dist = (px, py, [ax, ay], [bx, by]) => {
    const dx = bx - ax;
    const dy = by - ay;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  };
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const px = (x + 0.5) / size;
      const py = (y + 0.5) / size;
      const d = Math.min(dist(px, py, pts[0], pts[1]), dist(px, py, pts[1], pts[2]));
      const check = Math.max(0, Math.min(1, 0.5 + (half - d) * size));
      let alpha = 255;
      if (rounded) {
        const r = 0.22;
        const cx = Math.max(r, Math.min(1 - r, px));
        const cy = Math.max(r, Math.min(1 - r, py));
        const inside = Math.hypot(px - cx, py - cy) - r;
        alpha = Math.round(255 * Math.max(0, Math.min(1, 0.5 - inside * size)));
      }
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = Math.round(0x4f + (255 - 0x4f) * check);
      raw[o + 1] = Math.round(0x46 + (255 - 0x46) * check);
      raw[o + 2] = Math.round(0xe5 + (255 - 0xe5) * check);
      raw[o + 3] = alpha;
    }
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync("public/icons", { recursive: true });
writeFileSync("public/icons/icon-192.png", png(192, { rounded: true }));
writeFileSync("public/icons/icon-512.png", png(512, { rounded: true }));
writeFileSync("public/icons/maskable-512.png", png(512, { rounded: false }));
writeFileSync("src/app/icon.png", png(192, { rounded: true }));
// iOS applies its own corner mask, so the touch icon is full-bleed.
writeFileSync("src/app/apple-icon.png", png(180, { rounded: false }));
console.log("icons written");
