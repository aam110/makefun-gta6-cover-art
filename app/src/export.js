// Midnight Mile — frozen-frame PNG export.
// Renders the exact cover state to a canvas at 1920x1080, 1080x1080 or
// 1080x1350: photographic panels, chrome title, script subtitle, role tags,
// press quote, gold seal, barcode, tagline, palm strip and billing block.

import { GRADES, LAYOUTS, LAYOUT_PANELS } from './cover.js';

const imageCache = new Map();
function loadImage(src) {
  if (imageCache.has(src)) return imageCache.get(src);
  const p = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
  imageCache.set(src, p);
  return p;
}

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function ensureFonts() {
  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('80px Pacifico'),
      document.fonts.load('700 20px "Segoe UI"'),
      document.fonts.ready,
    ]);
  } catch { /* system fonts fall back */ }
}

// Draw an image covering rect (x, y, w, h) with focus point (px, py 0..1)
// and zoom. Portraits default to the upper third (face-aware heuristic).
function drawCoverFit(g, img, x, y, w, h, px, py, zoom) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(w / iw, h / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = x + (w - dw) * px;
  const dy = y + (h - dh) * py;
  g.drawImage(img, dx, dy, dw, dh);
}

function drawPalm(g, x, y, s, color) {
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  g.strokeStyle = color;
  g.fillStyle = color;
  g.lineWidth = 5;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(0, 0);
  g.quadraticCurveTo(6, -34, -4, -62);
  g.stroke();
  for (let i = 0; i < 6; i++) {
    const a = (-150 + i * 36) * Math.PI / 180;
    const ex = -4 + Math.cos(a) * 34;
    const ey = -62 + Math.sin(a) * 30 + 12;
    const mx = -4 + Math.cos(a) * 20;
    const my = -62 + Math.sin(a) * 22 - 8;
    g.beginPath();
    g.moveTo(-4, -62);
    g.quadraticCurveTo(mx, my, ex, ey);
    g.lineWidth = 4;
    g.stroke();
  }
  g.restore();
}

function drawStarburst(g, cx, cy, r, points, color, edge) {
  g.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? r : r * 0.82;
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.closePath();
  g.fillStyle = color;
  g.fill();
  g.lineWidth = Math.max(2, r * 0.04);
  g.strokeStyle = edge;
  g.stroke();
}

function drawBarcode(g, x, y, w, h, seed) {
  const rng = mulberry32(seed);
  g.fillStyle = '#ffffff';
  g.fillRect(x, y, w, h);
  g.fillStyle = '#000000';
  let bx = x + 3;
  while (bx < x + w - 4) {
    const bw = 1 + Math.floor(rng() * 4);
    if (rng() < 0.62) g.fillRect(bx, y + 2, bw, h - 4);
    bx += bw + 1 + Math.floor(rng() * 3);
  }
}

function drawChromeTitle(g, text, cx, cy, maxWidth, baseSize) {
  let size = baseSize;
  g.font = size + 'px Anton, sans-serif';
  while (g.measureText(text).width > maxWidth && size > 20) {
    size *= 0.94;
    g.font = size + 'px Anton, sans-serif';
  }
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  // 3D extrusion: stacked dark copies below the face.
  const step = size * 0.045;
  for (let i = 7; i >= 1; i--) {
    g.fillStyle = i > 3 ? '#2a0a4a' : '#1a0533';
    g.fillText(text, cx, cy + step * i);
  }
  // Striped chrome gradient: yellow -> orange -> pink -> purple bands.
  const grad = g.createLinearGradient(0, cy - size * 0.55, 0, cy + size * 0.55);
  grad.addColorStop(0.0, '#fff7ae');
  grad.addColorStop(0.16, '#fff7ae');
  grad.addColorStop(0.17, '#ffd23f');
  grad.addColorStop(0.32, '#ffd23f');
  grad.addColorStop(0.33, '#ff7a18');
  grad.addColorStop(0.48, '#ff7a18');
  grad.addColorStop(0.49, '#ff2e88');
  grad.addColorStop(0.64, '#ff2e88');
  grad.addColorStop(0.65, '#b537f2');
  grad.addColorStop(0.80, '#b537f2');
  grad.addColorStop(0.81, '#7b2ff7');
  grad.addColorStop(1.0, '#7b2ff7');
  g.lineWidth = Math.max(2, size * 0.045);
  g.strokeStyle = '#1a0533';
  g.strokeText(text, cx, cy);
  g.fillStyle = grad;
  g.fillText(text, cx, cy);
  // Sheen diagonal highlight.
  g.save();
  g.globalCompositeOperation = 'source-atop';
  g.globalAlpha = 0.0;
  g.restore();
  return size;
}

function fitText(g, text, maxW) {
  if (g.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 4 && g.measureText(t + '…').width > maxW) t = t.slice(0, -1);
  return t + '…';
}

function drawRoleTag(g, p, x, yBottom, maxW, unit) {
  const padX = unit * 0.9;
  g.font = Math.round(unit * 1.5) + 'px Anton, sans-serif';
  const role = fitText(g, p.role, maxW - padX * 2 - unit * 1.2);
  const roleW = g.measureText(role).width;
  g.font = '700 ' + Math.round(unit * 0.85) + 'px "Segoe UI", sans-serif';
  const sub = fitText(g, p.loc + ' · ' + p.time + ' · ' + p.quip, maxW - padX * 2 - unit * 1.2);
  const subW = g.measureText(sub).width;
  const w = Math.max(roleW, subW) + padX * 2 + unit * 1.2;
  const h = unit * 3.4;
  const y = yBottom - h;
  g.fillStyle = 'rgba(10,2,25,.92)';
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x + w, y);
  g.lineTo(x + w - unit * 1.1, y + h);
  g.lineTo(x, y + h);
  g.closePath();
  g.fill();
  g.fillStyle = '#ff2e88';
  g.fillRect(x, y, unit * 0.32, h);
  g.fillStyle = '#ffffff';
  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
  g.font = Math.round(unit * 1.5) + 'px Anton, sans-serif';
  g.fillText(role, x + padX + unit * 0.3, y + unit * 1.75);
  g.fillStyle = '#ffd23f';
  g.font = '700 ' + Math.round(unit * 0.85) + 'px "Segoe UI", sans-serif';
  g.fillText(sub, x + padX + unit * 0.3, y + unit * 2.95);
}

async function renderFlat(state, W, H) {
  await ensureFonts();
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d');
  const unit = W / 100; // 1% of width
  const grade = GRADES[state.grade];

  // Backdrop.
  g.fillStyle = '#160a24';
  g.fillRect(0, 0, W, H);

  // Sunset backdrop visible through tilted-layout gaps.
  if (state.layout === 'tilted') {
    const sky = g.createLinearGradient(0, H * 0.07, 0, H * 0.83);
    sky.addColorStop(0, '#2a0f4a');
    sky.addColorStop(0.5, '#7a1e5e');
    sky.addColorStop(0.8, '#ff7a18');
    sky.addColorStop(1, '#ff2e88');
    g.fillStyle = sky;
    g.fillRect(0, H * 0.07, W, H * 0.76);
    g.fillStyle = 'rgba(255,220,140,.9)';
    g.beginPath();
    g.arc(W * 0.5, H * 0.55, W * 0.055, 0, Math.PI * 2);
    g.fill();
  }

  // Top bar: press quote + stars + volume badge.
  const topH = H * 0.075;
  g.fillStyle = '#1d0b33';
  g.fillRect(0, 0, W, topH);
  g.fillStyle = 'rgba(255,210,63,.35)';
  g.fillRect(0, topH - 1, W, 1);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const qSize = Math.round(unit * 1.5);
  g.font = '800 ' + qSize + 'px "Segoe UI", sans-serif';
  const quote = '★★★★★  “' + state.quote + '”';
  g.fillStyle = '#ffd23f';
  const qW = g.measureText(quote).width;
  g.fillText(quote, W / 2 - unit * 6, topH / 2);
  g.font = '700 ' + Math.round(qSize * 0.8) + 'px "Segoe UI", sans-serif';
  g.fillStyle = '#ffd23f';
  g.textAlign = 'left';
  g.fillText('— ' + state.quoteSource, W / 2 - unit * 6 + qW / 2 + unit, topH / 2);
  // Volume badge.
  g.textAlign = 'center';
  g.font = Math.round(unit * 1.6) + 'px Anton, sans-serif';
  const volW = g.measureText(state.volume).width + unit * 2.2;
  const volH = topH * 0.62;
  const volX = W - volW - unit * 2;
  g.save();
  g.translate(volX + volW / 2, topH / 2);
  g.rotate(0.03);
  g.fillStyle = '#b8860b';
  g.fillRect(-volW / 2, -volH / 2 + 3, volW, volH);
  g.fillStyle = '#ffd23f';
  g.fillRect(-volW / 2, -volH / 2, volW, volH);
  g.fillStyle = '#241040';
  g.fillText(state.volume, 0, 1);
  g.restore();

  // Panels.
  const layout = LAYOUTS[state.layout];
  const picks = LAYOUT_PANELS[state.layout];
  const images = await Promise.all(picks.map((i) => loadImage(state.panels[i].img)));
  for (let s = 0; s < picks.length; s++) {
    const p = state.panels[picks[s]];
    const r = layout.slots[s];
    const x = r.x * W, y = r.y * H, w = r.w * W, h = r.h * H;
    const img = images[s];
    g.save();
    if (r.rot) {
      g.translate(x + w / 2, y + h / 2);
      g.rotate(r.rot * Math.PI / 180);
      g.translate(-(x + w / 2), -(y + h / 2));
    }
    g.shadowColor = 'rgba(0,0,0,.55)';
    g.shadowBlur = unit * 1.4;
    g.shadowOffsetY = unit * 0.6;
    g.beginPath();
    g.rect(x, y, w, h);
    g.fillStyle = '#241040';
    g.fill();
    g.shadowColor = 'transparent';
    g.save();
    g.beginPath();
    g.rect(x, y, w, h);
    g.clip();
    g.filter = grade.filter;
    drawCoverFit(g, img, x, y, w, h, p.px, p.py, p.zoom);
    g.filter = 'none';
    // Grade tint + rim light + bottom shade.
    const tint = g.createLinearGradient(0, y, 0, y + h);
    tint.addColorStop(0, grade.tint[0]);
    tint.addColorStop(1, grade.tint[1]);
    g.globalCompositeOperation = 'overlay';
    g.fillStyle = tint;
    g.fillRect(x, y, w, h);
    g.globalCompositeOperation = 'source-over';
    const shade = g.createLinearGradient(0, y + h * 0.6, 0, y + h);
    shade.addColorStop(0, 'rgba(10,2,25,0)');
    shade.addColorStop(1, 'rgba(10,2,25,.55)');
    g.fillStyle = shade;
    g.fillRect(x, y, w, h);
    g.fillStyle = 'rgba(255,255,255,.28)';
    g.fillRect(x, y, w, 2);
    g.restore();
    // Gold frame.
    g.lineWidth = Math.max(2, unit * 0.22);
    g.strokeStyle = 'rgba(255,210,63,.9)';
    g.strokeRect(x, y, w, h);
    // HEAT pill.
    if (p.heat) {
      const pill = 'HEAT ★★★★☆';
      g.font = '800 ' + Math.round(unit * 1.05) + 'px "Segoe UI", sans-serif';
      const pw = g.measureText(pill).width + unit * 2;
      const ph = unit * 2.2;
      const px = x + w - pw - unit * 0.7;
      const py = y + unit * 0.7;
      g.fillStyle = '#12041f';
      g.beginPath();
      g.roundRect(px, py, pw, ph, ph / 2);
      g.fill();
      g.lineWidth = 1.5;
      g.strokeStyle = '#ffd23f';
      g.stroke();
      g.fillStyle = '#ffd23f';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(pill, px + pw / 2, py + ph / 2 + 1);
    }
    drawRoleTag(g, p, x, y + h, w, unit);
    g.restore();
  }

  // Chrome title + pink neon script subtitle, floating over the panels
  // but clear of the bottom-row role tags.
  const titleY = H * 0.60;
  const titleSize = drawChromeTitle(g, state.title, W / 2, titleY, W * 0.94, W * 0.105);
  g.save();
  g.translate(W * 0.62, titleY + titleSize * 0.68);
  g.rotate(-0.07);
  g.font = Math.round(W * 0.044) + 'px Pacifico, cursive';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = '#ff2e88';
  g.shadowBlur = unit * 2.2;
  g.fillStyle = '#ff5da2';
  g.fillText(state.subtitle, 0, 0);
  g.shadowBlur = unit * 4;
  g.fillText(state.subtitle, 0, 0);
  g.restore();

  // Tagline strip.
  const tagY = H * 0.825;
  const tagH = H * 0.05;
  g.fillStyle = '#0a0218';
  g.fillRect(0, tagY, W, tagH);
  g.fillStyle = 'rgba(255,210,63,.5)';
  g.fillRect(0, tagY, W, 1);
  g.fillRect(0, tagY + tagH - 1, W, 1);
  g.fillStyle = '#ffe9f4';
  g.font = '800 ' + Math.round(unit * 1.5) + 'px "Segoe UI", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(state.tagline, W / 2, tagY + tagH / 2);

  // Palm strip: sunset band with palm silhouettes + a retro striped sun.
  const palmY = tagY + tagH;
  const palmH = H * 0.075;
  const palmGrad = g.createLinearGradient(0, palmY, 0, palmY + palmH);
  palmGrad.addColorStop(0, '#ff7a18');
  palmGrad.addColorStop(0.55, '#ff2e88');
  palmGrad.addColorStop(1, '#7b2ff7');
  g.fillStyle = palmGrad;
  g.fillRect(0, palmY, W, palmH);
  // Retro sun: warm gradient disc with horizontal slits, clipped to the band.
  const sunR = palmH * 0.44;
  const sunCx = W * 0.5;
  const sunCy = palmY + palmH * 0.56;
  g.save();
  g.beginPath();
  g.rect(0, palmY, W, palmH);
  g.clip();
  const sunGrad = g.createLinearGradient(0, sunCy - sunR, 0, sunCy + sunR);
  sunGrad.addColorStop(0, '#ffe9a8');
  sunGrad.addColorStop(1, '#ff9a3d');
  g.fillStyle = sunGrad;
  g.beginPath();
  g.arc(sunCx, sunCy, sunR, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#ff2e88';
  for (let i = 0; i < 3; i++) {
    const sy = sunCy + sunR * (0.05 + i * 0.28);
    g.fillRect(sunCx - sunR, sy, sunR * 2, sunR * (0.08 + i * 0.05));
  }
  const palmXs = [0.04, 0.13, 0.24, 0.72, 0.83, 0.94];
  for (const fx of palmXs) drawPalm(g, fx * W, palmY + palmH, palmH / 95, '#160a24');
  g.restore();

  // Bottom bar: COMING SOON / billing / barcode.
  const botY = palmY + palmH;
  const botH = H - botY;
  g.fillStyle = '#0a0218';
  g.fillRect(0, botY, W, botH);
  g.textBaseline = 'middle';
  if (state.showComing) {
    g.fillStyle = '#ff5da2';
    g.font = '800 ' + Math.round(unit * 1.25) + 'px "Segoe UI", sans-serif';
    g.textAlign = 'left';
    g.shadowColor = '#ff2e88';
    g.shadowBlur = unit * 1.2;
    g.fillText('COMING SOON', unit * 2, botY + botH / 2);
    g.shadowBlur = 0;
  }
  g.fillStyle = '#d9c8f5';
  g.font = '400 ' + Math.round(unit * 0.95) + 'px "Segoe UI", sans-serif';
  g.textAlign = 'center';
  g.fillText(state.billing, W / 2, botY + botH / 2);
  if (state.showBarcode) {
    const bw = unit * 7.4;
    const bh = botH * 0.44;
    drawBarcode(g, W - bw - unit * 2, botY + botH * 0.08, bw, bh, 122620);
    g.fillStyle = '#ffffff';
    g.font = Math.round(unit * 0.72) + 'px "Segoe UI", sans-serif';
    g.textAlign = 'right';
    g.fillText('002113  122620', W - unit * 2, botY + botH * 0.78);
  }

  // Gold seal.
  if (state.showSeal) {
    const sr = W * 0.046;
    const sx = W * 0.935;
    const sy = H * 0.755;
    g.save();
    g.shadowColor = 'rgba(0,0,0,.6)';
    g.shadowBlur = unit * 1.4;
    g.shadowOffsetY = unit * 0.5;
    drawStarburst(g, sx, sy, sr, 14, '#ffd23f', '#b8860b');
    g.restore();
    g.beginPath();
    g.arc(sx, sy, sr * 0.68, 0, Math.PI * 2);
    g.setLineDash([4, 3]);
    g.lineWidth = 2;
    g.strokeStyle = '#b8860b';
    g.stroke();
    g.setLineDash([]);
    g.fillStyle = '#4a2c00';
    g.textAlign = 'center';
    g.font = Math.round(sr * 0.30) + 'px Anton, sans-serif';
    g.fillText('ORIGINAL', sx, sy - sr * 0.16);
    g.fillText('COVER ART', sx, sy + sr * 0.20);
    g.fillStyle = '#b8860b';
    g.font = Math.round(sr * 0.22) + 'px "Segoe UI", sans-serif';
    g.fillText('★ ★ ★', sx, sy + sr * 0.48);
  }

  // Film grain (deterministic, frozen for export).
  const rng = mulberry32(424242);
  g.globalAlpha = 0.05;
  for (let i = 0; i < 2600; i++) {
    const v = rng() < 0.5 ? 0 : 255;
    g.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')';
    g.fillRect(rng() * W, rng() * H, 1.6, 1.6);
  }
  g.globalAlpha = 1;
  return canvas;
}

// Turntable export: the flat cover drawn with a perspective skew over a
// dark studio backdrop, with a floor reflection.
async function renderTurntable(state, W, H) {
  const flat = await renderFlat({ ...state, layout: 'hero' }, W, H);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d');
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0a0218');
  bg.addColorStop(0.55, '#241040');
  bg.addColorStop(1, '#12041f');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  // Floor glow.
  const glow = g.createRadialGradient(W / 2, H * 0.86, 10, W / 2, H * 0.86, W * 0.5);
  glow.addColorStop(0, 'rgba(255,46,136,.35)');
  glow.addColorStop(1, 'rgba(255,46,136,0)');
  g.fillStyle = glow;
  g.fillRect(0, H * 0.6, W, H * 0.4);
  // Shadow + skewed cover.
  g.save();
  g.translate(W / 2, H * 0.44);
  g.transform(0.86, 0.10, -0.06, 0.9, 0, 0);
  g.shadowColor = 'rgba(0,0,0,.8)';
  g.shadowBlur = W * 0.04;
  g.shadowOffsetY = H * 0.03;
  g.drawImage(flat, -W * 0.40, -H * 0.38, W * 0.80, H * 0.76);
  g.restore();
  // Floor reflection: a squashed mirror of the cover below the floor line,
  // fading out toward the bottom of the frame.
  const floorY = H * 0.86;
  g.save();
  g.globalAlpha = 0.20;
  g.translate(W / 2, floorY);
  g.transform(0.86, 0, 0, -0.28, 0, 0);
  g.drawImage(flat, -W * 0.40, -H * 0.76, W * 0.80, H * 0.76);
  g.restore();
  const fade = g.createLinearGradient(0, floorY, 0, H);
  fade.addColorStop(0, 'rgba(18,4,31,0)');
  fade.addColorStop(1, 'rgba(18,4,31,0.92)');
  g.fillStyle = fade;
  g.fillRect(0, floorY, W, H - floorY);
  g.fillStyle = 'rgba(255,46,136,.35)';
  g.fillRect(0, floorY, W, 2);
  return canvas;
}

export async function renderCover(state) {
  const [W, H] = state.size.split('x').map(Number);
  if (state.layout === 'turntable') return renderTurntable(state, W, H);
  return renderFlat(state, W, H);
}

export function canvasToBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}
