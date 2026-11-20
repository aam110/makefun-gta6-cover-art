// cover.js — the Solstice Press cover engine.
//
// One function, renderCover, draws a complete cover onto any canvas at any
// size: the editor preview and the exported PNGs share it, so what you see is
// what you get. Layouts are geometry functions over the cover size; panels
// hold either a user photo (pan + zoom per panel) or a seeded procedural
// scene; grades, lettering and retro effects finish the poster.

import {
  GRADES,
  SCENE_KINDS,
  applyGrade,
  applyGrain,
  applyScanlines,
  applyVignette,
  drawHalftone,
  drawNeonGrid,
  drawScene,
  hashSeed,
  mulberry32,
  starburstPath,
} from './art.js';
import {
  drawMasthead,
  drawPill,
  drawRibbonTag,
  drawSubtitle,
  drawVIBadge,
  drawWantedStars,
} from './lettering.js';

export const EXPORT_SIZES = [
  { id: 'square', label: '1080 × 1080', w: 1080, h: 1080 },
  { id: 'portrait', label: '1080 × 1350', w: 1080, h: 1350 },
  { id: 'wide', label: '1920 × 1080', w: 1920, h: 1080 },
];

export const LAYOUTS = [
  { id: 'nine', name: 'Nine Panel', blurb: 'The classic 3 × 3 poster grid', panels: 9 },
  { id: 'hero', name: 'Hero + Three', blurb: 'One big moment, three side stories', panels: 4 },
  { id: 'fullbleed', name: 'Full Bleed', blurb: 'One photo edge to edge', panels: 1 },
  { id: 'tilted', name: 'Tilted Stack', blurb: 'Snapshots tossed on a sunset', panels: 4 },
  { id: 'bands', name: 'Film Bands', blurb: 'Widescreen strips, title in the middle', panels: 4 },
];

export const LAYOUT_IDS = LAYOUTS.map((l) => l.id);
export const MAX_PANELS = 9;

// A shuffled deck of scenes for one art seed: the six scenes in a random
// order, then three more from a second shuffle, so a 9-panel cover shows
// every scene once before any repeats.
function sceneDeck(artSeed) {
  const rnd = mulberry32(hashSeed(`deck-${artSeed}`));
  const shuffled = [...SCENE_KINDS];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const second = [...shuffled];
  for (let i = second.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [second[i], second[j]] = [second[j], second[i]];
  }
  return [...shuffled, ...second.slice(0, 3)];
}

export function sceneForPanel(index, artSeed) {
  return sceneDeck(artSeed)[index % MAX_PANELS];
}

// A fresh panel: no photo yet, so it shows a seeded procedural scene.
export function makePanel(index, artSeed) {
  return {
    image: null,
    imageUrl: null,
    scene: sceneForPanel(index, artSeed),
    seed: hashSeed(`panel-${index}-${artSeed}`),
    panX: 0,
    panY: 0,
    zoom: 1,
  };
}

export function defaultState() {
  return {
    layout: 'nine',
    grade: 'vice',
    titleStyle: 'sunset',
    title: 'LEONIDA NIGHTS',
    subtitle: 'A VICE CITY STORY',
    stars: 4,
    artSeed: 7,
    exportSize: 'wide',
    fx: { grain: true, vignette: true, scanlines: false, halftone: true },
    panels: Array.from({ length: MAX_PANELS }, (_, i) => makePanel(i, 7)),
  };
}

// ---------------------------------------------------------------------------
// Layout geometry (all rects in cover pixels)
// ---------------------------------------------------------------------------

export function layoutGeometry(layoutId, W, H) {
  const gap = Math.max(3, Math.round(Math.min(W, H) * 0.011));
  const panels = [];
  let title;
  let badge = null;
  let stars = null;
  let backdrop = null;

  if (layoutId === 'nine') {
    const titleH = Math.round(H * 0.185);
    const gridH = H - titleH - gap;
    const cw = (W - gap * 4) / 3;
    const ch = (gridH - gap * 4) / 3;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        panels.push({
          x: gap + c * (cw + gap),
          y: gap + r * (ch + gap),
          w: cw,
          h: ch,
          rot: 0,
        });
      }
    }
    title = { x: 0, y: H - titleH, w: W, h: titleH, kind: 'solid', align: 'left' };
    badge = { x: W - titleH * 0.52 - gap * 2, y: H - titleH / 2, r: titleH * 0.34 };
    stars = { x: gap * 2, y: gap * 2 + Math.min(W, H) * 0.02, r: Math.min(W, H) * 0.018 };
  } else if (layoutId === 'hero') {
    const titleH = Math.round(H * 0.18);
    const contentH = H - titleH - gap;
    const heroW = Math.round(W * 0.62);
    panels.push({ x: gap, y: gap, w: heroW - gap * 1.5, h: contentH - gap, rot: 0 });
    const sideX = heroW + gap * 0.5;
    const sideW = W - sideX - gap;
    const sh = (contentH - gap * 4) / 3;
    for (let i = 0; i < 3; i++) {
      panels.push({ x: sideX, y: gap + i * (sh + gap), w: sideW, h: sh, rot: 0 });
    }
    title = { x: 0, y: H - titleH, w: W, h: titleH, kind: 'solid', align: 'left' };
    badge = { x: W - titleH * 0.52 - gap * 2, y: H - titleH / 2, r: titleH * 0.34 };
    stars = { x: gap * 2, y: gap * 2 + Math.min(W, H) * 0.02, r: Math.min(W, H) * 0.018 };
  } else if (layoutId === 'fullbleed') {
    panels.push({ x: 0, y: 0, w: W, h: H, rot: 0 });
    title = { x: 0, y: H * 0.6, w: W, h: H * 0.4, kind: 'scrim', align: 'center' };
    badge = { x: W - Math.min(W, H) * 0.075, y: Math.min(W, H) * 0.075, r: Math.min(W, H) * 0.05 };
    stars = { x: W * 0.04, y: H * 0.045 + Math.min(W, H) * 0.02, r: Math.min(W, H) * 0.018 };
  } else if (layoutId === 'tilted') {
    backdrop = 'sunset';
    const pw = W * 0.44;
    const ph = H * 0.31;
    const spots = [
      { x: W * 0.04, y: H * 0.235, rot: -0.055 },
      { x: W * 0.52, y: H * 0.205, rot: 0.05 },
      { x: W * 0.06, y: H * 0.565, rot: 0.04 },
      { x: W * 0.5, y: H * 0.595, rot: -0.06 },
    ];
    for (const s of spots) panels.push({ x: s.x, y: s.y, w: pw, h: ph, rot: s.rot });
    title = { x: 0, y: H * 0.02, w: W, h: H * 0.15, kind: 'floating', align: 'center' };
    badge = { x: W - Math.min(W, H) * 0.07, y: H - Math.min(W, H) * 0.07, r: Math.min(W, H) * 0.045 };
    stars = { x: W * 0.04, y: H - Math.min(W, H) * 0.05, r: Math.min(W, H) * 0.016 };
  } else {
    // bands
    const heights = [0.2, 0.17, 0.17, 0.2];
    let y = gap;
    for (const frac of heights.slice(0, 2)) {
      const h = H * frac - gap;
      panels.push({ x: gap, y, w: W - gap * 2, h, rot: 0 });
      y += h + gap;
    }
    const titleH = H * 0.22;
    title = { x: 0, y, w: W, h: titleH, kind: 'solid', align: 'center' };
    y += titleH + gap;
    for (const frac of heights.slice(2)) {
      const h = H * frac - gap;
      panels.push({ x: gap, y, w: W - gap * 2, h, rot: 0 });
      y += h + gap;
    }
    badge = { x: W - titleH * 0.5 - gap * 2, y: title.y + titleH / 2, r: titleH * 0.33 };
    stars = { x: gap * 2, y: title.y + titleH / 2, r: Math.min(W, H) * 0.016 };
  }

  return { panels, title, badge, stars, backdrop, gap };
}

// Which panel (if any) contains point (px, py)? Topmost last.
export function panelAt(geo, px, py) {
  for (let i = geo.panels.length - 1; i >= 0; i--) {
    const p = geo.panels[i];
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;
    const dx = px - cx;
    const dy = py - cy;
    const cos = Math.cos(-p.rot);
    const sin = Math.sin(-p.rot);
    const lx = dx * cos - dy * sin;
    const ly = dx * sin + dy * cos;
    if (Math.abs(lx) <= p.w / 2 && Math.abs(ly) <= p.h / 2) return i;
  }
  return -1;
}

// ---------------------------------------------------------------------------
// Panel painting
// ---------------------------------------------------------------------------

// Paint one panel (photo or procedural scene + grade) onto its own canvas.
function paintPanelCanvas(panel, w, h, grade) {
  const iw = Math.max(2, Math.round(w));
  const ih = Math.max(2, Math.round(h));
  const canvas = document.createElement('canvas');
  canvas.width = iw;
  canvas.height = ih;
  const ctx = canvas.getContext('2d');
  const zoom = panel.zoom || 1;
  const panX = panel.panX || 0;
  const panY = panel.panY || 0;

  if (panel.image) {
    const img = panel.image;
    const base = Math.max(iw / img.naturalWidth, ih / img.naturalHeight);
    const scale = base * zoom;
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const dx = (iw - dw) / 2 + panX * iw;
    const dy = (ih - dh) / 2 + panY * ih;
    if (grade === 'noir') ctx.filter = 'grayscale(1) contrast(1.12)';
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.filter = 'none';
  } else {
    // Scene first, then pan/zoom as a transform of the finished scene.
    const scene = document.createElement('canvas');
    scene.width = iw;
    scene.height = ih;
    drawScene(scene.getContext('2d'), iw, ih, panel.seed, panel.scene);
    const dw = iw * zoom;
    const dh = ih * zoom;
    const dx = (iw - dw) / 2 + panX * iw;
    const dy = (ih - dh) / 2 + panY * ih;
    if (grade === 'noir') ctx.filter = 'grayscale(1) contrast(1.12)';
    ctx.drawImage(scene, dx, dy, dw, dh);
    ctx.filter = 'none';
  }
  applyGrade(ctx, iw, ih, grade);
  return canvas;
}

// ---------------------------------------------------------------------------
// The cover render
// ---------------------------------------------------------------------------

export function renderCover(canvas, state) {
  const W = canvas.width;
  const H = canvas.height;
  const ctx = canvas.getContext('2d');
  const geo = layoutGeometry(state.layout, W, H);
  const unit = Math.min(W, H);

  // Base.
  ctx.fillStyle = '#12081f';
  ctx.fillRect(0, 0, W, H);

  // Backdrop for the tilted layout: a full-cover sunset with a neon grid.
  if (geo.backdrop === 'sunset') {
    drawScene(ctx, W, H, hashSeed(`backdrop-${state.artSeed}`), 'sunset-beach');
    drawNeonGrid(ctx, W, H, H * 0.62);
    applyGrade(ctx, W, H, state.grade);
  }

  // Panels.
  const frame = Math.max(2, unit * 0.006);
  geo.panels.forEach((rect, i) => {
    const panel = state.panels[i];
    if (!panel) return;
    const art = paintPanelCanvas(panel, rect.w, rect.h, state.grade);
    ctx.save();
    ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
    ctx.rotate(rect.rot);
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = unit * 0.012;
    ctx.shadowOffsetY = unit * 0.006;
    ctx.drawImage(art, -rect.w / 2, -rect.h / 2, rect.w, rect.h);
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = frame;
    ctx.strokeStyle = '#f5f0e6';
    ctx.strokeRect(-rect.w / 2, -rect.h / 2, rect.w, rect.h);
    ctx.restore();
  });

  // Title block.
  const t = geo.title;
  if (t.kind === 'solid') {
    const g = ctx.createLinearGradient(0, t.y, 0, t.y + t.h);
    g.addColorStop(0, '#1d0b33');
    g.addColorStop(1, '#12081f');
    ctx.fillStyle = g;
    ctx.fillRect(t.x, t.y, t.w, t.h);
    // Accent rule across the top of the band.
    const rule = ctx.createLinearGradient(t.x, 0, t.x + t.w, 0);
    rule.addColorStop(0, '#ff2975');
    rule.addColorStop(0.5, '#ffd319');
    rule.addColorStop(1, '#00e5ff');
    ctx.fillStyle = rule;
    ctx.fillRect(t.x, t.y, t.w, Math.max(3, unit * 0.005));
    if (state.fx.halftone) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      drawHalftone(ctx, t.x + t.w * 0.015, t.y + t.h * 0.12, t.w * 0.1, t.h * 0.76, '#ff2975', unit * 0.006, unit * 0.014);
      ctx.restore();
    }
  } else if (t.kind === 'scrim') {
    const g = ctx.createLinearGradient(0, t.y, 0, t.y + t.h);
    g.addColorStop(0, 'rgba(10,5,20,0)');
    g.addColorStop(0.55, 'rgba(10,5,20,0.72)');
    g.addColorStop(1, 'rgba(10,5,20,0.92)');
    ctx.fillStyle = g;
    ctx.fillRect(t.x, t.y, t.w, t.h);
  }

  // Masthead + subtitle placement per title kind.
  const badgeReserve = geo.badge && t.kind !== 'floating' ? geo.badge.r * 2.6 : 0;
  const textW = t.w - badgeReserve - t.w * 0.06;
  const centerX = t.align === 'left'
    ? t.x + t.w * 0.03 + textW / 2
    : t.x + t.w / 2 - badgeReserve / 2;
  if (t.kind === 'floating') {
    drawRibbonTag(ctx, centerX, t.y + t.h * 0.16, 'Leonida');
    const size = drawMasthead(
      ctx, state.title, centerX, t.y + t.h * 0.72, t.w * 0.92, state.titleStyle, t.h * 0.52,
    );
    drawSubtitle(ctx, state.subtitle, centerX, t.y + t.h * 0.72 + size * 0.42, t.w * 0.8);
  } else if (t.kind === 'scrim') {
    const size = drawMasthead(
      ctx, state.title, centerX, t.y + t.h * 0.66, textW, state.titleStyle, t.h * 0.42,
    );
    drawSubtitle(ctx, state.subtitle, centerX, t.y + t.h * 0.66 + size * 0.45, t.w * 0.8);
  } else {
    const size = drawMasthead(
      ctx, state.title, centerX, t.y + t.h * 0.58, textW, state.titleStyle, t.h * 0.46,
    );
    drawSubtitle(ctx, state.subtitle, centerX, t.y + t.h * 0.58 + size * 0.42, t.w * 0.72);
  }

  // Badge, wanted stars and corner marks.
  if (geo.badge) drawVIBadge(ctx, geo.badge.x, geo.badge.y, geo.badge.r);
  if (geo.stars) {
    drawWantedStars(ctx, geo.stars.x, geo.stars.y, geo.stars.r, state.stars, geo.stars.r * 0.7);
  }
  if (state.layout === 'tilted') {
    // Starburst sticker overlapping the bottom-right panel.
    const sx = W * 0.88;
    const sy = H * 0.52;
    const sr = unit * 0.055;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(0.18);
    ctx.fillStyle = '#ffd319';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    starburstPath(ctx, 0, 0, sr, sr * 0.72, 12);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#171226';
    ctx.font = `700 ${Math.round(sr * 0.42)}px Impact, "Arial Black", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('HOT!', 0, 1);
    ctx.restore();
  }
  // (Full bleed needs no extra decorations: the scene itself is the hero.)

  // Retro finish.
  if (state.fx.scanlines) applyScanlines(ctx, W, H, 0.09);
  if (state.fx.vignette) applyVignette(ctx, W, H, 0.3);
  if (state.fx.grain) applyGrain(ctx, W, H, 0.07);

  return geo;
}

// Render a cover at an export size and return the canvas.
export function exportCover(state, w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  renderCover(canvas, state);
  return canvas;
}

// Re-seed every procedural panel (Shuffle art).
export function reseedPanels(state, artSeed) {
  state.artSeed = artSeed;
  state.panels.forEach((panel, i) => {
    if (!panel.image) {
      panel.seed = hashSeed(`panel-${i}-${artSeed}`);
      panel.scene = sceneForPanel(i, artSeed);
    }
  });
}

export { GRADES };
