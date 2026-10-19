// Writes a 512x512 PNG: pixel-art crab mascot (orange) on a dark rounded tile. No deps.
const fs = require('fs'), zlib = require('zlib');
const N = 512, BG = [38, 38, 36], ORANGE = [217, 119, 87], EYE = [38, 38, 36], CELL = 28;
const ART = [
  '..XXXXXXXXXXX..',
  '..XXXXXXXXXXX..',
  '..XXEXXXXXEXX..',
  'XXXXEXXXXXEXXXX',
  'XXXXXXXXXXXXXXX',
  '..XXXXXXXXXXX..',
  '..XXXXXXXXXXX..',
  '...X.X...X.X...',
  '...X.X...X.X...',
];
const w = ART[0].length * CELL, h = ART.length * CELL, x0 = (N - w) / 2, y0 = (N - h) / 2;
const raw = Buffer.alloc(N * (N * 4 + 1));
const R = 96; // tile corner radius
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
  const o = y * (N * 4 + 1) + 1 + x * 4;
  const cx = Math.min(Math.max(x, R), N - R), cy = Math.min(Math.max(y, R), N - R);
  let c = BG, a = Math.hypot(x - cx, y - cy) <= R ? 255 : 0;
  const gx = Math.floor((x - x0) / CELL), gy = Math.floor((y - y0) / CELL);
  const ch = ART[gy] && x >= x0 ? ART[gy][gx] : '.';
  if (ch === 'X') c = ORANGE; else if (ch === 'E') c = EYE;
  raw[o] = c[0]; raw[o + 1] = c[1]; raw[o + 2] = c[2]; raw[o + 3] = a;
  if (y % 1 === 0 && x === 0) raw[y * (N * 4 + 1)] = 0;
}
const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = b => { let c = 0xffffffff; for (const v of b) c = crcT[(c ^ v) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t, d) => { const b = Buffer.concat([Buffer.from(t), d]), l = Buffer.alloc(4), c = Buffer.alloc(4); l.writeUInt32BE(d.length); c.writeUInt32BE(crc(b)); return Buffer.concat([l, b, c]); };
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(N, 0); ihdr.writeUInt32BE(N, 4); ihdr[8] = 8; ihdr[9] = 6;
fs.writeFileSync(process.argv[2] || 'claude_code.png', Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
