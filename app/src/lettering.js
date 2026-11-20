// lettering.js — masthead lettering for Solstice Press, drawn in code.
//
// No font files ship with the app. Display type comes from system font stacks
// (Impact / Arial Black), treated with layered gradients, outlines and glow,
// plus fully vector-drawn marks: the "VI" badge, the starburst sticker and
// the ribbon tag are canvas paths, not text and not images.

import { roundRect, starPath } from './art.js';

export const TITLE_STYLES = {
  sunset: { name: 'Sunset Chrome', hint: 'Gold to magenta gradient' },
  chrome: { name: 'Silver Chrome', hint: 'Polished metal, black edge' },
  neon: { name: 'Neon Tube', hint: 'Pink glow, cyan echo' },
  ink: { name: 'Poster Ink', hint: 'Dark ink, white keyline' },
};

export const TITLE_STYLE_IDS = Object.keys(TITLE_STYLES);

// System stacks only — these are not files in the repo.
export const DISPLAY_STACK = 'Impact, "Arial Black", "Arial Narrow Bold", sans-serif';
export const SCRIPT_STACK = 'Georgia, "Times New Roman", serif';

function setTracking(ctx, px) {
  // ctx.letterSpacing is supported in desktop Chrome; harmless elsewhere.
  try {
    ctx.letterSpacing = `${px}px`;
  } catch {
    // Older browsers ignore it.
  }
}

// Shrink the font until the text fits maxWidth (never below minPx).
export function fitFontSize(ctx, text, maxWidth, startPx, family, minPx = 10) {
  let size = startPx;
  ctx.font = `${size}px ${family}`;
  setTracking(ctx, size * 0.02);
  while (size > minPx && ctx.measureText(text).width > maxWidth) {
    size = Math.max(minPx, size * 0.92);
    ctx.font = `${size}px ${family}`;
    setTracking(ctx, size * 0.02);
  }
  return size;
}

// Draw the cover title, centred on (cx, baselineY), in one of the four
// hand-built styles. Returns the font size used.
export function drawMasthead(ctx, text, cx, baselineY, maxWidth, style, maxPx) {
  const label = (text || 'LEONIDA').toUpperCase();
  const size = fitFontSize(ctx, label, maxWidth, maxPx, DISPLAY_STACK);
  ctx.save();
  ctx.font = `${size}px ${DISPLAY_STACK}`;
  setTracking(ctx, size * 0.02);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  if (style === 'chrome') {
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = size * 0.07;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#101018';
    ctx.lineWidth = size * 0.16;
    ctx.strokeText(label, cx, baselineY);
    const g = ctx.createLinearGradient(0, baselineY - size, 0, baselineY + size * 0.15);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.45, '#dfe7ef');
    g.addColorStop(0.55, '#7d8b9d');
    g.addColorStop(0.62, '#e8eef4');
    g.addColorStop(1, '#93a1b3');
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = g;
    ctx.fillText(label, cx, baselineY);
  } else if (style === 'neon') {
    // Cyan echo behind, pink glow in front, white-hot core.
    ctx.fillStyle = '#00e5ff';
    ctx.globalAlpha = 0.85;
    ctx.fillText(label, cx + size * 0.045, baselineY + size * 0.045);
    ctx.globalAlpha = 1;
    ctx.shadowColor = '#ff2975';
    ctx.shadowBlur = size * 0.28;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#ff2975';
    ctx.lineWidth = size * 0.07;
    ctx.strokeText(label, cx, baselineY);
    ctx.strokeText(label, cx, baselineY);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff5fa';
    ctx.fillText(label, cx, baselineY);
  } else if (style === 'ink') {
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = size * 0.05;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = size * 0.14;
    ctx.strokeText(label, cx, baselineY);
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#171226';
    ctx.fillText(label, cx, baselineY);
    // A thin gold underline rule.
    const w = ctx.measureText(label).width;
    ctx.fillStyle = '#ffd319';
    ctx.fillRect(cx - w / 2, baselineY + size * 0.12, w, Math.max(2, size * 0.045));
  } else {
    // sunset (default): gold-to-magenta gradient with a dark keyline.
    ctx.shadowColor = 'rgba(20,4,30,0.6)';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = size * 0.06;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1a0b2e';
    ctx.lineWidth = size * 0.15;
    ctx.strokeText(label, cx, baselineY);
    const g = ctx.createLinearGradient(0, baselineY - size, 0, baselineY);
    g.addColorStop(0, '#ffe259');
    g.addColorStop(0.45, '#ff9a3d');
    g.addColorStop(0.75, '#ff2975');
    g.addColorStop(1, '#b537f2');
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = g;
    ctx.fillText(label, cx, baselineY);
    // White top-light: re-draw the top half of the glyphs in white at low alpha.
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.beginPath();
    ctx.rect(cx - maxWidth / 2, baselineY - size, maxWidth, size * 0.42);
    ctx.clip();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, cx, baselineY);
    ctx.restore();
  }
  ctx.restore();
  return size;
}

// Letterspaced small-caps subtitle with flanking rules.
export function drawSubtitle(ctx, text, cx, y, maxWidth, color = '#ffffff') {
  const label = (text || '').trim().toUpperCase();
  if (!label) return 0;
  ctx.save();
  let size = Math.min(maxWidth * 0.045, 44);
  ctx.font = `600 ${size}px ${SCRIPT_STACK}`;
  setTracking(ctx, size * 0.32);
  while (size > 9 && ctx.measureText(label).width > maxWidth * 0.86) {
    size *= 0.92;
    ctx.font = `600 ${size}px ${SCRIPT_STACK}`;
    setTracking(ctx, size * 0.32);
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;
  const tw = ctx.measureText(label).width;
  ctx.fillStyle = color;
  ctx.fillText(label, cx, y);
  // Flanking rules.
  const ruleLen = Math.min(maxWidth * 0.12, 90);
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.75;
  ctx.fillRect(cx - tw / 2 - ruleLen - 14, y - 1, ruleLen, 2);
  ctx.fillRect(cx + tw / 2 + 14, y - 1, ruleLen, 2);
  ctx.restore();
  return size;
}

// The "VI" badge: a ring, two vector-drawn roman numerals and a star.
// Nothing here is a font glyph — the V and I are stroked paths.
export function drawVIBadge(ctx, cx, cy, r) {
  ctx.save();
  // Disc.
  ctx.fillStyle = 'rgba(12,6,24,0.82)';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  // Double ring.
  ctx.strokeStyle = '#ffd319';
  ctx.lineWidth = Math.max(2, r * 0.09);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.94, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.65)';
  ctx.lineWidth = Math.max(1, r * 0.035);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.78, 0, Math.PI * 2);
  ctx.stroke();
  // The V: two strokes meeting at the bottom centre.
  ctx.strokeStyle = '#ffd319';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = r * 0.26;
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.52, cy - r * 0.34);
  ctx.lineTo(cx - r * 0.16, cy + r * 0.4);
  ctx.lineTo(cx + r * 0.2, cy - r * 0.34);
  ctx.stroke();
  // The I: a bar with top and bottom serifs.
  ctx.lineWidth = r * 0.2;
  ctx.beginPath();
  ctx.moveTo(cx + r * 0.48, cy - r * 0.34);
  ctx.lineTo(cx + r * 0.48, cy + r * 0.4);
  ctx.stroke();
  ctx.lineWidth = r * 0.14;
  ctx.beginPath();
  ctx.moveTo(cx + r * 0.32, cy - r * 0.34);
  ctx.lineTo(cx + r * 0.64, cy - r * 0.34);
  ctx.moveTo(cx + r * 0.32, cy + r * 0.4);
  ctx.lineTo(cx + r * 0.64, cy + r * 0.4);
  ctx.stroke();
  // A small star above the numerals.
  ctx.fillStyle = '#ff2975';
  starPath(ctx, cx, cy - r * 0.62, r * 0.14);
  ctx.fill();
  ctx.restore();
}

// A slanted ribbon tag with short text ("LEONIDA", "EST. 2026").
export function drawRibbonTag(ctx, cx, y, text, color = '#ffd319') {
  const label = (text || '').toUpperCase();
  ctx.save();
  ctx.font = `700 20px ${DISPLAY_STACK}`;
  setTracking(ctx, 3);
  const tw = ctx.measureText(label).width;
  const w = tw + 34;
  const h = 30;
  ctx.translate(cx, y);
  ctx.rotate(-0.03);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h / 2);
  ctx.lineTo(w / 2, -h / 2);
  ctx.lineTo(w / 2 - 8, 0);
  ctx.lineTo(w / 2, h / 2);
  ctx.lineTo(-w / 2, h / 2);
  ctx.lineTo(-w / 2 + 8, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#171226';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 0, 1);
  ctx.restore();
  return w;
}

// A row of wanted stars (0–5 filled, the rest hollow outlines).
export function drawWantedStars(ctx, x, y, starR, count, gap) {
  ctx.save();
  for (let i = 0; i < 5; i++) {
    const cx = x + i * (starR * 2 + gap);
    if (i < count) {
      ctx.fillStyle = '#ffd319';
      ctx.shadowColor = 'rgba(255,211,25,0.8)';
      ctx.shadowBlur = starR * 0.5;
      starPath(ctx, cx, y, starR);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#1a0b2e';
      ctx.lineWidth = Math.max(1, starR * 0.1);
      starPath(ctx, cx, y, starR);
      ctx.stroke();
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = Math.max(1, starR * 0.12);
      starPath(ctx, cx, y, starR);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// Small pill label, e.g. "100% OFFLINE" in a corner of the cover.
export function drawPill(ctx, x, y, text, bg = 'rgba(12,6,24,0.8)', fg = '#ffffff') {
  ctx.save();
  ctx.font = `700 15px ${DISPLAY_STACK}`;
  setTracking(ctx, 2);
  const tw = ctx.measureText(text).width;
  const w = tw + 22;
  const h = 26;
  ctx.fillStyle = bg;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + w / 2, y + h / 2 + 1);
  ctx.restore();
  return w;
}
