const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (c & 1 ? 0xEDB88320 : 0);
  }
  return ~c >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function renderFinancoIcon(width, height, isMaskable) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // 8 bit
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  const raw = Buffer.alloc(height * (1 + width * 4));
  let idx = 0;

  // Colors
  const bgNavy = [15, 44, 89]; // #0F2C59
  const darkNavy = [10, 29, 59]; // #0A1D3B
  const emerald = [16, 185, 129]; // #10B981
  const white = [255, 255, 255];
  const borderBlue = [37, 99, 235]; // #2563EB

  const cx = width / 2;
  const cy = height / 2;
  // Maskable safe zone is 80% (10% padding on each side)
  const scale = isMaskable ? (width * 0.72) / 512 : (width * 0.88) / 512;
  const cornerRadius = isMaskable ? 0 : width * 0.22;

  for (let y = 0; y < height; y++) {
    raw[idx++] = 0; // Filter None

    for (let x = 0; x < width; x++) {
      let r, g, b, a;

      // Base background gradient: Navy top to darker bottom
      const gradientFactor = y / height;
      r = Math.round(bgNavy[0] * (1 - gradientFactor) + darkNavy[0] * gradientFactor);
      g = Math.round(bgNavy[1] * (1 - gradientFactor) + darkNavy[1] * gradientFactor);
      b = Math.round(bgNavy[2] * (1 - gradientFactor) + darkNavy[2] * gradientFactor);
      a = 255;

      // Squircle clipping for non-maskable icons
      if (!isMaskable) {
        let dx = 0;
        let dy = 0;
        if (x < cornerRadius) dx = cornerRadius - x;
        else if (x > width - cornerRadius) dx = x - (width - cornerRadius);
        if (y < cornerRadius) dy = cornerRadius - y;
        else if (y > height - cornerRadius) dy = y - (height - cornerRadius);

        if (dx > 0 && dy > 0) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > cornerRadius) {
            a = 0; // Transparent outside rounded corner
          } else if (dist > cornerRadius - 1.5) {
            // Anti-aliasing
            a = Math.max(0, Math.min(255, Math.round((cornerRadius - dist) / 1.5 * 255)));
          }
        }
      }

      // Draw brand symbol in normalized coordinates centered at (cx, cy)
      const nx = (x - cx) / scale;
      const ny = (y - cy) / scale;

      // Only draw if within bounds and not clipped
      if (a > 0) {
        // Shield background shape
        const inShield = (nx >= -130 && nx <= 130 && ny >= -120 && ny <= 140 && (ny < 0 || Math.abs(nx) <= 130 - (ny * 0.7)));
        if (inShield) {
          r = Math.round(r * 0.4 + 20 * 0.6);
          g = Math.round(g * 0.4 + 55 * 0.6);
          b = Math.round(b * 0.4 + 110 * 0.6);
        }

        // Vertical stem of "F"
        if (nx >= -95 && nx <= -65 && ny >= -75 && ny <= 105) {
          r = white[0]; g = white[1]; b = white[2];
        }

        // Top bar of "F"
        if (nx >= -95 && nx <= 95 && ny >= -75 && ny <= -49) {
          r = white[0]; g = white[1]; b = white[2];
        }

        // Middle bar of "F" (Emerald)
        if (nx >= -95 && nx <= 45 && ny >= -20 && ny <= 4) {
          r = emerald[0]; g = emerald[1]; b = emerald[2];
        }

        // Verification Badge Circle at bottom-right (center 65, 45, radius 46)
        const bdx = nx - 65;
        const bdy = ny - 45;
        const bDist = Math.sqrt(bdx * bdx + bdy * bdy);
        if (bDist <= 46) {
          if (bDist > 40) {
            // Dark ring
            r = bgNavy[0]; g = bgNavy[1]; b = bgNavy[2];
          } else {
            // Emerald badge
            r = emerald[0]; g = emerald[1]; b = emerald[2];

            // White checkmark inside badge
            // Checkmark points: P1(-17, 0) to P2(-5, 12) to P3(19, -12) relative to badge center
            const cxCheck = bdx;
            const cyCheck = bdy;
            // Line 1: from (-17, 0) to (-5, 12)
            const dLine1 = pointToSegmentDist(cxCheck, cyCheck, -17, 0, -5, 12);
            // Line 2: from (-5, 12) to (19, -12)
            const dLine2 = pointToSegmentDist(cxCheck, cyCheck, -5, 12, 19, -12);

            if (dLine1 <= 4.5 || dLine2 <= 4.5) {
              r = white[0]; g = white[1]; b = white[2];
            }
          }
        }
      }

      raw[idx++] = r;
      raw[idx++] = g;
      raw[idx++] = b;
      raw[idx++] = a;
    }
  }

  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idat),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

function pointToSegmentDist(px, py, x1, y1, x2, y2) {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return Math.sqrt((px - x1) * (px - x1) + (py - y1) * (py - y1));
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * (x2 - x1);
  const projY = y1 + t * (y2 - y1);
  return Math.sqrt((px - projX) * (px - projX) + (py - projY) * (py - projY));
}

// Generate files
const outDir = path.join(__dirname, '../public');

console.log('Generating PWA icons...');
fs.writeFileSync(path.join(outDir, 'pwa-192x192.png'), renderFinancoIcon(192, 192, false));
console.log('✓ Created pwa-192x192.png');

fs.writeFileSync(path.join(outDir, 'pwa-512x512.png'), renderFinancoIcon(512, 512, false));
console.log('✓ Created pwa-512x512.png');

fs.writeFileSync(path.join(outDir, 'pwa-maskable-512x512.png'), renderFinancoIcon(512, 512, true));
console.log('✓ Created pwa-maskable-512x512.png');

fs.writeFileSync(path.join(outDir, 'apple-touch-icon.png'), renderFinancoIcon(180, 180, false));
console.log('✓ Created apple-touch-icon.png');

console.log('All icons generated successfully!');
