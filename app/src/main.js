// Midnight Mile — studio wiring: controls, uploads, drag pan/zoom,
// 3D tilt + turntable, day/night cycle, PNG export, shot modes.

import { defaultState, renderCover, fitTitle, faceAwareFocus, LAYOUT_PANELS } from './cover.js';
import { createWorld, createFallback2D } from './world.js';
import { renderCover as renderExport, canvasToBlob } from './export.js';

const state = defaultState();
let selected = 0;
let world = null;
let spinning = false;
let spinAngle = 0;

const $ = (id) => document.getElementById(id);
const coverEl = $('cover');
const tiltEl = $('coverTilt');

function refresh() {
  renderCover(state, selected, onPanelPointerDown);
  fitTitle();
  syncControls();
  document.querySelectorAll('#layoutBtns button').forEach((b) => b.classList.toggle('active', b.dataset.layout === state.layout));
  document.querySelectorAll('#gradeBtns button').forEach((b) => b.classList.toggle('active', b.dataset.grade === state.grade));
  document.querySelectorAll('#sizeBtns button').forEach((b) => b.classList.toggle('active', b.dataset.size === state.size));
  document.querySelectorAll('#dayNightCycle button').forEach((b) => b.classList.toggle('active', b.dataset.cycle === state.cycle));
  tiltEl.classList.toggle('spinning', spinning || state.layout === 'turntable');
  buildPanelPick();
}

function syncControls() {
  const p = state.panels[selected];
  $('panelName').textContent = (selected + 1) + ' · ' + p.role;
  $('inTitle').value = state.title;
  $('inSubtitle').value = state.subtitle;
  $('inQuote').value = state.quote;
  $('inSource').value = state.quoteSource;
  $('inTagline').value = state.tagline;
  $('inRole').value = p.role;
  $('inLoc').value = p.loc;
  $('inTime').value = p.time;
  $('inQuip').value = p.quip;
  $('inHeat').checked = p.heat;
  $('inPanX').value = Math.round(p.px * 100);
  $('inPanY').value = Math.round(p.py * 100);
  $('inZoom').value = Math.round(p.zoom * 100);
  $('inSeal').checked = state.showSeal;
  $('inBarcode').checked = state.showBarcode;
  $('inComing').checked = state.showComing;
  $('inVolume').value = state.volume;
  $('inBilling').value = state.billing;
}

function buildPanelPick() {
  const wrap = $('panelPick');
  wrap.innerHTML = '';
  const used = new Set(LAYOUT_PANELS[state.layout]);
  state.panels.forEach((p, i) => {
    const b = document.createElement('button');
    b.textContent = String(i + 1);
    b.title = p.role;
    b.classList.toggle('active', i === selected);
    b.disabled = !used.has(i);
    b.addEventListener('click', () => { selected = i; refresh(); });
    wrap.appendChild(b);
  });
}

// ---- panel drag to pan, wheel to zoom ----
function onPanelPointerDown(index, e, el) {
  selected = index;
  refresh();
  const p = state.panels[index];
  const startX = e.clientX;
  const startY = e.clientY;
  const startPx = p.px;
  const startPy = p.py;
  const rect = el.getBoundingClientRect();
  function move(ev) {
    p.px = Math.min(1, Math.max(0, startPx - (ev.clientX - startX) / rect.width));
    p.py = Math.min(1, Math.max(0, startPy - (ev.clientY - startY) / rect.height));
    renderCover(state, selected, onPanelPointerDown);
    fitTitle();
    syncControls();
  }
  function up() {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
  }
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}

document.addEventListener('wheel', (e) => {
  const panel = e.target.closest && e.target.closest('.cover-panel');
  if (!panel) return;
  e.preventDefault();
  const p = state.panels[Number(panel.dataset.panel)];
  p.zoom = Math.min(2.2, Math.max(1, p.zoom - Math.sign(e.deltaY) * 0.08));
  renderCover(state, selected, onPanelPointerDown);
  fitTitle();
  syncControls();
}, { passive: false });

// ---- uploads: file picker + drag & drop onto a panel ----
function placePhoto(file, panelIndex) {
  if (!file || !file.type.startsWith('image/')) return;
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    const p = state.panels[panelIndex];
    const isPortrait = img.naturalHeight >= img.naturalWidth;
    const focus = faceAwareFocus(isPortrait);
    p.img = url;
    p.portrait = isPortrait;
    p.px = focus.px;
    p.py = focus.py;
    p.zoom = 1;
    refresh();
  };
  img.src = url;
}

$('fileInput').addEventListener('change', (e) => {
  const f = e.target.files && e.target.files[0];
  if (f) placePhoto(f, selected);
  e.target.value = '';
});
$('uploadBtn').addEventListener('click', () => $('fileInput').click());
$('fillAllBtn').addEventListener('click', () => {
  const src = state.panels[selected];
  state.panels.forEach((p) => {
    p.img = src.img;
    p.portrait = src.portrait;
    p.px = src.px;
    p.py = src.py;
    p.zoom = src.zoom;
  });
  refresh();
});

coverEl.addEventListener('dragover', (e) => { e.preventDefault(); });
coverEl.addEventListener('drop', (e) => {
  e.preventDefault();
  const panel = e.target.closest && e.target.closest('.cover-panel');
  const f = e.dataTransfer.files && e.dataTransfer.files[0];
  if (panel && f) placePhoto(f, Number(panel.dataset.panel));
});

// ---- text + option controls ----
function bindText(id, apply) {
  $(id).addEventListener('input', (e) => { apply(e.target.value); refresh(); });
}
bindText('inTitle', (v) => { state.title = v.toUpperCase() || 'MIDNIGHT MILE'; });
bindText('inSubtitle', (v) => { state.subtitle = v || 'One Last Run'; });
bindText('inQuote', (v) => { state.quote = v; });
bindText('inSource', (v) => { state.quoteSource = v; });
bindText('inTagline', (v) => { state.tagline = v; });
bindText('inVolume', (v) => { state.volume = v; });
bindText('inBilling', (v) => { state.billing = v; });
bindText('inRole', (v) => { state.panels[selected].role = v.toUpperCase(); });
bindText('inLoc', (v) => { state.panels[selected].loc = v.toUpperCase(); });
bindText('inTime', (v) => { state.panels[selected].time = v.toUpperCase(); });
bindText('inQuip', (v) => { state.panels[selected].quip = v.toUpperCase(); });

$('inHeat').addEventListener('change', (e) => { state.panels[selected].heat = e.target.checked; refresh(); });
$('inSeal').addEventListener('change', (e) => { state.showSeal = e.target.checked; refresh(); });
$('inBarcode').addEventListener('change', (e) => { state.showBarcode = e.target.checked; refresh(); });
$('inComing').addEventListener('change', (e) => { state.showComing = e.target.checked; refresh(); });
$('inPanX').addEventListener('input', (e) => { state.panels[selected].px = e.target.value / 100; renderCover(state, selected, onPanelPointerDown); });
$('inPanY').addEventListener('input', (e) => { state.panels[selected].py = e.target.value / 100; renderCover(state, selected, onPanelPointerDown); });
$('inZoom').addEventListener('input', (e) => { state.panels[selected].zoom = e.target.value / 100; renderCover(state, selected, onPanelPointerDown); });

document.querySelectorAll('#layoutBtns button').forEach((b) => b.addEventListener('click', () => {
  state.layout = b.dataset.layout;
  const used = LAYOUT_PANELS[state.layout];
  if (!used.includes(selected)) selected = used[0];
  refresh();
}));
document.querySelectorAll('#gradeBtns button').forEach((b) => b.addEventListener('click', () => {
  state.grade = b.dataset.grade;
  refresh();
}));
document.querySelectorAll('#sizeBtns button').forEach((b) => b.addEventListener('click', () => {
  state.size = b.dataset.size;
  refresh();
}));
document.querySelectorAll('#dayNightCycle button').forEach((b) => b.addEventListener('click', () => {
  state.cycle = b.dataset.cycle;
  if (world) world.setCycle(state.cycle);
  refresh();
}));

// ---- turntable: button toggles auto-spin, drag spins manually ----
$('turntableBtn').addEventListener('click', () => {
  spinning = !spinning;
  $('turntableBtn').textContent = spinning ? 'Stop Turntable' : 'Turntable';
  refresh();
});
let dragSpin = null;
tiltEl.addEventListener('pointerdown', (e) => {
  if (e.target.closest('.cover-panel')) return;
  dragSpin = { x: e.clientX, angle: spinAngle };
});
window.addEventListener('pointermove', (e) => {
  if (!dragSpin) return;
  spinAngle = dragSpin.angle + (e.clientX - dragSpin.x) * 0.25;
  coverEl.style.transform = 'rotateY(' + spinAngle + 'deg) rotateX(3deg)';
});
window.addEventListener('pointerup', () => { dragSpin = null; });

// ---- cover tilt follows the mouse (3D parallax) ----
document.getElementById('stage').addEventListener('pointermove', (e) => {
  if (dragSpin) return;
  const r = e.currentTarget.getBoundingClientRect();
  const nx = (e.clientX - r.left) / r.width - 0.5;
  const ny = (e.clientY - r.top) / r.height - 0.5;
  tiltEl.style.transform = 'rotateY(' + (nx * 7).toFixed(2) + 'deg) rotateX(' + (-ny * 5).toFixed(2) + 'deg)';
});
document.getElementById('stage').addEventListener('pointerleave', () => {
  tiltEl.style.transform = '';
});

// ---- export ----
async function exportPNG() {
  const btn = $('exportBtn');
  btn.textContent = 'Rendering…';
  btn.disabled = true;
  try {
    const canvas = await renderExport(state);
    const blob = await canvasToBlob(canvas);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'midnight-mile-' + state.size + '.png';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } finally {
    btn.textContent = 'Export PNG';
    btn.disabled = false;
  }
}
$('exportBtn').addEventListener('click', exportPNG);

// ---- shot modes (?shot=cover shows the bare poster) ----
const params = new URLSearchParams(location.search);
if (params.get('shot') === 'cover') document.body.classList.add('shot-cover');
if (params.get('layout')) state.layout = params.get('layout');
if (params.get('grade')) state.grade = params.get('grade');
if (params.get('size')) state.size = params.get('size');
if (params.get('title')) state.title = params.get('title').toUpperCase();
if (params.get('subtitle')) state.subtitle = params.get('subtitle');

// ---- boot ----
refresh();
window.addEventListener('resize', fitTitle);
document.fonts.ready.then(() => fitTitle());

// 3D world, with a 2D fallback when WebGL is unavailable.
let worldStatus = 'pending';
try {
  world = createWorld($('world3d'), (ok) => {
    worldStatus = ok ? 'webgl' : 'fallback';
    if (!ok) {
      $('worldWrap').classList.add('fallback');
      createFallback2D($('world2d'));
    }
  });
  if (!world) {
    worldStatus = 'fallback';
    $('worldWrap').classList.add('fallback');
    createFallback2D($('world2d'));
  }
} catch {
  worldStatus = 'fallback';
  $('worldWrap').classList.add('fallback');
  createFallback2D($('world2d'));
}

// Test hook for Playwright: export + inspect state without clicking.
window.__mm = {
  state,
  worldStatus: () => worldStatus,
  exportPNG: async (size) => {
    if (size) state.size = size;
    const canvas = await renderExport(state);
    return canvas.toDataURL('image/png');
  },
};
