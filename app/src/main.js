// Palmline Cover Studio — editor wiring.
// Live preview, layout / grade / size pickers, caption inputs, per-panel drag-to-pan
// and wheel zoom, photo upload (FileReader, never uploaded), PNG export in three
// post sizes, and a ?shot= mode that stages a fixed scene for screenshots.
import { drawCover, exportCoverPNG, GRADES, LAYOUTS, layoutPanels, makeState } from './cover.js';

const $ = (id) => document.getElementById(id);
const canvas = $('stage');
const state = makeState();
const SIZES = {
  square: { w: 1080, h: 1080, label: 'Square 1080 × 1080' },
  portrait: { w: 1080, h: 1350, label: 'Portrait 1080 × 1350' },
  landscape: { w: 1920, h: 1080, label: 'Landscape 1920 × 1080' },
};
let sizeKey = 'square';
let activePanel = 0;

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

function redraw() {
  const size = SIZES[sizeKey];
  canvas.width = size.w;
  canvas.height = size.h;
  drawCover(canvas, state);
  document.querySelectorAll('[data-layout]').forEach((b) => b.classList.toggle('on', b.dataset.layout === state.layout));
  document.querySelectorAll('[data-grade]').forEach((b) => b.classList.toggle('on', b.dataset.grade === state.grade));
  document.querySelectorAll('[data-size]').forEach((b) => b.classList.toggle('on', b.dataset.size === sizeKey));
  document.querySelectorAll('[data-panel]').forEach((b) => b.classList.toggle('on', Number(b.dataset.panel) === activePanel));
  // Per-panel buttons only apply when each panel has its own photo.
  $('panelRow').style.opacity = state.photoMode === 'one' ? '0.45' : '1';
  $('panelHint').textContent = state.photoMode === 'one'
    ? `One photo fills all panels — drag the preview to pan, scroll to zoom.`
    : `Panel ${activePanel + 1} selected — drag to pan it, scroll to zoom it.`;
}

function setStatus(msg) {
  $('status').textContent = msg;
}

/** Applies a freshly loaded photo: to every panel, or to the selected one. */
function applyPhoto(img) {
  if (state.photoMode === 'one') {
    state.single = img;
    state.crops = state.crops.map(() => ({ zoom: 1, ox: 0, oy: 0 }));
  } else {
    state.panels[activePanel] = img;
    state.crops[activePanel] = { zoom: 1, ox: 0, oy: 0 };
  }
  redraw();
}

function readFileAsImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => loadImage(reader.result).then(resolve, reject);
    reader.onerror = () => reject(new Error('could not read that file'));
    reader.readAsDataURL(file);
  });
}

// --- Controls -------------------------------------------------------------

const layoutRow = $('layoutRow');
LAYOUTS.forEach((layout) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.dataset.layout = layout.id;
  b.title = layout.blurb;
  b.textContent = layout.name;
  b.addEventListener('click', () => { state.layout = layout.id; redraw(); });
  layoutRow.appendChild(b);
});

const gradeRow = $('gradeRow');
GRADES.forEach((grade) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.dataset.grade = grade.id;
  b.textContent = grade.name;
  b.style.setProperty('--sw', `linear-gradient(135deg, ${grade.sky[1]}, ${grade.sky[2]} 55%, ${grade.sky[3]})`);
  b.addEventListener('click', () => { state.grade = grade.id; redraw(); });
  gradeRow.appendChild(b);
});

Object.entries(SIZES).forEach(([key, size]) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.dataset.size = key;
  b.textContent = size.label;
  b.addEventListener('click', () => { sizeKey = key; redraw(); });
  $('sizeRow').appendChild(b);
});

const panelRow = $('panelRow');
for (let i = 0; i < 4; i++) {
  const b = document.createElement('button');
  b.type = 'button';
  b.dataset.panel = String(i);
  b.textContent = `Panel ${i + 1}`;
  b.addEventListener('click', () => { activePanel = i; state.photoMode = 'per-panel'; $('photoMode').value = 'per-panel'; redraw(); });
  panelRow.appendChild(b);
}

$('photoMode').addEventListener('change', (e) => {
  state.photoMode = e.target.value;
  redraw();
});

$('photoFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    applyPhoto(await readFileAsImage(file));
    setStatus(`Loaded ${file.name}.`);
  } catch {
    setStatus('That file could not be used as a photo.');
  }
  e.target.value = '';
});

$('sampleOrchard').addEventListener('click', async () => {
  state.single = await loadImage('samples/orchard.jpg');
  state.panels = [state.single, state.single, state.single, state.single];
  redraw();
  setStatus('Sample photo loaded: orchard at sunset.');
});
$('sampleHillside').addEventListener('click', async () => {
  state.single = await loadImage('samples/hillside.jpg');
  state.panels = [state.single, state.single, state.single, state.single];
  redraw();
  setStatus('Sample photo loaded: hillside shepherd.');
});

$('caption').addEventListener('input', (e) => { state.caption = e.target.value; redraw(); });
$('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });

$('shuffle').addEventListener('click', () => {
  state.seed = (Math.random() * 1e9) | 0;
  redraw();
  setStatus('Skyline and grain reshuffled.');
});

$('reset').addEventListener('click', () => {
  const fresh = makeState();
  Object.assign(state, fresh);
  state.single = null;
  state.panels = [null, null, null, null];
  sizeKey = 'square';
  $('caption').value = state.caption;
  $('subtitle').value = state.subtitle;
  $('photoMode').value = 'one';
  redraw();
  setStatus('Reset to a fresh cover.');
});

// --- Drag to pan, wheel to zoom ------------------------------------------
// Pointer position maps onto the preview canvas; the panel under the pointer
// is the one that pans. Zoom centres on that panel too.
let dragging = null;

function panelAt(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * canvas.width;
  const y = ((clientY - rect.top) / rect.height) * canvas.height;
  const panels = layoutPanels(state.layout, canvas.width, canvas.height);
  const idx = panels.findIndex((p) => x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h);
  return { idx: idx < 0 ? 0 : idx, x, y };
}

canvas.addEventListener('pointerdown', (e) => {
  const hit = panelAt(e.clientX, e.clientY);
  activePanel = hit.idx;
  dragging = { x: e.clientX, y: e.clientY, panel: hit.idx, crop: { ...state.crops[hit.idx] } };
  canvas.setPointerCapture(e.pointerId);
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const rect = canvas.getBoundingClientRect();
  const crop = state.crops[dragging.panel];
  crop.ox = dragging.crop.ox + ((e.clientX - dragging.x) / rect.width) * 4;
  crop.oy = dragging.crop.oy + ((e.clientY - dragging.y) / rect.height) * 4;
  crop.ox = Math.max(-1, Math.min(1, crop.ox));
  crop.oy = Math.max(-1, Math.min(1, crop.oy));
  redraw();
});
canvas.addEventListener('pointerup', () => { dragging = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const hit = panelAt(e.clientX, e.clientY);
  activePanel = hit.idx;
  const crop = state.crops[hit.idx];
  crop.zoom = Math.max(0.6, Math.min(3, crop.zoom * (e.deltaY < 0 ? 1.08 : 0.93)));
  redraw();
}, { passive: false });

// --- Export ---------------------------------------------------------------

function downloadPNG(width, height) {
  const url = exportCoverPNG(state, width, height);
  const a = document.createElement('a');
  a.href = url;
  a.download = `palmline-${width}x${height}.png`;
  a.click();
  setStatus(`Exported palmline-${width}x${height}.png.`);
}

$('exportSquare').addEventListener('click', () => downloadPNG(1080, 1080));
$('exportPortrait').addEventListener('click', () => downloadPNG(1080, 1350));
$('exportLandscape').addEventListener('click', () => downloadPNG(1920, 1080));

/** Used by the screenshot harness: renders an export size and returns its PNG data URL. */
window.__exportPNG = (width, height) => exportCoverPNG(state, width, height);
window.__setState = (patch) => { Object.assign(state, patch); redraw(); };

// --- Shot mode ------------------------------------------------------------
// ?shot=cover shows the cover alone (controls hidden); ?shot=editor shows the
// editor with a sample photo. Query params: photo, caption, subtitle, layout,
// grade, size. window.__shotReady is set once the scene has painted.
async function runShot() {
  const q = new URLSearchParams(location.search);
  const shot = q.get('shot');
  if (!shot) return false;
  if (q.get('layout')) state.layout = q.get('layout');
  if (q.get('grade')) state.grade = q.get('grade');
  if (q.get('caption')) { state.caption = q.get('caption'); $('caption').value = state.caption; }
  if (q.get('subtitle')) { state.subtitle = q.get('subtitle'); $('subtitle').value = state.subtitle; }
  if (q.get('size') && SIZES[q.get('size')]) sizeKey = q.get('size');
  if (q.get('photo')) {
    const img = await loadImage(`samples/${q.get('photo')}.jpg`);
    state.single = img;
    state.panels = [img, img, img, img];
  }
  if (shot === 'cover') document.body.classList.add('shot-cover');
  redraw();
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  window.__shotReady = true;
  return true;
}

// --- Boot -----------------------------------------------------------------

async function boot() {
  // Wait for the shipped fonts so the first paint already uses them.
  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('100px "Archivo Black"'),
      document.fonts.load('40px Pacifico'),
      document.fonts.load('40px "Bebas Neue"'),
    ]);
  } catch {
    // Fall back to system fonts if a font file is missing; the cover still draws.
  }
  if (!(await runShot())) redraw();
}

boot();
