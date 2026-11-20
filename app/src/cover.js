// Palmline Cover Studio — render engine.
// Draws GTA-style poster covers on a canvas: photo panels, a striped retro sun,
// palm silhouettes, a seeded skyline, halftone dots, scanlines, vignette and grain,
// plus bold condensed caption lettering with a chromatic offset and glow.
// Everything here is drawn in code; no image is fetched at run time.

export const LAYOUTS = [
  { id: 'trio-stack', name: 'Trio Stack', blurb: 'Three stacked bands, tall hero on top.' },
  { id: 'hero-left', name: 'Hero Left', blurb: 'One big panel left, two small ones right.' },
  { id: 'grid-four', name: 'Grid Four', blurb: 'A four-panel collage grid.' },
  { id: 'full-bleed', name: 'Full Bleed', blurb: 'One photo edge to edge, art on top.' },
];

export const GRADES = [
  {
    id: 'vice-dusk', name: 'Vice Dusk',
    sky: ['#1b0f3b', '#5b1b6e', '#c22a7a', '#ff7a3d'],
    sun: ['#ffe66d', '#ff9a3d', '#ff2e88'], tint: 'rgba(194, 42, 122, 0.20)',
    caption: '#fff7e8', accent: '#2de2ff', panelLine: '#ffd166',
  },
  {
    id: 'neon-tide', name: 'Neon Tide',
    sky: ['#03182b', '#073b5a', '#0e7d8c', '#19e3c2'],
    sun: ['#d8fff4', '#5ff2d6', '#ff2e88'], tint: 'rgba(14, 125, 140, 0.22)',
    caption: '#eafffb', accent: '#ff5fa2', panelLine: '#19e3c2',
  },
  {
    id: 'golden-mile', name: 'Golden Mile',
    sky: ['#2b1206', '#6e2f08', '#c96a12', '#ffc93d'],
    sun: ['#fff3b0', '#ffb03d', '#ff5e3a'], tint: 'rgba(201, 106, 18, 0.20)',
    caption: '#fffbe8', accent: '#7a4dff', panelLine: '#ffe66d',
  },
  {
    id: 'midnight-chrome', name: 'Midnight Chrome',
    sky: ['#050510', '#131a3a', '#3b2a6e', '#8a5cff'],
    sun: ['#f2f2ff', '#c9b8ff', '#5f8cff'], tint: 'rgba(90, 60, 180, 0.22)',
    caption: '#f4f2ff', accent: '#ffcf3d', panelLine: '#c9b8ff',
  },
];

/** A fresh default editor state. */
export function makeState() {
  return {
    layout: 'trio-stack',
    grade: 'vice-dusk',
    caption: 'PALMLINE NIGHTS',
    subtitle: 'sun down · engines up',
    photoMode: 'one', // 'one' fills every panel; 'per-panel' gives each panel its own photo
    single: null, // one Image, or null
    panels: [null, null, null, null], // one Image per panel slot, or null
    crops: [
      { zoom: 1, ox: 0, oy: 0 },
      { zoom: 1, ox: 0, oy: 0 },
      { zoom: 1, ox: 0, oy: 0 },
      { zoom: 1, ox: 0, oy: 0 },
    ],
    seed: 20261119,
  };
}

export function gradeOf(id) {
  return GRADES.find((g) => g.id === id) || GRADES[0];
}

/** Deterministic pseudo-random generator, so the skyline and grain never flicker. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Panel rectangles for a layout, in fractions of the canvas (x, y, w, h).
 * Every layout adapts to square, portrait and landscape canvases.
 */
export function layoutPanels(layoutId, w, h) {
  const gap = 0.012; // thin neon gutter between panels, in canvas units
  const g = gap * Math.min(w, h);
  const inset = g;
  const full = { x: inset, y: inset, w: w - inset * 2, h: h - inset * 2 };
  if (layoutId === 'full-bleed') return [{ ...full }];
  if (layoutId === 'hero-left') {
    const leftW = w * 0.58 - g;
    const rightX = inset + leftW + g;
    const rightW = w - rightX - inset;
    const topH = (h - inset * 2 - g) * 0.52;
    return [
      { x: inset, y: inset, w: leftW, h: h - inset * 2 },
      { x: rightX, y: inset, w: rightW, h: topH },
      { x: rightX, y: inset + topH + g, w: rightW, h: h - inset * 2 - topH - g },
    ];
  }
  if (layoutId === 'grid-four') {
    const cw = (w - inset * 2 - g) / 2;
    const ch = (h - inset * 2 - g) / 2;
    return [
      { x: inset, y: inset, w: cw, h: ch },
      { x: inset + cw + g, y: inset, w: cw, h: ch },
      { x: inset, y: inset + ch + g, w: cw, h: ch },
      { x: inset + cw + g, y: inset + ch + g, w: cw, h: ch },
    ];
  }
  // trio-stack: tall hero band, mid band, bottom band.
  const bandH = (h - inset * 2 - g * 2) / 3;
  return [
    { x: inset, y: inset, w: w - inset * 2, h: bandH * 1.55 },
    { x: inset, y: inset + bandH * 1.55 + g, w: w - inset * 2, h: bandH * 0.85 },
    { x: inset, y: inset + bandH * 2.4 + g * 2, w: w - inset * 2, h: h - (inset + bandH * 2.4 + g * 2) - inset },
  ];
}

/** Draws `img` into `rect` with cover-fit, a per-panel zoom and a pan offset. */
export function drawPhotoInto(ctx, img, rect, crop) {
  const zoom = Math.max(0.5, crop?.zoom ?? 1);
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * zoom;
  const pw = img.naturalWidth * scale;
  const ph = img.naturalHeight * scale;
  const ox = (crop?.ox ?? 0) * rect.w * 0.25;
  const oy = (crop?.oy ?? 0) * rect.h * 0.25;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(img, rect.x + (rect.w - pw) / 2 + ox, rect.y + (rect.h - ph) / 2 + oy, pw, ph);
  ctx.restore();
}

/** A retro sun: a gradient disc cut by horizontal stripes that widen toward the bottom.
 *  Drawn in horizontal slices, so the stripe gaps stay transparent to whatever is beneath. */
export function drawStripedSun(ctx, cx, cy, r, colors) {
  const grad = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  grad.addColorStop(0, colors[0]);
  grad.addColorStop(0.55, colors[1]);
  grad.addColorStop(1, colors[2]);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = grad;
  // Paint the disc row by row, skipping the stripe gaps below its middle.
  const step = Math.max(2, r / 60);
  let gapAt = cy + r * 0.08;
  let gapH = r * 0.045;
  for (let y = cy - r; y < cy + r; y += step) {
    if (y >= gapAt && y < gapAt + gapH) continue;
    if (y >= gapAt + gapH) {
      gapAt = gapAt + gapH + r * 0.16;
      gapH *= 1.35;
    }
    ctx.fillRect(cx - r, y, r * 2, step + 0.5);
  }
  ctx.restore();
}

/** A palm silhouette: a curved trunk and seven drooping fronds, drawn with beziers. */
export function drawPalm(ctx, x, y, s, color, lean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.rotate(lean);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  // Trunk, leaning gently.
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(14, -70, 6, -150);
  ctx.stroke();
  // Fronds fan out from the crown.
  ctx.lineWidth = 7;
  for (let i = 0; i < 7; i++) {
    const a = (-160 + i * 52) * (Math.PI / 180);
    const tipX = 6 + Math.cos(a) * 95;
    const tipY = -150 + Math.sin(a) * 62;
    const midX = 6 + Math.cos(a) * 55;
    const midY = -150 + Math.sin(a) * 18 - 26;
    ctx.beginPath();
    ctx.moveTo(6, -150);
    ctx.quadraticCurveTo(midX, midY, tipX, tipY + 34);
    ctx.stroke();
  }
  // Coconuts.
  ctx.beginPath(); ctx.arc(-2, -142, 7, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(12, -138, 6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

/** A seeded skyline: blocky towers with lit windows along the bottom edge. */
export function drawSkyline(ctx, w, h, seed, color, lit) {
  const rnd = mulberry32(seed);
  const base = h * 0.985;
  let x = -10;
  ctx.fillStyle = color;
  while (x < w + 10) {
    const bw = w * (0.04 + rnd() * 0.075);
    const bh = h * (0.06 + rnd() * 0.16);
    ctx.fillRect(x, base - bh, bw, bh);
    // Antenna on the odd tower.
    if (rnd() > 0.72) ctx.fillRect(x + bw / 2 - 1.5, base - bh - h * 0.03, 3, h * 0.03);
    // Lit windows.
    ctx.fillStyle = lit;
    const cols = Math.max(1, Math.floor(bw / (w * 0.018)));
    const rows = Math.max(1, Math.floor(bh / (h * 0.035)));
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (rnd() > 0.62) {
          ctx.fillRect(x + 4 + c * (w * 0.018), base - bh + 6 + r * (h * 0.035), w * 0.008, h * 0.014);
        }
      }
    }
    ctx.fillStyle = color;
    x += bw + w * 0.008;
  }
}

/** Halftone dots fading upward from the bottom edge. */
export function drawHalftone(ctx, w, h, color) {
  ctx.save();
  const step = Math.max(9, w * 0.014);
  for (let y = h * 0.62; y < h; y += step) {
    const fade = (y - h * 0.62) / (h * 0.38);
    for (let x = step / 2; x < w; x += step) {
      const r = step * 0.16 + fade * step * 0.22;
      ctx.globalAlpha = 0.10 + fade * 0.30;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawScanlines(ctx, w, h) {
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = '#000000';
  for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1);
  ctx.restore();
}

function drawVignette(ctx, w, h) {
  const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function drawGrain(ctx, w, h, seed) {
  const rnd = mulberry32(seed + 77);
  ctx.save();
  ctx.globalAlpha = 0.05;
  const n = Math.floor((w * h) / 2600);
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = rnd() > 0.5 ? '#ffffff' : '#000000';
    ctx.fillRect(rnd() * w, rnd() * h, 1.6, 1.6);
  }
  ctx.restore();
}

/** The caption: condensed display type, chromatic offset, dark outline, glow, and a script subtitle. */
function drawCaption(ctx, state, grade, w, h) {
  const text = (state.caption || '').trim().toUpperCase();
  const sub = (state.subtitle || '').trim();
  const bandH = h * 0.30;
  const bandY = h - bandH;
  // A soft dark shelf so the words stay readable over any photo.
  const shelf = ctx.createLinearGradient(0, bandY - h * 0.06, 0, h);
  shelf.addColorStop(0, 'rgba(10, 4, 24, 0)');
  shelf.addColorStop(1, 'rgba(10, 4, 24, 0.72)');
  ctx.fillStyle = shelf;
  ctx.fillRect(0, bandY - h * 0.06, w, bandH + h * 0.06);

  if (text) {
    let size = w * 0.115;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const fit = (px) => {
      ctx.font = `${px}px Anton, "Archivo Black", sans-serif`;
      return ctx.measureText(text).width;
    };
    while (fit(size) > w * 0.94 && size > 20) size -= 4;
    const cx = w / 2;
    const cy = h - h * 0.115;
    const off = Math.max(2, size * 0.035);
    // Chromatic offset: cyan ghost left, magenta ghost right.
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#22d3ee';
    ctx.fillText(text, cx - off, cy);
    ctx.fillStyle = '#ff2e88';
    ctx.fillText(text, cx + off, cy);
    ctx.globalAlpha = 1;
    // Glow + main fill + outline.
    ctx.shadowColor = grade.accent;
    ctx.shadowBlur = size * 0.28;
    ctx.fillStyle = grade.caption;
    ctx.fillText(text, cx, cy);
    ctx.shadowBlur = 0;
    ctx.lineWidth = Math.max(2, size * 0.045);
    ctx.strokeStyle = 'rgba(12, 4, 26, 0.9)';
    ctx.strokeText(text, cx, cy);
    ctx.lineWidth = Math.max(1, size * 0.012);
    ctx.strokeStyle = grade.panelLine;
    ctx.globalAlpha = 0.55;
    ctx.strokeText(text, cx, cy);
    ctx.globalAlpha = 1;
  }
  if (sub) {
    const size = Math.max(16, w * 0.032);
    ctx.font = `${size}px Pacifico, cursive`;
    ctx.textAlign = 'center';
    ctx.fillStyle = grade.accent;
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = size * 0.3;
    ctx.fillText(sub, w / 2, h - h * 0.035);
    ctx.shadowBlur = 0;
  }
}

/**
 * Renders the whole cover onto `canvas` at its own pixel size.
 * `state` follows makeState(); photos are HTMLImages (or null for empty panels).
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const grade = gradeOf(state.grade);

  // Sky.
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  grade.sky.forEach((stop, i) => sky.addColorStop(i / (grade.sky.length - 1), stop));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Photo panels.
  const panels = layoutPanels(state.layout, w, h);
  panels.forEach((rect, i) => {
    const img = state.photoMode === 'one' ? state.single : state.panels[i];
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    if (img) {
      drawPhotoInto(ctx, img, rect, state.crops[i]);
      // Grade tint over the photo.
      ctx.fillStyle = grade.tint;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    } else {
      // Empty panel: a deep gradient with a dashed placeholder frame.
      const g2 = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
      g2.addColorStop(0, 'rgba(255,255,255,0.10)');
      g2.addColorStop(1, 'rgba(0,0,0,0.28)');
      ctx.fillStyle = g2;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.setLineDash([10, 8]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.strokeRect(rect.x + 8, rect.y + 8, rect.w - 16, rect.h - 16);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = `${Math.max(14, w * 0.02)}px "Bebas Neue", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('DROP A PHOTO HERE', rect.x + rect.w / 2, rect.y + rect.h / 2);
    }
    ctx.restore();
    // Neon gutter line around each panel.
    ctx.lineWidth = Math.max(2, Math.min(w, h) * 0.004);
    ctx.strokeStyle = grade.panelLine;
    ctx.globalAlpha = 0.9;
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.globalAlpha = 1;
  });

  // Retro sun layered over the panels, top right — a graphic badge the eye finds first.
  drawStripedSun(ctx, w * 0.85, h * 0.17, Math.min(w, h) * 0.115, grade.sun);

  // Palms framing the left and right edges.
  drawPalm(ctx, w * 0.02, h * 0.995, Math.min(w, h) * 0.0022, 'rgba(8, 4, 20, 0.92)', -0.10);
  drawPalm(ctx, w * 0.98, h * 0.995, Math.min(w, h) * 0.0019, 'rgba(8, 4, 20, 0.92)', 0.14);

  // Skyline along the foot, halftone, scanlines, vignette, grain.
  drawSkyline(ctx, w, h, state.seed, 'rgba(8, 4, 20, 0.88)', grade.sun[0]);
  drawHalftone(ctx, w, h, '#ffffff');
  drawScanlines(ctx, w, h);
  drawCaption(ctx, state, grade, w, h);
  drawVignette(ctx, w, h);
  drawGrain(ctx, w, h, state.seed);
}

/** Renders `state` at an export size and returns a PNG data URL. */
export function exportCoverPNG(state, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  drawCover(canvas, state);
  return canvas.toDataURL('image/png');
}
