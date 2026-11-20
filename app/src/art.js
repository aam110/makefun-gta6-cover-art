// art.js — procedural cover art for Solstice Press.
//
// Every scene, palm, skyline, texture and decoration in the app is drawn in
// code on a 2D canvas. The app ships no image files at all: the "sample
// panels" are seeded scenes generated at runtime, and users add their own
// photos on top. Nothing here loads over the network.

// ---------------------------------------------------------------------------
// Seeded randomness
// ---------------------------------------------------------------------------

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(text) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick(rnd, list) {
  return list[Math.floor(rnd() * list.length)];
}

function range(rnd, lo, hi) {
  return lo + rnd() * (hi - lo);
}

// ---------------------------------------------------------------------------
// Scene catalogue
// ---------------------------------------------------------------------------

export const SCENE_KINDS = [
  'sunset-beach',
  'city-dusk',
  'neon-street',
  'pier-dawn',
  'palm-alley',
  'desert-road',
];

export const SCENE_NAMES = {
  'sunset-beach': 'Sunset Beach',
  'city-dusk': 'City Dusk',
  'neon-street': 'Neon Street',
  'pier-dawn': 'Pier Dawn',
  'palm-alley': 'Palm Alley',
  'desert-road': 'Desert Road',
};

// ---------------------------------------------------------------------------
// Small drawing helpers
// ---------------------------------------------------------------------------

function skyGradient(ctx, w, h, stops, top = 0, bottom = 1) {
  const g = ctx.createLinearGradient(0, h * top, 0, h * bottom);
  for (const [at, color] of stops) g.addColorStop(at, color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

// A retro sun: a gradient disc with horizontal slits cut out of its lower half.
export function drawStripedSun(ctx, cx, cy, r, topColor, bottomColor, slits = 5) {
  ctx.save();
  const g = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  g.addColorStop(0, topColor);
  g.addColorStop(1, bottomColor);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < slits; i++) {
    const t = i / slits;
    const y = cy + r * (0.05 + t * 0.85);
    const half = Math.sqrt(Math.max(0, r * r - (y - cy) * (y - cy)));
    const thickness = r * (0.03 + t * 0.075);
    ctx.fillRect(cx - half, y, half * 2, thickness);
  }
  ctx.restore();
}

// A soft glowing disc sun (no slits) for dawn scenes.
export function drawGlowSun(ctx, cx, cy, r, color) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = r * 0.9;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// A palm silhouette: curved trunk plus drooping fronds, all in one colour.
export function drawPalm(ctx, x, y, size, lean, color) {
  const topX = x + lean * size;
  const topY = y - size;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  // Trunk: two strokes, a thick base and a thin tip, for a slight taper.
  ctx.lineWidth = size * 0.075;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + lean * size * 0.25, y - size * 0.55, topX, topY);
  ctx.stroke();
  // Fronds radiate from the crown and droop.
  const fronds = 8;
  for (let i = 0; i < fronds; i++) {
    const angle = Math.PI * (0.08 + (i / (fronds - 1)) * 0.84);
    const len = size * (0.52 + 0.22 * Math.sin(i * 2.3));
    const tipX = topX + Math.cos(angle) * len;
    const tipY = topY + Math.abs(Math.sin(angle)) * len * 0.55 + len * 0.28;
    const midX = topX + Math.cos(angle) * len * 0.55;
    const midY = topY - len * 0.22 + len * 0.1;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(midX, midY, tipX, tipY);
    ctx.quadraticCurveTo(midX + len * 0.12, midY + len * 0.22, topX, topY + size * 0.02);
    ctx.fill();
  }
  // Coconuts.
  ctx.beginPath();
  ctx.arc(topX - size * 0.03, topY + size * 0.05, size * 0.045, 0, Math.PI * 2);
  ctx.arc(topX + size * 0.04, topY + size * 0.06, size * 0.04, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// A seeded skyline: flat-topped buildings with a scatter of lit windows.
export function drawSkyline(ctx, x, baseY, w, h, seed, color, litColor, litChance = 0.4) {
  const rnd = mulberry32(seed);
  ctx.save();
  ctx.fillStyle = color;
  let cursor = x;
  let tallest = { x: 0, top: baseY, w: 0 };
  while (cursor < x + w - 4) {
    const bw = range(rnd, w * 0.05, w * 0.13);
    const bh = range(rnd, h * 0.3, h);
    const top = baseY - bh;
    ctx.fillRect(cursor, top, bw, bh);
    if (bh > baseY - tallest.top) tallest = { x: cursor, top, w: bw };
    // Windows.
    const cols = Math.max(1, Math.floor(bw / 14));
    const rows = Math.max(1, Math.floor(bh / 18));
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (rnd() < litChance) {
          ctx.fillStyle = litColor;
          ctx.globalAlpha = range(rnd, 0.35, 1);
          ctx.fillRect(cursor + 4 + c * ((bw - 8) / cols), top + 6 + r * ((bh - 12) / rows), 4, 6);
          ctx.globalAlpha = 1;
          ctx.fillStyle = color;
        }
      }
    }
    // Rooftop details: water tower or antenna.
    if (rnd() < 0.3) {
      ctx.fillRect(cursor + bw * 0.4, top - h * 0.06, bw * 0.2, h * 0.06);
    }
    cursor += bw + range(rnd, 1, w * 0.02);
  }
  // One antenna on the tallest tower.
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(tallest.x + tallest.w / 2, tallest.top);
  ctx.lineTo(tallest.x + tallest.w / 2, tallest.top - h * 0.22);
  ctx.stroke();
  ctx.fillStyle = '#ff4757';
  ctx.beginPath();
  ctx.arc(tallest.x + tallest.w / 2, tallest.top - h * 0.22, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBirds(ctx, rnd, w, h, count, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.5, w * 0.003);
  ctx.lineCap = 'round';
  for (let i = 0; i < count; i++) {
    const bx = range(rnd, w * 0.1, w * 0.9);
    const by = range(rnd, h * 0.08, h * 0.32);
    const s = range(rnd, w * 0.012, w * 0.028);
    ctx.beginPath();
    ctx.moveTo(bx - s, by);
    ctx.quadraticCurveTo(bx - s * 0.4, by - s * 0.5, bx, by);
    ctx.quadraticCurveTo(bx + s * 0.4, by - s * 0.5, bx + s, by);
    ctx.stroke();
  }
  ctx.restore();
}

function drawStars(ctx, rnd, w, h, count, maxY) {
  ctx.save();
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < count; i++) {
    ctx.globalAlpha = range(rnd, 0.25, 0.95);
    const r = range(rnd, 0.6, 1.8);
    ctx.beginPath();
    ctx.arc(rnd() * w, rnd() * maxY, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Sun glitter on water: short horizontal dashes under the sun.
function drawSunGlitter(ctx, cx, topY, bottomY, w, color) {
  ctx.save();
  ctx.fillStyle = color;
  let y = topY;
  let row = 0;
  while (y < bottomY) {
    const width = w * (0.05 + row * 0.035);
    ctx.globalAlpha = Math.max(0.08, 0.55 - row * 0.09);
    ctx.fillRect(cx - width / 2, y, width, Math.max(1.5, (bottomY - topY) * 0.02));
    y += (bottomY - topY) * 0.09;
    row++;
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// The six procedural scenes
// ---------------------------------------------------------------------------

function sceneSunsetBeach(ctx, w, h, rnd) {
  skyGradient(ctx, w, h, [
    [0, '#1b1040'],
    [0.42, '#7b2d8b'],
    [0.68, '#ff2975'],
    [1, '#ffb347'],
  ]);
  drawStars(ctx, rnd, w, h, 26, h * 0.3);
  drawStripedSun(ctx, w * 0.66, h * 0.44, Math.min(w, h) * 0.21, '#ffd319', '#ff2975');
  drawBirds(ctx, rnd, w, h, 4, '#2a1245');
  // Sea.
  const sea = ctx.createLinearGradient(0, h * 0.62, 0, h * 0.84);
  sea.addColorStop(0, '#e2497a');
  sea.addColorStop(1, '#2a1a4a');
  ctx.fillStyle = sea;
  ctx.fillRect(0, h * 0.62, w, h * 0.22);
  drawSunGlitter(ctx, w * 0.66, h * 0.63, h * 0.83, w, '#ffd319');
  // Sand.
  const sand = ctx.createLinearGradient(0, h * 0.84, 0, h);
  sand.addColorStop(0, '#f7c873');
  sand.addColorStop(1, '#c97e3f');
  ctx.fillStyle = sand;
  ctx.fillRect(0, h * 0.84, w, h * 0.16);
  // Palms framing the shot.
  drawPalm(ctx, w * 0.06, h * 0.98, h * 0.42, 0.28, '#1c1030');
  drawPalm(ctx, w * 0.94, h * 0.96, h * 0.34, -0.3, '#241238');
  drawPalm(ctx, w * 0.16, h * 0.9, h * 0.2, 0.2, '#2a1540');
}

function sceneCityDusk(ctx, w, h, rnd) {
  skyGradient(ctx, w, h, [
    [0, '#12082b'],
    [0.45, '#3b1d5e'],
    [0.72, '#c94b7c'],
    [1, '#ff9a3d'],
  ]);
  drawStripedSun(ctx, w * 0.3, h * 0.56, Math.min(w, h) * 0.17, '#ffe259', '#ff7518', 4);
  drawBirds(ctx, rnd, w, h, 3, '#1c0b33');
  // Far haze skyline, then the near one with lit windows.
  drawSkyline(ctx, 0, h * 0.78, w, h * 0.26, hashSeed(`far-${rnd()}`), '#5b2a68', '#ffd319', 0.12);
  drawSkyline(ctx, 0, h * 0.94, w, h * 0.42, hashSeed(`near-${rnd()}`), '#160b2e', '#ffd319', 0.42);
  ctx.fillStyle = '#0d0618';
  ctx.fillRect(0, h * 0.94, w, h * 0.06);
  // Street glow dots.
  ctx.fillStyle = '#ff2975';
  for (let i = 0; i < 7; i++) {
    ctx.globalAlpha = range(rnd, 0.4, 0.9);
    ctx.beginPath();
    ctx.arc(rnd() * w, h * 0.965, range(rnd, 1.5, 3.5), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function sceneNeonStreet(ctx, w, h, rnd) {
  skyGradient(ctx, w, h, [
    [0, '#070412'],
    [0.6, '#120a2a'],
    [1, '#1c0f38'],
  ]);
  drawStars(ctx, rnd, w, h, 40, h * 0.4);
  const neon = ['#ff2975', '#00e5ff', '#ffd319', '#7b2ff7', '#00ffa3'];
  // Buildings left and right with glowing signs, plus a centre block so the
  // middle of the street is never an empty void.
  ctx.fillStyle = '#0d0820';
  ctx.fillRect(0, h * 0.12, w * 0.3, h * 0.6);
  ctx.fillRect(w * 0.7, h * 0.08, w * 0.3, h * 0.64);
  ctx.fillStyle = '#120b28';
  ctx.fillRect(w * 0.32, h * 0.3, w * 0.36, h * 0.42);
  // Lit windows on the centre block.
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 6; c++) {
      if (rnd() < 0.5) {
        ctx.fillStyle = rnd() < 0.5 ? '#ffd319' : '#00e5ff';
        ctx.globalAlpha = range(rnd, 0.4, 0.95);
        ctx.fillRect(w * (0.35 + c * 0.055), h * (0.34 + r * 0.07), w * 0.028, h * 0.032);
      }
    }
  }
  ctx.globalAlpha = 1;
  const signs = [];
  for (let i = 0; i < 5; i++) {
    const side = i % 2 === 0 ? 0 : 1;
    const sx = side === 0 ? range(rnd, w * 0.02, w * 0.16) : range(rnd, w * 0.78, w * 0.92);
    const sy = range(rnd, h * 0.14, h * 0.5);
    const sw = range(rnd, w * 0.05, w * 0.1);
    const sh = range(rnd, h * 0.06, h * 0.2);
    const color = pick(rnd, neon);
    signs.push({ x: sx + sw / 2, color });
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.92;
    roundRect(ctx, sx, sy, sw, sh, 4);
    ctx.fill();
    ctx.restore();
    // Sign text bars.
    ctx.fillStyle = 'rgba(10,4,20,0.85)';
    for (let b = 0; b < 3; b++) {
      ctx.fillRect(sx + sw * 0.18, sy + sh * (0.2 + b * 0.26), sw * 0.64, Math.max(2, sh * 0.09));
    }
  }
  // Wet street with reflections.
  const street = ctx.createLinearGradient(0, h * 0.72, 0, h);
  street.addColorStop(0, '#1a0f33');
  street.addColorStop(1, '#05030d');
  ctx.fillStyle = street;
  ctx.fillRect(0, h * 0.72, w, h * 0.28);
  for (const sign of signs) {
    const g = ctx.createLinearGradient(0, h * 0.72, 0, h);
    g.addColorStop(0, sign.color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = g;
    ctx.fillRect(sign.x - w * 0.02, h * 0.72, w * 0.04, h * 0.28);
    ctx.restore();
  }
  // String lights across the top.
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.1);
  ctx.quadraticCurveTo(w * 0.5, h * 0.24, w, h * 0.08);
  ctx.stroke();
  for (let i = 0; i < 14; i++) {
    const t = i / 13;
    const lx = t * w;
    const ly = h * 0.1 * (1 - t) * (1 - t) + h * 0.24 * 2 * (1 - t) * t + h * 0.08 * t * t;
    ctx.fillStyle = pick(rnd, neon);
    ctx.beginPath();
    ctx.arc(lx, ly + 4, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function scenePierDawn(ctx, w, h, rnd) {
  skyGradient(ctx, w, h, [
    [0, '#ffe3b3'],
    [0.4, '#ffb4a2'],
    [0.7, '#c08497'],
    [1, '#6a4c93'],
  ]);
  drawGlowSun(ctx, w * 0.5, h * 0.42, Math.min(w, h) * 0.16, '#fff3b0');
  drawBirds(ctx, rnd, w, h, 5, '#5b2a52');
  // Sea.
  const sea = ctx.createLinearGradient(0, h * 0.55, 0, h);
  sea.addColorStop(0, '#a8dadc');
  sea.addColorStop(1, '#2e5f7a');
  ctx.fillStyle = sea;
  ctx.fillRect(0, h * 0.55, w, h * 0.45);
  drawSunGlitter(ctx, w * 0.5, h * 0.56, h * 0.95, w, '#fff3b0');
  // Pier in perspective from the lower-left.
  ctx.save();
  ctx.fillStyle = '#4a2c2a';
  ctx.beginPath();
  ctx.moveTo(w * 0.08, h);
  ctx.lineTo(w * 0.42, h * 0.62);
  ctx.lineTo(w * 0.56, h * 0.62);
  ctx.lineTo(w * 0.34, h);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#2e1a18';
  ctx.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const y = h - (h - h * 0.62) * t;
    const left = w * 0.08 + (w * 0.42 - w * 0.08) * t;
    const right = w * 0.34 + (w * 0.56 - w * 0.34) * t;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();
  }
  // Posts.
  ctx.fillStyle = '#3a2120';
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    const y = h - (h - h * 0.62) * t;
    const left = w * 0.08 + (w * 0.42 - w * 0.08) * t;
    const postH = h * 0.09 * (1 - t * 0.5);
    ctx.fillRect(left - 3, y - postH, 6, postH);
  }
  ctx.restore();
}

function scenePalmAlley(ctx, w, h, rnd) {
  skyGradient(ctx, w, h, [
    [0, '#ffcf71'],
    [0.5, '#ff9a5a'],
    [0.8, '#e95d8a'],
    [1, '#8c3b6e'],
  ]);
  drawGlowSun(ctx, w * 0.5, h * 0.3, Math.min(w, h) * 0.14, '#fff7ae');
  // Mountains at the horizon.
  ctx.fillStyle = '#5b2a68';
  ctx.beginPath();
  ctx.moveTo(0, h * 0.58);
  ctx.lineTo(w * 0.18, h * 0.44);
  ctx.lineTo(w * 0.36, h * 0.56);
  ctx.lineTo(w * 0.58, h * 0.42);
  ctx.lineTo(w * 0.78, h * 0.55);
  ctx.lineTo(w, h * 0.46);
  ctx.lineTo(w, h * 0.58);
  ctx.closePath();
  ctx.fill();
  // Ground.
  const ground = ctx.createLinearGradient(0, h * 0.58, 0, h);
  ground.addColorStop(0, '#3d2b52');
  ground.addColorStop(1, '#241536');
  ctx.fillStyle = ground;
  ctx.fillRect(0, h * 0.58, w, h * 0.42);
  // Road.
  ctx.fillStyle = '#1d0f2e';
  ctx.beginPath();
  ctx.moveTo(w * 0.42, h * 0.58);
  ctx.lineTo(w * 0.58, h * 0.58);
  ctx.lineTo(w * 0.72, h);
  ctx.lineTo(w * 0.28, h);
  ctx.closePath();
  ctx.fill();
  // Centre dashes, growing toward the viewer.
  ctx.fillStyle = '#ffd319';
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const y = h * 0.6 + (h * 0.38) * t * t;
    const dashW = w * (0.006 + t * 0.012);
    const dashH = h * (0.012 + t * 0.03);
    ctx.fillRect(w * 0.5 - dashW / 2, y, dashW, dashH);
  }
  // Palm rows shrinking toward the horizon.
  for (let i = 0; i < 3; i++) {
    const t = i / 2;
    const s = h * (0.34 - t * 0.22);
    drawPalm(ctx, w * (0.12 + t * 0.26), h * (0.98 - t * 0.36), s, 0.22, '#1c1030');
    drawPalm(ctx, w * (0.88 - t * 0.26), h * (0.98 - t * 0.36), s, -0.22, '#1c1030');
  }
}

function sceneDesertRoad(ctx, w, h, rnd) {
  skyGradient(ctx, w, h, [
    [0, '#2b1055'],
    [0.45, '#b13a7a'],
    [0.75, '#ff9e4f'],
    [1, '#ffd319'],
  ]);
  drawStripedSun(ctx, w * 0.5, h * 0.42, Math.min(w, h) * 0.22, '#fff3b0', '#ff7518');
  // Mesas.
  ctx.fillStyle = '#4a1e52';
  const mesas = [
    [0.02, 0.52, 0.26, 0.12],
    [0.62, 0.5, 0.3, 0.14],
    [0.34, 0.56, 0.2, 0.08],
  ];
  for (const [mx, my, mw, mh] of mesas) {
    ctx.beginPath();
    ctx.moveTo(w * mx, h * (my + mh));
    ctx.lineTo(w * mx, h * my);
    ctx.lineTo(w * (mx + mw * 0.15), h * (my - 0.03));
    ctx.lineTo(w * (mx + mw * 0.85), h * (my - 0.03));
    ctx.lineTo(w * (mx + mw), h * my);
    ctx.lineTo(w * (mx + mw), h * (my + mh));
    ctx.closePath();
    ctx.fill();
  }
  // Desert floor.
  const floor = ctx.createLinearGradient(0, h * 0.62, 0, h);
  floor.addColorStop(0, '#7a3b4d');
  floor.addColorStop(1, '#3d1a33');
  ctx.fillStyle = floor;
  ctx.fillRect(0, h * 0.62, w, h * 0.38);
  // Road.
  ctx.fillStyle = '#1d0f2e';
  ctx.beginPath();
  ctx.moveTo(w * 0.44, h * 0.62);
  ctx.lineTo(w * 0.56, h * 0.62);
  ctx.lineTo(w * 0.7, h);
  ctx.lineTo(w * 0.3, h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffd319';
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    const y = h * 0.64 + (h * 0.34) * t * t;
    ctx.fillRect(w * 0.5 - w * 0.006, y, w * 0.012, h * (0.015 + t * 0.03));
  }
  // Cacti silhouettes: a trunk with proper saguaro arms (a short horizontal
  // connector, then a vertical riser) so they read as cacti, not crosses.
  ctx.fillStyle = '#241536';
  const drawCactus = (px, py, sh) => {
    roundRect(ctx, px - sh * 0.09, py - sh, sh * 0.18, sh, sh * 0.09);
    ctx.fill();
    // Left arm.
    roundRect(ctx, px - sh * 0.34, py - sh * 0.62, sh * 0.28, sh * 0.1, sh * 0.05);
    ctx.fill();
    roundRect(ctx, px - sh * 0.42, py - sh * 0.92, sh * 0.16, sh * 0.34, sh * 0.08);
    ctx.fill();
    // Right arm.
    roundRect(ctx, px + sh * 0.06, py - sh * 0.5, sh * 0.28, sh * 0.1, sh * 0.05);
    ctx.fill();
    roundRect(ctx, px + sh * 0.26, py - sh * 0.78, sh * 0.16, sh * 0.32, sh * 0.08);
    ctx.fill();
  };
  drawCactus(w * 0.14, h * 0.86, h * 0.16);
  drawCactus(w * 0.84, h * 0.82, h * 0.13);
  drawCactus(w * 0.24, h * 0.72, h * 0.08);
  drawBirds(ctx, rnd, w, h, 3, '#2a1245');
}

const SCENE_DRAWERS = {
  'sunset-beach': sceneSunsetBeach,
  'city-dusk': sceneCityDusk,
  'neon-street': sceneNeonStreet,
  'pier-dawn': scenePierDawn,
  'palm-alley': scenePalmAlley,
  'desert-road': sceneDesertRoad,
};

// Draw one procedural scene into ctx (which already covers w x h).
export function drawScene(ctx, w, h, seed, kind) {
  const drawer = SCENE_DRAWERS[kind] ?? SCENE_DRAWERS['sunset-beach'];
  const rnd = mulberry32(seed);
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  drawer(ctx, w, h, rnd);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Colour grades (applied as composite overlays on a finished panel)
// ---------------------------------------------------------------------------

export const GRADES = {
  vice: { name: 'Vice Sunset', hint: 'Magenta dusk, warm gold' },
  neon: { name: 'Neon Night', hint: 'Teal shadows, hot pink' },
  gold: { name: 'Golden Hour', hint: 'Honey light, soft contrast' },
  noir: { name: 'Noir Pink', hint: 'Black & white, pink accent' },
  miami: { name: 'Miami Pastel', hint: 'Bubblegum & seafoam' },
};

export const GRADE_IDS = Object.keys(GRADES);

function overlayGradient(ctx, w, h, stops, mode, vertical = true) {
  ctx.save();
  ctx.globalCompositeOperation = mode;
  const g = vertical
    ? ctx.createLinearGradient(0, 0, 0, h)
    : ctx.createLinearGradient(0, 0, w, 0);
  for (const [at, color] of stops) g.addColorStop(at, color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function overlaySolid(ctx, w, h, color, mode, alpha) {
  ctx.save();
  ctx.globalCompositeOperation = mode;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

// Apply a grade to a panel canvas that already holds an image or scene.
export function applyGrade(ctx, w, h, grade) {
  switch (grade) {
    case 'vice':
      overlayGradient(ctx, w, h, [
        [0, 'rgba(255,41,117,0.42)'],
        [0.55, 'rgba(255,41,117,0.10)'],
        [1, 'rgba(255,179,71,0.38)'],
      ], 'overlay');
      overlaySolid(ctx, w, h, '#ff8c42', 'soft-light', 0.35);
      break;
    case 'neon':
      overlayGradient(ctx, w, h, [
        [0, 'rgba(0,229,255,0.34)'],
        [0.5, 'rgba(0,229,255,0.05)'],
        [1, 'rgba(255,41,117,0.40)'],
      ], 'overlay');
      overlaySolid(ctx, w, h, '#0b1035', 'multiply', 0.28);
      break;
    case 'gold':
      overlaySolid(ctx, w, h, '#ffb347', 'soft-light', 0.5);
      overlayGradient(ctx, w, h, [
        [0, 'rgba(255,211,25,0.20)'],
        [1, 'rgba(123,45,139,0.20)'],
      ], 'overlay');
      break;
    case 'noir':
      overlayGradient(ctx, w, h, [
        [0, 'rgba(255,255,255,0.10)'],
        [1, 'rgba(255,41,117,0.16)'],
      ], 'overlay');
      break;
    case 'miami':
      overlayGradient(ctx, w, h, [
        [0, 'rgba(255,158,203,0.38)'],
        [1, 'rgba(126,240,224,0.32)'],
      ], 'soft-light');
      overlaySolid(ctx, w, h, '#ffffff', 'screen', 0.08);
      break;
    default:
      break;
  }
}

// ---------------------------------------------------------------------------
// Retro textures and decorations
// ---------------------------------------------------------------------------

let grainTile = null;

function getGrainTile() {
  if (grainTile) return grainTile;
  const tile = document.createElement('canvas');
  tile.width = 256;
  tile.height = 256;
  const g = tile.getContext('2d');
  const img = g.createImageData(256, 256);
  const rnd = mulberry32(20261120);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rnd() * 255);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  grainTile = tile;
  return tile;
}

export function applyGrain(ctx, w, h, alpha = 0.08) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = ctx.createPattern(getGrainTile(), 'repeat');
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

export function applyVignette(ctx, w, h, strength = 0.32) {
  ctx.save();
  const g = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.42,
    w / 2, h / 2, Math.max(w, h) * 0.72,
  );
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(5,2,12,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

let scanTile = null;

export function applyScanlines(ctx, w, h, alpha = 0.1) {
  if (!scanTile) {
    scanTile = document.createElement('canvas');
    scanTile.width = 4;
    scanTile.height = 4;
    const g = scanTile.getContext('2d');
    g.fillStyle = 'rgba(0,0,0,1)';
    g.fillRect(0, 3, 4, 1);
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = ctx.createPattern(scanTile, 'repeat');
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

// Halftone dots whose radius ramps across a rectangle.
export function drawHalftone(ctx, x, y, w, h, color, maxR = 7, gap = 16) {
  ctx.save();
  ctx.fillStyle = color;
  for (let row = 0; row * gap < h; row++) {
    for (let col = 0; col * gap < w; col++) {
      const px = x + col * gap + (row % 2 ? gap / 2 : 0);
      const py = y + row * gap;
      const t = 1 - (px - x) / Math.max(1, w);
      const r = Math.max(0.6, maxR * t * (0.6 + 0.4 * Math.sin(row * 0.7)));
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// Synthwave floor: perspective lines running to a vanishing point.
export function drawNeonGrid(ctx, w, h, horizonY, color = '#ff2975') {
  ctx.save();
  const floor = ctx.createLinearGradient(0, horizonY, 0, h);
  floor.addColorStop(0, '#160b2e');
  floor.addColorStop(1, '#05030d');
  ctx.fillStyle = floor;
  ctx.fillRect(0, horizonY, w, h - horizonY);
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 6;
  ctx.lineWidth = 1.5;
  const vpx = w / 2;
  for (let i = -10; i <= 10; i++) {
    ctx.beginPath();
    ctx.moveTo(vpx + i * (w * 0.012), horizonY);
    ctx.lineTo(vpx + i * (w * 0.16), h);
    ctx.stroke();
  }
  let y = horizonY;
  let step = (h - horizonY) * 0.04;
  ctx.globalAlpha = 0.9;
  while (y < h) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
    y += step;
    step *= 1.45;
  }
  ctx.restore();
}

// Five-point star path (GTA-style wanted star).
export function starPath(ctx, cx, cy, rOuter, rInner = 0.45) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? rOuter : rOuter * rInner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

export function drawStar(ctx, cx, cy, r, color) {
  ctx.save();
  ctx.fillStyle = color;
  starPath(ctx, cx, cy, r);
  ctx.fill();
  ctx.restore();
}

// Spiky starburst sticker shape.
export function starburstPath(ctx, cx, cy, rOuter, rInner, points = 12) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

// Rounded-rectangle path helper (works everywhere, no roundRect dependency).
export function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.arcTo(x + w, y, x + w, y + radius, radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
  ctx.lineTo(x + radius, y + h);
  ctx.arcTo(x, y + h, x, y + h - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}
