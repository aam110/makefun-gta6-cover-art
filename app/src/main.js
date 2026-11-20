// main.js — the Solstice Press editor.
//
// Wires the cover engine (cover.js) to the page: layout / grade / lettering
// pickers, title editing, per-panel photo upload with drag-pan and wheel-zoom,
// shuffle / randomize, and PNG export in the three post sizes. Everything
// runs offline; photos are read on the user's own machine and never uploaded.

import {
  EXPORT_SIZES,
  LAYOUTS,
  defaultState,
  exportCover,
  layoutGeometry,
  makePanel,
  panelAt,
  renderCover,
  reseedPanels,
} from './cover.js';
import { GRADES, GRADE_IDS, SCENE_NAMES } from './art.js';
import { TITLE_STYLES, TITLE_STYLE_IDS } from './lettering.js';

const state = defaultState();
let selectedPanel = 0;
let lastGeometry = null;
let onePhotoEverywhere = false;

const $ = (id) => document.getElementById(id);
const canvas = $('preview');
const ctx = canvas.getContext('2d');
const fileInput = $('file-input');
const toastEl = $('toast');

const RANDOM_TITLES = [
  ['LEONIDA NIGHTS', 'A VICE CITY STORY'],
  ['SUNSET HEIST', 'EVERY SCORE HAS A PRICE'],
  ['NEON BOULEVARD', 'DRIVE ALL NIGHT'],
  ['PALM COURT', 'THE HEAT NEVER SLEEPS'],
  ['MIDNIGHT RUN', 'OUTRUN THE DAWN'],
  ['GOLDEN HOUR', 'CHASING THE LAST LIGHT'],
  ['OCEAN DRIVE', 'SALT, SUN & TROUBLE'],
  ['HOT PURSUIT', 'FIVE STARS AND COUNTING'],
];

// ---------------------------------------------------------------------------
// Preview rendering
// ---------------------------------------------------------------------------

function currentSize() {
  return EXPORT_SIZES.find((s) => s.id === state.exportSize) ?? EXPORT_SIZES[2];
}

function renderPreview() {
  const size = currentSize();
  const scale = 960 / size.w;
  const w = 960;
  const h = Math.round(size.h * scale);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  ctx.clearRect(0, 0, w, h);
  lastGeometry = renderCover(canvas, state);
  drawSelectionOverlay();
  updatePanelInfo();
}

function drawSelectionOverlay() {
  if (!lastGeometry) return;
  const geo = lastGeometry;
  const panel = geo.panels[selectedPanel];
  if (!panel) return;
  ctx.save();
  ctx.translate(panel.x + panel.w / 2, panel.y + panel.h / 2);
  ctx.rotate(panel.rot);
  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 6]);
  ctx.strokeRect(-panel.w / 2, -panel.h / 2, panel.w, panel.h);
  ctx.setLineDash([]);
  ctx.fillStyle = '#00e5ff';
  ctx.font = '700 15px Impact, "Arial Black", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText(`PANEL ${selectedPanel + 1}`, -panel.w / 2 + 6, -panel.h / 2 - 6);
  ctx.restore();
}

function updatePanelInfo() {
  const panel = state.panels[selectedPanel];
  const label = $('panel-label');
  if (!panel) {
    label.textContent = 'No panel selected';
    return;
  }
  const kind = panel.image ? 'Your photo' : `Art: ${SCENE_NAMES[panel.scene]}`;
  label.textContent = `Panel ${selectedPanel + 1} of ${lastGeometry?.panels.length ?? 0} — ${kind}`;
  $('zoom-value').textContent = `${Math.round((panel.zoom || 1) * 100)}%`;
}

// ---------------------------------------------------------------------------
// Picker builders
// ---------------------------------------------------------------------------

function layoutDiagram(id) {
  const cell = 'background:currentColor;border-radius:1px;';
  if (id === 'nine') {
    return `<span class="diagram diagram-nine">${('<i style="' + cell + '"></i>').repeat(9)}</span>`;
  }
  if (id === 'hero') {
    return `<span class="diagram diagram-hero"><i style="${cell}"></i><i style="${cell}"></i><i style="${cell}"></i><i style="${cell}"></i></span>`;
  }
  if (id === 'fullbleed') {
    return `<span class="diagram diagram-full"><i style="${cell}"></i></span>`;
  }
  if (id === 'tilted') {
    return `<span class="diagram diagram-tilted"><i style="${cell}"></i><i style="${cell}"></i><i style="${cell}"></i><i style="${cell}"></i></span>`;
  }
  return `<span class="diagram diagram-bands"><i style="${cell}"></i><i style="${cell}"></i><i style="${cell}"></i><i style="${cell}"></i></span>`;
}

function buildPickers() {
  const layoutBox = $('layout-picker');
  for (const layout of LAYOUTS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pick layout-pick';
    btn.dataset.layout = layout.id;
    btn.title = layout.blurb;
    btn.innerHTML = `${layoutDiagram(layout.id)}<span>${layout.name}</span>`;
    btn.addEventListener('click', () => {
      state.layout = layout.id;
      selectedPanel = Math.min(selectedPanel, layout.panels - 1);
      syncPickerStates();
      renderPreview();
    });
    layoutBox.appendChild(btn);
  }

  const gradeBox = $('grade-picker');
  for (const id of GRADE_IDS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `pick grade-pick grade-${id}`;
    btn.dataset.grade = id;
    btn.title = GRADES[id].hint;
    btn.innerHTML = `<span class="swatch"></span><span>${GRADES[id].name}</span>`;
    btn.addEventListener('click', () => {
      state.grade = id;
      syncPickerStates();
      renderPreview();
    });
    gradeBox.appendChild(btn);
  }

  const styleBox = $('style-picker');
  for (const id of TITLE_STYLE_IDS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pick style-pick';
    btn.dataset.style = id;
    btn.title = TITLE_STYLES[id].hint;
    btn.textContent = TITLE_STYLES[id].name;
    btn.addEventListener('click', () => {
      state.titleStyle = id;
      syncPickerStates();
      renderPreview();
    });
    styleBox.appendChild(btn);
  }

  const sizeBox = $('size-picker');
  for (const size of EXPORT_SIZES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pick size-pick';
    btn.dataset.size = size.id;
    btn.textContent = size.label;
    btn.addEventListener('click', () => {
      state.exportSize = size.id;
      syncPickerStates();
      renderPreview();
    });
    sizeBox.appendChild(btn);
  }
}

function syncPickerStates() {
  document.querySelectorAll('.layout-pick').forEach((b) => {
    b.classList.toggle('active', b.dataset.layout === state.layout);
  });
  document.querySelectorAll('.grade-pick').forEach((b) => {
    b.classList.toggle('active', b.dataset.grade === state.grade);
  });
  document.querySelectorAll('.style-pick').forEach((b) => {
    b.classList.toggle('active', b.dataset.style === state.titleStyle);
  });
  document.querySelectorAll('.size-pick').forEach((b) => {
    b.classList.toggle('active', b.dataset.size === state.exportSize);
  });
  $('title-input').value = state.title;
  $('subtitle-input').value = state.subtitle;
  $('stars-input').value = String(state.stars);
  $('fx-grain').checked = state.fx.grain;
  $('fx-vignette').checked = state.fx.vignette;
  $('fx-scanlines').checked = state.fx.scanlines;
  $('fx-halftone').checked = state.fx.halftone;
  $('one-photo').checked = onePhotoEverywhere;
}

// ---------------------------------------------------------------------------
// Photo loading
// ---------------------------------------------------------------------------

function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, url });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that image file.'));
    };
    img.src = url;
  });
}

async function applyPhotoToPanel(file, index) {
  const { img, url } = await loadImageFile(file);
  const targets = onePhotoEverywhere
    ? state.panels.map((_, i) => i)
    : [index];
  for (const i of targets) {
    const panel = state.panels[i];
    if (panel.imageUrl) URL.revokeObjectURL(panel.imageUrl);
    panel.image = img;
    panel.imageUrl = i === index ? url : null;
    panel.panX = 0;
    panel.panY = 0;
    panel.zoom = 1;
  }
  showToast(onePhotoEverywhere ? 'Photo applied to every panel' : `Photo loaded into panel ${index + 1}`);
  renderPreview();
}

function clearPanelPhoto(index) {
  const panel = state.panels[index];
  if (panel.imageUrl) URL.revokeObjectURL(panel.imageUrl);
  const fresh = makePanel(index, state.artSeed);
  state.panels[index] = fresh;
  renderPreview();
}

// ---------------------------------------------------------------------------
// Pointer interaction: select, drag-pan, wheel-zoom
// ---------------------------------------------------------------------------

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (canvas.width / rect.width),
    y: (event.clientY - rect.top) * (canvas.height / rect.height),
  };
}

let dragging = null;

canvas.addEventListener('pointerdown', (event) => {
  if (!lastGeometry) return;
  const point = canvasPoint(event);
  const hit = panelAt(lastGeometry, point.x, point.y);
  if (hit === -1) return;
  selectedPanel = hit;
  const panel = state.panels[hit];
  dragging = {
    index: hit,
    startX: point.x,
    startY: point.y,
    panX: panel.panX,
    panY: panel.panY,
    moved: false,
  };
  canvas.setPointerCapture(event.pointerId);
  renderPreview();
});

canvas.addEventListener('pointermove', (event) => {
  if (!dragging) return;
  const point = canvasPoint(event);
  const panel = state.panels[dragging.index];
  const rect = lastGeometry.panels[dragging.index];
  const dx = (point.x - dragging.startX) / rect.w;
  const dy = (point.y - dragging.startY) / rect.h;
  if (Math.abs(dx) > 0.002 || Math.abs(dy) > 0.002) dragging.moved = true;
  panel.panX = clamp(dragging.panX + dx, -0.6, 0.6);
  panel.panY = clamp(dragging.panY + dy, -0.6, 0.6);
  renderPreview();
});

canvas.addEventListener('pointerup', () => {
  dragging = null;
});

canvas.addEventListener('wheel', (event) => {
  event.preventDefault();
  if (!lastGeometry) return;
  const panel = state.panels[selectedPanel];
  const factor = Math.exp(-event.deltaY * 0.0012);
  panel.zoom = clamp((panel.zoom || 1) * factor, 1, 3);
  renderPreview();
}, { passive: false });

// Drag & drop a photo onto a panel.
canvas.addEventListener('dragover', (event) => {
  event.preventDefault();
  canvas.classList.add('drop-ready');
});
canvas.addEventListener('dragleave', () => canvas.classList.remove('drop-ready'));
canvas.addEventListener('drop', async (event) => {
  event.preventDefault();
  canvas.classList.remove('drop-ready');
  const file = event.dataTransfer?.files?.[0];
  if (!file || !file.type.startsWith('image/')) return;
  const point = canvasPoint(event);
  const hit = lastGeometry ? panelAt(lastGeometry, point.x, point.y) : -1;
  const index = hit === -1 ? selectedPanel : hit;
  selectedPanel = index;
  try {
    await applyPhotoToPanel(file, index);
  } catch (error) {
    showToast(error.message);
  }
});

function clamp(value, lo, hi) {
  return Math.min(hi, Math.max(lo, value));
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

async function exportCurrentSize() {
  const size = currentSize();
  const cover = exportCover(state, size.w, size.h);
  const blob = await new Promise((resolve) => cover.toBlob(resolve, 'image/png'));
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `solstice-press-${size.w}x${size.h}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  showToast(`Exported ${size.label} PNG`);
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

let toastTimer = 0;
function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), 2600);
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

function wireControls() {
  $('title-input').addEventListener('input', (event) => {
    state.title = event.target.value;
    renderPreview();
  });
  $('subtitle-input').addEventListener('input', (event) => {
    state.subtitle = event.target.value;
    renderPreview();
  });
  $('stars-input').addEventListener('input', (event) => {
    state.stars = clamp(Number(event.target.value) || 0, 0, 5);
    renderPreview();
  });
  for (const key of ['grain', 'vignette', 'scanlines', 'halftone']) {
    $(`fx-${key}`).addEventListener('change', (event) => {
      state.fx[key] = event.target.checked;
      renderPreview();
    });
  }
  $('one-photo').addEventListener('change', (event) => {
    onePhotoEverywhere = event.target.checked;
    if (onePhotoEverywhere) {
      const source = state.panels.find((p) => p.image);
      if (source) {
        for (const panel of state.panels) {
          if (panel !== source) {
            if (panel.imageUrl) URL.revokeObjectURL(panel.imageUrl);
            panel.image = source.image;
            panel.imageUrl = null;
          }
        }
        renderPreview();
      }
    }
  });

  $('upload-btn').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    try {
      await applyPhotoToPanel(file, selectedPanel);
    } catch (error) {
      showToast(error.message);
    }
  });
  $('clear-photo-btn').addEventListener('click', () => {
    clearPanelPhoto(selectedPanel);
    showToast(`Panel ${selectedPanel + 1} back to generated art`);
  });
  $('zoom-in-btn').addEventListener('click', () => {
    const panel = state.panels[selectedPanel];
    panel.zoom = clamp((panel.zoom || 1) * 1.25, 1, 3);
    renderPreview();
  });
  $('zoom-out-btn').addEventListener('click', () => {
    const panel = state.panels[selectedPanel];
    panel.zoom = clamp((panel.zoom || 1) / 1.25, 1, 3);
    renderPreview();
  });
  $('reset-pan-btn').addEventListener('click', () => {
    const panel = state.panels[selectedPanel];
    panel.panX = 0;
    panel.panY = 0;
    panel.zoom = 1;
    renderPreview();
  });
  $('shuffle-btn').addEventListener('click', () => {
    reseedPanels(state, Math.floor(Math.random() * 100000));
    showToast('Fresh generated art');
    renderPreview();
  });
  $('random-btn').addEventListener('click', () => {
    const pick = (list) => list[Math.floor(Math.random() * list.length)];
    state.layout = pick(LAYOUTS).id;
    state.grade = pick(GRADE_IDS);
    state.titleStyle = pick(TITLE_STYLE_IDS);
    const [title, subtitle] = pick(RANDOM_TITLES);
    state.title = title;
    state.subtitle = subtitle;
    state.stars = 3 + Math.floor(Math.random() * 3);
    selectedPanel = 0;
    reseedPanels(state, Math.floor(Math.random() * 100000));
    syncPickerStates();
    showToast('Randomized — a whole new cover');
    renderPreview();
  });
  $('export-btn').addEventListener('click', () => {
    exportCurrentSize().catch(() => showToast('Export failed — please try again'));
  });
}

// ---------------------------------------------------------------------------
// Screenshot modes (?shot=cover renders the cover full-frame; ?shot=editor
// presets the editor). Used only to take the entry's screenshots.
// ---------------------------------------------------------------------------

function applyShotParams() {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (!shot) return false;
  if (params.get('layout')) state.layout = params.get('layout');
  if (params.get('grade')) state.grade = params.get('grade');
  if (params.get('style')) state.titleStyle = params.get('style');
  if (params.get('title')) state.title = params.get('title');
  if (params.get('subtitle')) state.subtitle = params.get('subtitle');
  if (params.get('stars')) state.stars = clamp(Number(params.get('stars')) || 0, 0, 5);
  if (params.get('seed')) reseedPanels(state, Number(params.get('seed')) || 7);
  if (params.get('size')) state.exportSize = params.get('size');
  if (params.get('scanlines') === '1') state.fx.scanlines = true;
  syncPickerStates();
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    renderCover(canvas, state);
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

buildPickers();
wireControls();
syncPickerStates();
const shotMode = applyShotParams();
if (!shotMode) renderPreview();

// Test hooks for the entry's own Playwright checks (and the finalist review):
// export a PNG as a data URL, read the live state, re-render on demand.
window.__solstice = {
  state,
  renderPreview,
  exportPNG(w, h) {
    return new Promise((resolve) => {
      exportCover(state, w, h).toBlob((blob) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      }, 'image/png');
    });
  },
  geometry() {
    return layoutGeometry(state.layout, canvas.width, canvas.height);
  },
};
