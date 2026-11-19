// VICE HEAT — editor wiring.
// Loads photos (local files or the bundled samples), keeps the cover state,
// renders the live preview, handles per-panel crop/position by drag and
// wheel, exports PNGs, and supports a deterministic ?shot= mode so the
// cover can be rendered hands-free for screenshots.

import {
  SIZES, LAYOUTS, GRADES, CAPTION_STYLES,
  renderCover, renderCoverToCanvas, defaultPanels, layoutRects,
} from './cover.js';

const $ = (id) => document.getElementById(id);

const state = {
  photos: [],          // HTMLImageElement[]
  photoNames: [],      // display names, same order as photos
  panels: defaultPanels('hero', 0),
  layout: 'hero',
  grade: 'sunset',
  caption: 'VICE HEAT',
  subcaption: 'WELCOME TO VICE CITY',
  captionStyle: 'block',
  captionPos: 'bottom',
  captionScale: 1,
  decor: { sun: true, palms: true, skyline: false, halftone: true },
  sizeKey: 'wide',
  selectedPanel: 0,
  selectedPhoto: 0,
};

const preview = $('preview');
let fontsReady = false;

function currentSize() {
  return SIZES[state.sizeKey] || SIZES.wide;
}

function renderPreview() {
  const { w, h } = currentSize();
  if (preview.width !== w || preview.height !== h) {
    preview.width = w;
    preview.height = h;
  }
  renderCover(preview, state);
  // The selection outline is editor chrome: never draw it in cover-shot mode.
  if (!document.body.classList.contains('shot-cover')) drawSelection();
}

function drawSelection() {
  const ctx = preview.getContext('2d');
  const rects = layoutRects(preview.width, preview.height, state.layout);
  const rect = rects[state.selectedPanel];
  if (!rect) return;
  ctx.save();
  ctx.strokeStyle = 'rgba(34, 211, 238, 0.95)';
  ctx.lineWidth = Math.max(3, Math.min(preview.width, preview.height) * 0.004);
  ctx.setLineDash([18, 10]);
  ctx.strokeRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4);
  ctx.setLineDash([]);
  ctx.restore();
}

function syncControls() {
  document.querySelectorAll('#layoutRow .choice').forEach((b) => {
    b.classList.toggle('active', b.dataset.layout === state.layout);
  });
  document.querySelectorAll('#gradeRow .choice').forEach((b) => {
    b.classList.toggle('active', b.dataset.grade === state.grade);
  });
  document.querySelectorAll('#styleRow .choice').forEach((b) => {
    b.classList.toggle('active', b.dataset.style === state.captionStyle);
  });
  document.querySelectorAll('#posRow .choice').forEach((b) => {
    b.classList.toggle('active', b.dataset.pos === state.captionPos);
  });
  document.querySelectorAll('#sizeRow .choice').forEach((b) => {
    b.classList.toggle('active', b.dataset.size === state.sizeKey);
  });
  $('captionInput').value = state.caption;
  $('subInput').value = state.subcaption;
  $('sizeSlider').value = Math.round(state.captionScale * 100);
  $('sizeValue').textContent = `${Math.round(state.captionScale * 100)}%`;
  $('decorSun').checked = state.decor.sun;
  $('decorPalms').checked = state.decor.palms;
  $('decorSkyline').checked = state.decor.skyline;
  $('decorHalftone').checked = state.decor.halftone;
  syncZoomSlider();
}

function syncZoomSlider() {
  const panel = state.panels[state.selectedPanel];
  const zoom = panel ? Math.round((panel.zoom || 1) * 100) : 100;
  $('zoomSlider').value = zoom;
  $('zoomValue').textContent = `${zoom}%`;
}

function refreshPhotoStrip() {
  const strip = $('photoStrip');
  strip.innerHTML = '';
  state.photos.forEach((img, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `photo-thumb${i === state.selectedPhoto ? ' active' : ''}`;
    btn.title = state.photoNames[i] || `Photo ${i + 1}`;
    btn.setAttribute('aria-label', `Use photo ${i + 1}`);
    const thumb = document.createElement('img');
    thumb.src = img.src;
    thumb.alt = '';
    btn.appendChild(thumb);
    const remove = document.createElement('span');
    remove.className = 'remove';
    remove.textContent = '×';
    remove.title = 'Remove photo';
    remove.addEventListener('click', (event) => {
      event.stopPropagation();
      removePhoto(i);
    });
    btn.appendChild(remove);
    btn.addEventListener('click', () => {
      state.selectedPhoto = i;
      // One tap places the photo into the selected panel.
      const panel = state.panels[state.selectedPanel];
      if (panel) panel.photo = i;
      refreshPhotoStrip();
      renderPreview();
    });
    strip.appendChild(btn);
  });
}

function loadImage(src, name) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${name}`));
    img.src = src;
  });
}

async function addPhoto(src, name) {
  const img = await loadImage(src, name);
  state.photos.push(img);
  state.photoNames.push(name);
  state.selectedPhoto = state.photos.length - 1;
  if (state.photos.length === 1) {
    // First photo fills every panel.
    state.panels.forEach((p) => { p.photo = 0; });
  }
  refreshPhotoStrip();
  renderPreview();
  return img;
}

function removePhoto(index) {
  state.photos.splice(index, 1);
  state.photoNames.splice(index, 1);
  if (state.selectedPhoto >= state.photos.length) {
    state.selectedPhoto = Math.max(0, state.photos.length - 1);
  }
  state.panels.forEach((p) => {
    if (p.photo === index) p.photo = 0;
    else if (p.photo > index) p.photo -= 1;
  });
  refreshPhotoStrip();
  renderPreview();
}

function applyLayout(layoutKey) {
  const old = state.panels;
  state.layout = layoutKey;
  const fresh = defaultPanels(layoutKey, state.photos.length);
  fresh.forEach((p, i) => {
    if (old[i]) {
      p.photo = old[i].photo;
      p.zoom = old[i].zoom;
      p.dx = old[i].dx;
      p.dy = old[i].dy;
    }
  });
  state.panels = fresh;
  if (state.selectedPanel >= fresh.length) state.selectedPanel = 0;
  syncControls();
  renderPreview();
}

function exportPNG(sizeKey) {
  const key = sizeKey || state.sizeKey;
  const canvas = renderCoverToCanvas(key, state);
  const size = SIZES[key];
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vice-heat-${size.w}x${size.h}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      resolve(url);
    }, 'image/png');
  });
}

// ---------- Canvas interaction: click to select, drag to pan, wheel to zoom ----------

function canvasPoint(event) {
  const rect = preview.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (preview.width / rect.width),
    y: (event.clientY - rect.top) * (preview.height / rect.height),
  };
}

function panelAt(point) {
  const rects = layoutRects(preview.width, preview.height, state.layout);
  return rects.findIndex((r) => (
    point.x >= r.x && point.x <= r.x + r.w && point.y >= r.y && point.y <= r.y + r.h
  ));
}

let drag = null;

preview.addEventListener('pointerdown', (event) => {
  const point = canvasPoint(event);
  const index = panelAt(point);
  if (index === -1) return;
  state.selectedPanel = index;
  const panel = state.panels[index];
  drag = { panel, lastX: point.x, lastY: point.y, moved: false };
  preview.setPointerCapture(event.pointerId);
  preview.classList.add('dragging');
  syncZoomSlider();
  renderPreview();
});

preview.addEventListener('pointermove', (event) => {
  if (!drag) return;
  const point = canvasPoint(event);
  const rects = layoutRects(preview.width, preview.height, state.layout);
  const rect = rects[state.selectedPanel];
  if (!rect) return;
  const dx = (point.x - drag.lastX) / rect.w;
  const dy = (point.y - drag.lastY) / rect.h;
  if (Math.abs(dx) > 0.002 || Math.abs(dy) > 0.002) drag.moved = true;
  // Dragging right moves the photo right (content follows the pointer).
  drag.panel.dx = clamp(drag.panel.dx + dx * 2.2, -1, 1);
  drag.panel.dy = clamp(drag.panel.dy + dy * 2.2, -1, 1);
  drag.lastX = point.x;
  drag.lastY = point.y;
  renderPreview();
});

function endDrag() {
  drag = null;
  preview.classList.remove('dragging');
}
preview.addEventListener('pointerup', endDrag);
preview.addEventListener('pointercancel', endDrag);

preview.addEventListener('wheel', (event) => {
  event.preventDefault();
  const point = canvasPoint(event);
  const index = panelAt(point);
  if (index === -1) return;
  state.selectedPanel = index;
  const panel = state.panels[index];
  const factor = event.deltaY < 0 ? 1.08 : 1 / 1.08;
  panel.zoom = clamp((panel.zoom || 1) * factor, 1, 3);
  syncZoomSlider();
  renderPreview();
}, { passive: false });

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// ---------- Control wiring ----------

$('photoInput').addEventListener('change', async (event) => {
  const files = [...event.target.files];
  for (const file of files) {
    try {
      await addPhoto(URL.createObjectURL(file), file.name);
    } catch (err) {
      console.warn(err.message);
    }
  }
  event.target.value = '';
});

document.querySelectorAll('.sample-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    addPhoto(btn.dataset.sample, btn.querySelector('span').textContent).catch((err) => {
      console.warn(err.message);
    });
  });
});

$('layoutRow').addEventListener('click', (event) => {
  const btn = event.target.closest('[data-layout]');
  if (btn) applyLayout(btn.dataset.layout);
});

$('gradeRow').addEventListener('click', (event) => {
  const btn = event.target.closest('[data-grade]');
  if (!btn) return;
  state.grade = btn.dataset.grade;
  syncControls();
  renderPreview();
});

$('styleRow').addEventListener('click', (event) => {
  const btn = event.target.closest('[data-style]');
  if (!btn) return;
  state.captionStyle = btn.dataset.style;
  syncControls();
  renderPreview();
});

$('posRow').addEventListener('click', (event) => {
  const btn = event.target.closest('[data-pos]');
  if (!btn) return;
  state.captionPos = btn.dataset.pos;
  syncControls();
  renderPreview();
});

$('sizeRow').addEventListener('click', (event) => {
  const btn = event.target.closest('[data-size]');
  if (!btn) return;
  state.sizeKey = btn.dataset.size;
  syncControls();
  renderPreview();
});

$('captionInput').addEventListener('input', (event) => {
  state.caption = event.target.value;
  renderPreview();
});

$('subInput').addEventListener('input', (event) => {
  state.subcaption = event.target.value;
  renderPreview();
});

$('sizeSlider').addEventListener('input', (event) => {
  state.captionScale = Number(event.target.value) / 100;
  $('sizeValue').textContent = `${event.target.value}%`;
  renderPreview();
});

$('zoomSlider').addEventListener('input', (event) => {
  const panel = state.panels[state.selectedPanel];
  if (panel) panel.zoom = Number(event.target.value) / 100;
  $('zoomValue').textContent = `${event.target.value}%`;
  renderPreview();
});

[['decorSun', 'sun'], ['decorPalms', 'palms'], ['decorSkyline', 'skyline'], ['decorHalftone', 'halftone']]
  .forEach(([id, key]) => {
    $(id).addEventListener('change', (event) => {
      state.decor[key] = event.target.checked;
      renderPreview();
    });
  });

$('fillAllBtn').addEventListener('click', () => {
  state.panels.forEach((p) => { p.photo = state.selectedPhoto; });
  renderPreview();
});

$('shuffleBtn').addEventListener('click', () => {
  if (!state.photos.length) return;
  state.panels.forEach((p) => {
    p.photo = Math.floor(Math.random() * state.photos.length);
  });
  renderPreview();
});

$('exportBtn').addEventListener('click', () => {
  exportPNG().catch((err) => console.warn(err.message));
});

// ---------- Deterministic screenshot mode ----------
// ?shot=cover&photo=pier,boulevard&caption=VICE+HEAT&layout=hero&grade=sunset
//   &size=wide&style=block&pos=bottom&sub=WELCOME+TO+VICE+CITY
// ?shot=editor — the normal editor with a sample photo already loaded.
// When the cover is fully rendered, window.__shotReady becomes true.

const SAMPLES = { pier: 'samples/pier.jpg', boulevard: 'samples/boulevard.jpg' };

async function loadShotPhotos(param) {
  const names = (param || 'pier').split(',').map((s) => s.trim()).filter(Boolean);
  for (const name of names) {
    const src = SAMPLES[name] || name;
    try {
      await addPhoto(src, name);
    } catch (err) {
      console.warn(err.message);
    }
  }
}

async function applyShotParams(params) {
  if (params.get('layout') && LAYOUTS[params.get('layout')]) {
    applyLayout(params.get('layout'));
  }
  if (params.get('grade') && GRADES[params.get('grade')]) state.grade = params.get('grade');
  if (params.get('style') && CAPTION_STYLES[params.get('style')]) state.captionStyle = params.get('style');
  if (params.get('pos')) state.captionPos = params.get('pos');
  if (params.get('size') && SIZES[params.get('size')]) state.sizeKey = params.get('size');
  if (params.get('caption') !== null) state.caption = params.get('caption');
  if (params.get('sub') !== null) state.subcaption = params.get('sub');
  if (params.get('skyline') !== null) state.decor.skyline = params.get('skyline') === '1';
  if (params.get('sun') !== null) state.decor.sun = params.get('sun') === '1';
  if (params.get('palms') !== null) state.decor.palms = params.get('palms') === '1';
  if (params.get('scale') !== null) state.captionScale = Number(params.get('scale')) || 1;
  // pan=0,-0.4,0 — a vertical nudge per panel (-1..1, negative shows the top).
  if (params.get('pan') !== null) {
    params.get('pan').split(',').forEach((value, i) => {
      if (state.panels[i]) state.panels[i].dy = clamp(Number(value) || 0, -1, 1);
    });
  }
  // One photo fills every panel unless several were loaded.
  if (state.photos.length === 1) {
    state.panels.forEach((p) => { p.photo = 0; });
  } else if (state.photos.length > 1) {
    state.panels.forEach((p, i) => { p.photo = i % state.photos.length; });
  }
  syncControls();
  renderPreview();
}

async function waitForFonts() {
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('900 100px "Vice Display"'),
        document.fonts.load('700 40px "Vice Display"'),
        document.fonts.load('700 40px "Vice Text"'),
        document.fonts.load('400 40px "Vice Text"'),
      ]),
      new Promise((resolve) => setTimeout(resolve, 4000)),
    ]);
  } catch (err) {
    console.warn('font load:', err.message);
  }
  fontsReady = true;
}

async function init() {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  await waitForFonts();
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    await loadShotPhotos(params.get('photo'));
    await applyShotParams(params);
  } else if (shot === 'editor') {
    await loadShotPhotos(params.get('photo') || 'pier');
    await applyShotParams(params);
  } else {
    syncControls();
    renderPreview();
  }
  // Re-render once fonts settle, so lettering is never drawn in a fallback.
  document.fonts.ready.then(() => renderPreview());
  window.__shotReady = true;
}

// Test and screenshot hooks: export the exact PNG the app writes.
window.__viceHeat = {
  state,
  exportDataURL(sizeKey) {
    const canvas = renderCoverToCanvas(sizeKey || state.sizeKey, state);
    return canvas.toDataURL('image/png');
  },
  renderNow: renderPreview,
};

init();
