// Midnight Mile — cover state, layouts, grades and the live DOM poster.
// Every panel is a real photo (sample or the user's own upload). The same
// state drives the live DOM preview and the canvas PNG export.

export const GRADES = {
  sunset:  { label: 'Vice Sunset',  filter: 'saturate(1.28) contrast(1.06) sepia(.18) hue-rotate(-8deg)', tint: ['rgba(255,122,24,.22)', 'rgba(255,0,120,.16)'] },
  neon:    { label: 'Neon Night',   filter: 'saturate(1.55) contrast(1.14) hue-rotate(16deg) brightness(.94)', tint: ['rgba(80,40,255,.28)', 'rgba(255,0,150,.20)'] },
  golden:  { label: 'Golden Hour',  filter: 'sepia(.34) saturate(1.42) contrast(1.05)', tint: ['rgba(255,190,60,.26)', 'rgba(255,120,20,.14)'] },
  noir:    { label: 'Noir Pink',    filter: 'grayscale(.55) contrast(1.16) brightness(.92)', tint: ['rgba(255,60,140,.20)', 'rgba(20,0,40,.25)'] },
  pastel:  { label: 'Miami Pastel', filter: 'saturate(.85) contrast(.92) brightness(1.09)', tint: ['rgba(255,180,220,.20)', 'rgba(120,220,255,.16)'] },
  chrome:  { label: 'Chrome Dusk',  filter: 'saturate(.72) contrast(1.16) brightness(1.03) hue-rotate(-12deg)', tint: ['rgba(90,150,255,.22)', 'rgba(180,120,255,.14)'] },
};

// Panel rectangles are fractions of the cover (x, y, w, h in 0..1).
// The panels band runs from y .075 to .825; the title floats over it.
export const LAYOUTS = {
  nine: {
    label: 'Nine Panel',
    slots: [
      { x: .012, y: .085, w: .318, h: .238 }, { x: .341, y: .085, w: .318, h: .238 }, { x: .670, y: .085, w: .318, h: .238 },
      { x: .012, y: .333, w: .318, h: .238 }, { x: .341, y: .333, w: .318, h: .238 }, { x: .670, y: .333, w: .318, h: .238 },
      { x: .012, y: .581, w: .318, h: .238 }, { x: .341, y: .581, w: .318, h: .238 }, { x: .670, y: .581, w: .318, h: .238 },
    ],
    hero: -1,
  },
  hero: {
    label: 'Hero + Three',
    slots: [
      { x: .012, y: .085, w: .430, h: .734, hero: true },
      { x: .453, y: .085, w: .262, h: .357 },
      { x: .726, y: .085, w: .262, h: .357 },
      { x: .453, y: .452, w: .262, h: .367 },
      { x: .726, y: .452, w: .262, h: .367 },
    ],
    hero: 0,
  },
  bleed: {
    label: 'Full Bleed',
    slots: [{ x: .012, y: .085, w: .976, h: .734, hero: true }],
    hero: 0,
  },
  tilted: {
    label: 'Tilted Stack',
    slots: [
      { x: .030, y: .110, w: .400, h: .640, rot: -4, hero: true },
      { x: .420, y: .090, w: .270, h: .330, rot: 3 },
      { x: .700, y: .130, w: .270, h: .330, rot: -2 },
      { x: .440, y: .450, w: .250, h: .340, rot: 5 },
      { x: .710, y: .480, w: .250, h: .320, rot: -3 },
    ],
    hero: 0,
  },
  bands: {
    label: 'Film Bands',
    slots: [
      { x: .012, y: .085, w: .976, h: .238 },
      { x: .012, y: .333, w: .976, h: .238 },
      { x: .012, y: .581, w: .976, h: .238 },
    ],
    hero: -1,
  },
  turntable: {
    label: 'Turntable',
    slots: [
      { x: .012, y: .085, w: .430, h: .734, hero: true },
      { x: .453, y: .085, w: .262, h: .357 },
      { x: .726, y: .085, w: .262, h: .357 },
      { x: .453, y: .452, w: .262, h: .367 },
      { x: .726, y: .452, w: .262, h: .367 },
    ],
    hero: 0,
  },
};

// Which panel index fills each layout slot (nine uses all nine).
export const LAYOUT_PANELS = {
  nine: [0, 1, 2, 3, 4, 5, 6, 7, 8],
  hero: [0, 1, 2, 3, 4],
  bleed: [0],
  tilted: [0, 1, 2, 3, 4],
  bands: [5, 2, 4],
  turntable: [0, 1, 2, 3, 4],
};

function samplePanel(img, role, loc, time, quip, portrait, heat = false) {
  return { img, role, loc, time, quip, portrait, heat, px: 0.5, py: portrait ? 0.32 : 0.5, zoom: 1 };
}

export function defaultState() {
  return {
    title: 'MIDNIGHT MILE',
    subtitle: 'One Last Run',
    quote: 'PURE MIDNIGHT MAYHEM',
    quoteSource: 'THE HARBOR GAZETTE',
    tagline: 'FIVE FRIENDS · ONE COAST · NO WAY BACK',
    volume: 'VOL. 01',
    billing: 'A MIDNIGHT MILE PICTURE · STARRING YOU · SHOT ON YOUR OWN CAMERA · GRADED BY HAND',
    layout: 'hero',
    grade: 'sunset',
    size: '1920x1080',
    showSeal: true,
    showBarcode: true,
    showComing: true,
    cycle: 'sunset',
    panels: [
      samplePanel('samples/p5.jpg', 'THE DRIVER', 'OCEAN DRIVE', '6:42 PM', 'LOOKING FOR TROUBLE', true),
      samplePanel('samples/p2.jpg', 'THE INSIDER', 'ROOFTOP BAR', '8:05 PM', 'OWNS THE SKYLINE', true),
      samplePanel('samples/s3.jpg', 'THE GETAWAY', 'CORAL CAUSEWAY', '7:15 PM', 'FULL THROTTLE', false, true),
      samplePanel('samples/p4.jpg', 'THE CLOSER', 'MARINA BAY', '9:40 PM', 'NO WITNESSES', true),
      samplePanel('samples/s2.jpg', 'THE FIXER', 'NEON GARAGE', '3:40 AM', 'CLOSES LATE', false),
      samplePanel('samples/s1.jpg', 'THE LOOKOUT', 'BONFIRE BEACH', '6:15 PM', 'SEES EVERYTHING', false),
      samplePanel('samples/p1.jpg', 'THE RIDER', 'COAST HIGHWAY', '2:15 PM', 'NEVER BRAKES', true),
      samplePanel('samples/s5.jpg', 'THE MECHANIC', 'RAMEN ROW', '11:20 PM', 'ALWAYS ON TIME', false),
      samplePanel('samples/s6.jpg', 'THE BOSS', 'HARBOR TOWER', '10:05 PM', 'OWNS THE SKYLINE', false),
    ],
  };
}

// Face-aware crop heuristic: portraits favour the upper third (where the
// face usually sits), scenes stay centred. Applied when a photo is placed.
export function faceAwareFocus(isPortrait) {
  return { px: 0.5, py: isPortrait ? 0.32 : 0.5 };
}

export function renderCover(state, selectedIndex, onSelect) {
  const cover = document.getElementById('cover');
  cover.dataset.layout = state.layout;
  cover.dataset.grade = state.grade;
  cover.dataset.size = state.size;
  document.getElementById('titleText').textContent = state.title;
  document.getElementById('coverSubtitle').textContent = state.subtitle;
  document.getElementById('quoteText').textContent = '“' + state.quote + '”';
  document.getElementById('quoteSrc').textContent = '— ' + state.quoteSource;
  document.getElementById('taglineText').textContent = state.tagline;
  document.getElementById('volBadge').textContent = state.volume;
  document.getElementById('billingText').textContent = state.billing;
  document.getElementById('sealBadge').style.display = state.showSeal ? '' : 'none';
  document.getElementById('barcodeBox').style.display = state.showBarcode ? '' : 'none';
  document.getElementById('comingSoon').style.display = state.showComing ? '' : 'none';

  const wrap = document.getElementById('coverPanels');
  wrap.innerHTML = '';
  const layout = LAYOUTS[state.layout];
  const picks = LAYOUT_PANELS[state.layout];
  picks.forEach((panelIndex, slotIndex) => {
    const p = state.panels[panelIndex];
    const r = layout.slots[slotIndex];
    const el = document.createElement('div');
    el.className = 'cover-panel' + (r.hero ? ' hero-pop' : '') + (panelIndex === selectedIndex ? ' selected' : '');
    el.style.left = (r.x * 100) + '%';
    el.style.top = (r.y * 100) + '%';
    el.style.width = (r.w * 100) + '%';
    el.style.height = (r.h * 100) + '%';
    if (r.rot) el.style.transform = 'rotate(' + r.rot + 'deg)';
    el.style.zIndex = r.hero ? 6 : 2 + slotIndex;
    el.dataset.panel = String(panelIndex);

    const photo = document.createElement('div');
    photo.className = 'photo';
    const img = document.createElement('img');
    img.src = p.img;
    img.alt = p.role;
    img.draggable = false;
    // Pan + zoom: translate the photo inside its frame, scale for zoom.
    const tx = (0.5 - p.px) * 60 * (p.zoom - 0.4);
    const ty = (0.5 - p.py) * 60 * (p.zoom - 0.4);
    photo.style.transform = 'translate(' + tx.toFixed(1) + '%, ' + ty.toFixed(1) + '%) scale(' + p.zoom + ')';
    photo.appendChild(img);
    el.appendChild(photo);

    const rim = document.createElement('div');
    rim.className = 'rim';
    el.appendChild(rim);

    if (p.heat) {
      const pill = document.createElement('div');
      pill.className = 'heat-pill';
      pill.textContent = 'HEAT ★★★★☆';
      el.appendChild(pill);
    }

    const tag = document.createElement('div');
    tag.className = 'role-tag';
    tag.innerHTML = '';
    tag.appendChild(document.createTextNode(p.role));
    const sub = document.createElement('small');
    sub.textContent = p.loc + ' · ' + p.time + ' · ' + p.quip;
    tag.appendChild(sub);
    el.appendChild(tag);

    el.addEventListener('pointerdown', (e) => { onSelect(panelIndex, e, el); });
    wrap.appendChild(el);
  });
}

// Fit the chrome title to the cover width so long titles never overflow.
export function fitTitle() {
  const title = document.getElementById('coverTitle');
  const cover = document.getElementById('cover');
  const text = document.getElementById('titleText');
  title.style.fontSize = '';
  const max = cover.clientWidth * 0.94;
  let size = parseFloat(getComputedStyle(title).fontSize);
  for (let i = 0; i < 30 && text.scrollWidth > max && size > 12; i++) {
    size *= 0.94;
    title.style.fontSize = size + 'px';
  }
}
