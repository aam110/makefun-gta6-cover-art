// VICE HEAT — cover render engine.
// Draws a multi-panel, GTA-style poster onto any canvas: photos in panels,
// a colour grade, hand-drawn decorations (retro sun, palms, skyline) and
// big bold caption lettering. Pure vanilla canvas, no library, no network.

export const SIZES = {
  square: { label: '1080 x 1080', w: 1080, h: 1080 },
  portrait: { label: '1080 x 1350', w: 1080, h: 1350 },
  wide: { label: '1920 x 1080', w: 1920, h: 1080 },
};

export const GRADES = {
  sunset: {
    label: 'Sunset Blaze',
    filter: 'saturate(1.65) contrast(1.12) brightness(1.03) sepia(0.22) hue-rotate(-6deg)',
    top: ['rgba(255, 140, 40, 0.34)', 'rgba(255, 46, 136, 0.40)'],
    bottom: 'rgba(43, 10, 74, 0.42)',
    wash: 'rgba(255, 122, 26, 0.20)',
  },
  neon: {
    label: 'Neon Nights',
    filter: 'saturate(1.7) contrast(1.16) brightness(0.96) hue-rotate(-12deg)',
    top: ['rgba(34, 211, 238, 0.34)', 'rgba(192, 38, 211, 0.42)'],
    bottom: 'rgba(6, 8, 40, 0.48)',
    wash: 'rgba(34, 211, 238, 0.16)',
  },
  gold: {
    label: 'Golden Hour',
    filter: 'saturate(1.4) contrast(1.08) brightness(1.08) sepia(0.42)',
    top: ['rgba(255, 196, 66, 0.36)', 'rgba(255, 120, 40, 0.32)'],
    bottom: 'rgba(60, 22, 4, 0.38)',
    wash: 'rgba(255, 176, 32, 0.20)',
  },
  clean: {
    label: 'Clean',
    filter: 'saturate(1.12) contrast(1.05)',
    top: ['rgba(255, 255, 255, 0.00)', 'rgba(0, 0, 0, 0.00)'],
    bottom: 'rgba(0, 0, 0, 0.00)',
    wash: 'rgba(0, 0, 0, 0)',
  },
};

export const CAPTION_STYLES = {
  block: { label: 'Blockbuster', fill: '#ffffff', outline: '#12041f', shadow: '#ff2e88', shadow2: '#22d3ee' },
  neon: { label: 'Neon Glow', fill: '#fff7ff', outline: '#2b0a4a', shadow: '#ff2e88', shadow2: '#7c3aed' },
  sunset: { label: 'Sunset Fade', fill: '#fff3c4', outline: '#3b0a1e', shadow: '#ff7a1a', shadow2: '#ff2e88' },
};

// Layouts: each returns panel rects in pixels for a canvas of W x H.
// gap is the dark gutter between panels, in pixels.
export const LAYOUTS = {
  hero: {
    label: 'Hero Split',
    panels(W, H, gap) {
      const m = Math.round(Math.min(W, H) * 0.028);
      const innerW = W - m * 2;
      const innerH = H - m * 2;
      if (W >= H) {
        const heroW = Math.round(innerW * 0.64);
        const sideW = innerW - heroW - gap;
        const sideH = Math.round((innerH - gap) / 2);
        return [
          { x: m, y: m, w: heroW, h: innerH },
          { x: m + heroW + gap, y: m, w: sideW, h: sideH },
          { x: m + heroW + gap, y: m + sideH + gap, w: sideW, h: innerH - sideH - gap },
        ];
      }
      const heroH = Math.round(innerH * 0.62);
      const rowH = innerH - heroH - gap;
      const colW = Math.round((innerW - gap) / 2);
      return [
        { x: m, y: m, w: innerW, h: heroH },
        { x: m, y: m + heroH + gap, w: colW, h: rowH },
        { x: m + colW + gap, y: m + heroH + gap, w: innerW - colW - gap, h: rowH },
      ];
    },
  },
  quad: {
    label: 'Four Corners',
    panels(W, H, gap) {
      const m = Math.round(Math.min(W, H) * 0.028);
      const innerW = W - m * 2;
      const innerH = H - m * 2;
      const cw = Math.round((innerW - gap) / 2);
      const ch = Math.round((innerH - gap) / 2);
      return [
        { x: m, y: m, w: cw, h: ch },
        { x: m + cw + gap, y: m, w: innerW - cw - gap, h: ch },
        { x: m, y: m + ch + gap, w: cw, h: innerH - ch - gap },
        { x: m + cw + gap, y: m + ch + gap, w: innerW - cw - gap, h: innerH - ch - gap },
      ];
    },
  },
  triptych: {
    label: 'Triptych',
    panels(W, H, gap) {
      const m = Math.round(Math.min(W, H) * 0.028);
      const innerW = W - m * 2;
      const innerH = H - m * 2;
      if (W >= H) {
        const cw = Math.round((innerW - gap * 2) / 3);
        return [
          { x: m, y: m, w: cw, h: innerH },
          { x: m + cw + gap, y: m, w: cw, h: innerH },
          { x: m + (cw + gap) * 2, y: m, w: innerW - (cw + gap) * 2, h: innerH },
        ];
      }
      const ch = Math.round((innerH - gap * 2) / 3);
      return [
        { x: m, y: m, w: innerW, h: ch },
        { x: m, y: m + ch + gap, w: innerW, h: ch },
        { x: m, y: m + (ch + gap) * 2, w: innerW, h: innerH - (ch + gap) * 2 },
      ];
    },
  },
  poster: {
    label: 'Full Poster',
    panels(W, H) {
      const m = Math.round(Math.min(W, H) * 0.028);
      return [{ x: m, y: m, w: W - m * 2, h: H - m * 2 }];
    },
  },
};

// Tiny deterministic PRNG so decorations never jitter between renders.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function drawPhotoCover(ctx, img, rect, zoom, dx, dy) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const base = Math.max(rect.w / iw, rect.h / ih);
  const scale = base * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  // dx, dy are fractions of the panel: 0 centres the photo, +/-1 pushes it
  // to the far edge of the slack the zoom creates.
  const slackX = Math.max(0, (dw - rect.w) / 2);
  const slackY = Math.max(0, (dh - rect.h) / 2);
  const x = rect.x + (rect.w - dw) / 2 - dx * slackX;
  const y = rect.y + (rect.h - dh) / 2 - dy * slackY;
  ctx.drawImage(img, x, y, dw, dh);
}

function gradePanel(ctx, rect, grade) {
  const g = GRADES[grade] || GRADES.sunset;
  const grad = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  grad.addColorStop(0, g.top[0]);
  grad.addColorStop(0.55, g.top[1]);
  grad.addColorStop(1, g.bottom);
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = grad;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
  // A tinted wash in "color" mode pushes the whole panel toward the grade's
  // palette — this is what makes a daylight photo read as sunset or neon.
  if (g.wash && g.wash !== 'rgba(0, 0, 0, 0)') {
    ctx.save();
    ctx.globalCompositeOperation = 'color';
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = g.wash;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
  }
  // Gentle vignette so panels feel photographic.
  const vx = rect.x + rect.w / 2;
  const vy = rect.y + rect.h / 2;
  const vr = Math.max(rect.w, rect.h) * 0.75;
  const vig = ctx.createRadialGradient(vx, vy, vr * 0.35, vx, vy, vr);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(10,2,24,0.34)');
  ctx.fillStyle = vig;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
}

// A retro striped sun, drawn in code: gradient disc with horizontal cuts.
function drawRetroSun(ctx, cx, cy, r, palette) {
  const grad = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
  grad.addColorStop(0, palette[0]);
  grad.addColorStop(0.55, palette[1]);
  grad.addColorStop(1, palette[2]);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.globalCompositeOperation = 'destination-out';
  let y = cy + r * 0.08;
  let thick = r * 0.045;
  while (y < cy + r) {
    ctx.fillRect(cx - r, y, r * 2, thick);
    y += thick + r * 0.16;
    thick *= 1.55;
  }
  ctx.restore();
}

// One palm silhouette: a leaning trunk and seven arcing fronds.
function drawPalm(ctx, x, y, s, flip, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flip ? -s : s, s);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  // Trunk: a gentle lean to the right.
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(6, -70, 26, -118);
  ctx.stroke();
  // Fronds fan out from the crown.
  const crownX = 26;
  const crownY = -118;
  for (let i = 0; i < 7; i += 1) {
    const a = (-160 + i * 26) * (Math.PI / 180);
    const len = 62 + (i % 3) * 12;
    const tipX = crownX + Math.cos(a) * len;
    const tipY = crownY + Math.sin(a) * len * 0.62 + 26;
    const midX = crownX + Math.cos(a) * len * 0.55;
    const midY = crownY + Math.sin(a) * len * 0.55 - 18;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(crownX, crownY);
    ctx.quadraticCurveTo(midX, midY, tipX, tipY);
    ctx.stroke();
  }
  // Coconuts: two small dots under the crown.
  ctx.beginPath();
  ctx.arc(crownX - 4, crownY + 6, 4, 0, Math.PI * 2);
  ctx.arc(crownX + 6, crownY + 8, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// A low skyline silhouette with a few lit windows, seeded for stability.
function drawSkyline(ctx, x, y, w, h, color, seed) {
  const rnd = mulberry32(seed);
  ctx.save();
  ctx.fillStyle = color;
  let bx = x;
  while (bx < x + w) {
    const bw = w * (0.05 + rnd() * 0.09);
    const bh = h * (0.3 + rnd() * 0.7);
    ctx.fillRect(bx, y + h - bh, bw, bh);
    // Antenna on the tallest towers.
    if (bh > h * 0.8) ctx.fillRect(bx + bw / 2 - 1, y + h - bh - h * 0.14, 2, h * 0.14);
    // A couple of lit windows.
    ctx.fillStyle = 'rgba(255, 214, 120, 0.85)';
    const wy = y + h - bh + h * 0.08 + rnd() * bh * 0.5;
    ctx.fillRect(bx + bw * 0.25, wy, 3, 4);
    ctx.fillRect(bx + bw * 0.6, wy + h * 0.06, 3, 4);
    ctx.fillStyle = color;
    bx += bw + w * 0.012;
  }
  ctx.restore();
}

function drawHalftone(ctx, x, y, w, h, color) {
  ctx.save();
  ctx.fillStyle = color;
  const step = Math.max(10, w / 14);
  for (let row = 0; row * step < h; row += 1) {
    for (let col = 0; col * step < w; col += 1) {
      const fade = 1 - (row / (h / step)) * 0.7 - (col / (w / step)) * 0.3;
      if (fade <= 0.12) continue;
      ctx.globalAlpha = fade * 0.5;
      ctx.beginPath();
      ctx.arc(x + col * step, y + row * step, step * 0.16, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function wrapCaption(ctx, text, maxWidth) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth || !line) line = test;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

function drawCaption(ctx, W, H, state) {
  const text = (state.caption || '').trim();
  if (!text) return;
  const style = CAPTION_STYLES[state.captionStyle] || CAPTION_STYLES.block;
  const u = Math.min(W, H) / 100; // 1% of the short side, the sizing unit.
  const maxWidth = W * 0.9;
  let size = u * 13.5 * (state.captionScale || 1);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const setFont = (px) => { ctx.font = `900 ${px}px "Vice Display", "Vice Text", sans-serif`; };
  setFont(size);
  let lines = wrapCaption(ctx, text.toUpperCase(), maxWidth);
  while (lines.length > 2 && size > u * 4) {
    size *= 0.92;
    setFont(size);
    lines = wrapCaption(ctx, text.toUpperCase(), maxWidth);
  }
  const lineH = size * 1.04;
  const blockH = lines.length * lineH;
  let cy;
  if (state.captionPos === 'top') cy = H * 0.16 + blockH / 2;
  else if (state.captionPos === 'center') cy = H * 0.5;
  else cy = H * 0.86 - blockH / 2;
  const cx = W / 2;

  // Readability scrim behind the lettering.
  const scrim = ctx.createLinearGradient(0, cy - blockH, 0, cy + blockH);
  scrim.addColorStop(0, 'rgba(8, 2, 20, 0)');
  scrim.addColorStop(0.5, 'rgba(8, 2, 20, 0.42)');
  scrim.addColorStop(1, 'rgba(8, 2, 20, 0)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, cy - blockH, W, blockH * 2);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(state.captionStyle === 'block' ? -0.028 : -0.012);
  ctx.translate(-cx, -cy);
  lines.forEach((lineText, i) => {
    const y = cy - blockH / 2 + lineH * (i + 0.5);
    // Chromatic offset copies for a punchy print look.
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    ctx.fillStyle = style.shadow;
    ctx.fillText(lineText, cx + size * 0.055, y + size * 0.055);
    ctx.fillStyle = style.shadow2;
    ctx.fillText(lineText, cx - size * 0.045, y - size * 0.045);
    // Thick dark outline, then the face.
    ctx.lineWidth = size * 0.16;
    ctx.strokeStyle = style.outline;
    ctx.strokeText(lineText, cx, y);
    if (state.captionStyle === 'neon') {
      ctx.shadowColor = style.shadow;
      ctx.shadowBlur = size * 0.35;
    }
    ctx.fillStyle = style.fill;
    ctx.fillText(lineText, cx, y);
    ctx.shadowBlur = 0;
  });
  ctx.restore();

  // Sub-caption: a small pill under (or over) the main lettering.
  const sub = (state.subcaption || '').trim();
  if (sub) {
    const subSize = u * 3.1;
    ctx.font = `700 ${subSize}px "Vice Display", sans-serif`;
    const subW = ctx.measureText(sub.toUpperCase()).width + subSize * 1.6;
    const subY = state.captionPos === 'top'
      ? cy + blockH / 2 + subSize * 1.1
      : cy - blockH / 2 - subSize * 1.1;
    ctx.fillStyle = 'rgba(10, 2, 26, 0.78)';
    ctx.beginPath();
    ctx.roundRect(cx - subW / 2, subY - subSize * 0.85, subW, subSize * 1.7, subSize * 0.85);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = Math.max(1.5, u * 0.18);
    ctx.stroke();
    ctx.fillStyle = '#ffe9f4';
    ctx.fillText(sub.toUpperCase(), cx, subY + subSize * 0.06);
  }
}

// The main render. state:
// { photos: Image[], panels: [{photo, zoom, dx, dy}], layout, grade,
//   caption, subcaption, captionStyle, captionPos, captionScale,
//   decor: { sun: bool, palms: bool, skyline: bool } }
export function renderCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const u = Math.min(W, H) / 100;
  const rects = layoutRects(W, H, state.layout);
  const grade = GRADES[state.grade] || GRADES.sunset;

  // Deep violet backdrop: the gutters and frame.
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#160a2e');
  bg.addColorStop(0.5, '#1d0b33');
  bg.addColorStop(1, '#0d0518');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  rects.forEach((rect, i) => {
    const panel = (state.panels && state.panels[i]) || { photo: 0, zoom: 1, dx: 0, dy: 0 };
    const img = state.photos && state.photos[panel.photo];
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    if (img && img.complete && (img.naturalWidth || img.width)) {
      ctx.filter = grade.filter;
      drawPhotoCover(ctx, img, rect, panel.zoom || 1, panel.dx || 0, panel.dy || 0);
      ctx.filter = 'none';
      gradePanel(ctx, rect, state.grade);
    } else {
      // Empty panel: a painted sunset placeholder, never a blank hole.
      const ph = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
      ph.addColorStop(0, '#2b0a4a');
      ph.addColorStop(0.5, '#b3126b');
      ph.addColorStop(1, '#ff7a1a');
      ctx.fillStyle = ph;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      drawRetroSun(ctx, rect.x + rect.w / 2, rect.y + rect.h * 0.42, Math.min(rect.w, rect.h) * 0.22, ['#ffe259', '#ff7a1a', '#ff2e88']);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = `700 ${Math.max(14, u * 2.4)}px "Vice Text", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ADD YOUR PHOTO', rect.x + rect.w / 2, rect.y + rect.h * 0.78);
    }
    ctx.restore();
    // Crisp white keyline around each panel.
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = Math.max(1.5, u * 0.22);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  });

  // Decorations, drawn in code over the panels.
  const decor = state.decor || {};
  if (decor.sun !== false) {
    const r = Math.min(W, H) * 0.085;
    // The sun sits in the top-right corner of the hero panel for Hero Split
    // (its sky is the natural spot), and in the panel that touches the
    // canvas's top-right corner for every other layout — never over the
    // first panel's subject, where it would cover a face.
    let sunRect = rects[0];
    if (state.layout !== 'hero') {
      sunRect = rects.reduce((best, rect) => {
        if (rect.x + rect.w > best.x + best.w) return rect;
        if (rect.x + rect.w === best.x + best.w && rect.y < best.y) return rect;
        return best;
      }, rects[0]);
    }
    const sx = sunRect.x + sunRect.w - r * 1.5;
    const sy = sunRect.y + r * 1.5;
    ctx.save();
    ctx.globalAlpha = 0.92;
    drawRetroSun(ctx, sx, sy, r, ['#fff176', '#ff9e2c', '#ff2e88']);
    ctx.restore();
  }
  if (decor.palms !== false) {
    // Palms stand about 30% of the canvas height: the drawing is ~160 units
    // tall, so scale = 0.30 * H / 160.
    const s = H * 0.0019;
    ctx.save();
    ctx.globalAlpha = 0.95;
    drawPalm(ctx, W * 0.035, H * 0.985, s * 1.15, false, '#0d0518');
    drawPalm(ctx, W * 0.965, H * 0.985, s * 0.95, true, '#0d0518');
    ctx.restore();
  }
  if (decor.skyline) {
    drawSkyline(ctx, W * 0.06, H * 0.915, W * 0.88, H * 0.06, 'rgba(13, 5, 24, 0.9)', W + H);
  }
  if (decor.halftone !== false) {
    drawHalftone(ctx, W * 0.86, H * 0.02, W * 0.12, H * 0.16, '#ffffff');
  }

  drawCaption(ctx, W, H, state);

  // Outer frame + a small studio tag as a pill badge, our own mark.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = Math.max(2, u * 0.3);
  ctx.strokeRect(u * 0.9, u * 0.9, W - u * 1.8, H - u * 1.8);
  const tag = 'MADE WITH VICE HEAT';
  ctx.font = `700 ${Math.max(11, u * 1.8)}px "Vice Text", sans-serif`;
  const tagW = ctx.measureText(tag).width;
  const tagH = u * 3.4;
  const tagX = u * 2.4;
  const tagY = u * 2.4;
  ctx.fillStyle = 'rgba(10, 2, 26, 0.82)';
  ctx.beginPath();
  ctx.roundRect(tagX, tagY, tagW + u * 2.2, tagH, tagH / 2);
  ctx.fill();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.fillText(tag, tagX + u * 1.1, tagY + tagH / 2 + u * 0.1);
}

// Panel rects for a canvas of W x H under a layout — the same rects the
// renderer uses, so editor hit-testing and drawing can never drift apart.
export function layoutRects(W, H, layoutKey) {
  const u = Math.min(W, H) / 100;
  const gap = Math.max(6, Math.round(u * 1.1));
  const layout = LAYOUTS[layoutKey] || LAYOUTS.hero;
  return layout.panels(W, H, gap);
}

// Renders the cover at an export size and returns the fresh canvas.
export function renderCoverToCanvas(sizeKey, state) {
  const size = SIZES[sizeKey] || SIZES.square;
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  renderCover(canvas, state);
  return canvas;
}

// Default panel setup for a layout: panel i shows photo (i % photos).
export function defaultPanels(layoutKey, photoCount) {
  const layout = LAYOUTS[layoutKey] || LAYOUTS.hero;
  const count = layout.panels(1000, 1000, 10).length;
  const panels = [];
  for (let i = 0; i < count; i += 1) {
    panels.push({ photo: photoCount ? i % photoCount : 0, zoom: 1, dx: 0, dy: 0 });
  }
  return panels;
}
