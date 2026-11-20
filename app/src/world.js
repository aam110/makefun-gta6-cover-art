// Midnight Mile — the living 3D Vice City world behind the cover.
// Real Three.js scene (towers, palms, ocean, sun, neon, clouds, particles)
// with camera parallax + drift and a day / sunset / night cycle.
// If WebGL is unavailable, a 2D canvas skyline keeps the studio alive.

import * as THREE from 'three';

const CYCLES = {
  day:    { sun: [10, 9, -14], sunColor: 0xfff3b0, sunSize: 1.6, fog: 0x9fd8ef, hemi: 1.1, stars: 0, neon: 0.4, water: 0x1e6f8e, sky: ['#7ec8e3', '#cfeef7', '#ffd98a'] },
  sunset: { sun: [0, 2.4, -16], sunColor: 0xff7a18, sunSize: 3.2, fog: 0x7a1e5e, hemi: 0.7, stars: 0.12, neon: 1.0, water: 0x4a1e6e, sky: ['#2a0f4a', '#7a1e5e', '#ff7a18'] },
  night:  { sun: [-8, 7, -16], sunColor: 0xdfe8ff, sunSize: 1.3, fog: 0x0a0618, hemi: 0.28, stars: 1, neon: 1.6, water: 0x0a1030, sky: ['#05030f', '#12082e', '#2a0f4a'] },
};

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function windowsTexture(rng) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#160b2e'; g.fillRect(0, 0, 64, 128);
  for (let y = 6; y < 124; y += 10) {
    for (let x = 5; x < 60; x += 10) {
      if (rng() < 0.42) {
        g.fillStyle = rng() < 0.7 ? '#ffd98a' : (rng() < 0.5 ? '#ff5da2' : '#7df0ff');
        g.globalAlpha = 0.55 + rng() * 0.45;
        g.fillRect(x, y, 6, 6);
      }
    }
  }
  g.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,220,140,.55)');
  grad.addColorStop(1, 'rgba(255,120,40,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function cloudTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 96;
  const g = c.getContext('2d');
  for (const [x, y, r] of [[70, 60, 34], [120, 48, 42], [180, 60, 32], [105, 66, 38], [150, 66, 36]]) {
    const grad = g.createRadialGradient(x, y, 4, x, y, r);
    grad.addColorStop(0, 'rgba(255,220,230,.75)');
    grad.addColorStop(1, 'rgba(255,220,230,0)');
    g.fillStyle = grad;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  return new THREE.CanvasTexture(c);
}

function makePalm(material) {
  const palm = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.16, 2.6, 6),
    material,
  );
  trunk.position.y = 1.3;
  trunk.rotation.z = 0.12;
  palm.add(trunk);
  for (let i = 0; i < 7; i++) {
    const frond = new THREE.Mesh(
      new THREE.ConeGeometry(0.55, 2.4, 4),
      material,
    );
    frond.scale.set(1, 1, 0.12);
    const a = (i / 7) * Math.PI * 2;
    frond.position.set(Math.cos(a) * 0.9, 2.7, Math.sin(a) * 0.9);
    frond.rotation.set(Math.sin(a) * 1.15, 0, -Math.cos(a) * 1.15);
    palm.add(frond);
  }
  return palm;
}

export function createWorld(canvas, onStatus) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (err) {
    onStatus(false, 'webgl-unavailable');
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x7a1e5e, 18, 46);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 120);
  camera.position.set(0, 3.2, 16);

  const rng = mulberry32(20261120);
  const hemi = new THREE.HemisphereLight(0xffd9ec, 0x1a0533, 0.7);
  scene.add(hemi);
  const sunLight = new THREE.DirectionalLight(0xffb36b, 1.4);
  sunLight.position.set(0, 6, -8);
  scene.add(sunLight);

  // Sun + glow sprite.
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xff7a18, fog: false });
  const sun = new THREE.Mesh(new THREE.CircleGeometry(3.2, 40), sunMat);
  sun.position.set(0, 2.4, -16);
  scene.add(sun);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture(), color: 0xff9a3d, transparent: true, opacity: 0.9, fog: false, depthWrite: false,
  }));
  glow.scale.set(16, 16, 1);
  glow.position.copy(sun.position);
  scene.add(glow);

  // Ocean with a scrolling streak texture for moving reflections.
  const streak = document.createElement('canvas');
  streak.width = 256; streak.height = 256;
  const sg = streak.getContext('2d');
  sg.fillStyle = '#241040'; sg.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 90; i++) {
    sg.fillStyle = rng() < 0.5 ? 'rgba(255,150,80,.5)' : 'rgba(255,80,180,.4)';
    sg.fillRect(rng() * 256, rng() * 256, 14 + rng() * 40, 1.5);
  }
  const streakTex = new THREE.CanvasTexture(streak);
  streakTex.wrapS = streakTex.wrapT = THREE.RepeatWrapping;
  streakTex.repeat.set(6, 3);
  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 26),
    new THREE.MeshBasicMaterial({ map: streakTex, color: 0x8a5aa8, transparent: true, opacity: 0.92 }),
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(0, -1.6, 2);
  scene.add(ocean);

  // Skyline: two rows of towers with lit windows.
  const winTex = windowsTexture(rng);
  const towerMat = new THREE.MeshStandardMaterial({ map: winTex, emissive: 0xffffff, emissiveMap: winTex, emissiveIntensity: 0.9, roughness: 0.9 });
  const towers = new THREE.Group();
  for (let i = 0; i < 34; i++) {
    const w = 1.2 + rng() * 1.8;
    const h = 2.5 + rng() * rng() * 9;
    const d = 1.2 + rng() * 1.4;
    const t = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), towerMat);
    const row = i % 2 === 0 ? -9 : -13;
    t.position.set(-22 + (i / 34) * 44 + (rng() - 0.5) * 1.5, h / 2 - 1.6, row + (rng() - 0.5) * 2);
    towers.add(t);
  }
  scene.add(towers);

  // Neon signs on the skyline, flickering.
  const neonMats = [];
  const neonColors = [0xff2e88, 0x2ee6ff, 0xffd23f];
  for (let i = 0; i < 6; i++) {
    const m = new THREE.MeshBasicMaterial({ color: neonColors[i % 3], transparent: true, opacity: 0.95 });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.6 + rng(), 0.5), m);
    sign.position.set(-16 + i * 6.4, 1.5 + rng() * 4, -8.4);
    scene.add(sign);
    neonMats.push(m);
  }

  // Palms along the shore.
  const palmMat = new THREE.MeshStandardMaterial({ color: 0x120826, roughness: 1 });
  for (let i = 0; i < 9; i++) {
    const palm = makePalm(palmMat);
    palm.position.set(-20 + i * 5 + (rng() - 0.5) * 2, -1.6, -4.5 + (rng() - 0.5) * 2.5);
    const s = 0.8 + rng() * 0.7;
    palm.scale.set(s, s, s);
    palm.rotation.y = rng() * Math.PI;
    scene.add(palm);
  }

  // Drifting clouds.
  const cloudTex = cloudTexture();
  const clouds = [];
  for (let i = 0; i < 6; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, opacity: 0.5 + rng() * 0.3, depthWrite: false }));
    sp.scale.set(10 + rng() * 8, 3.6 + rng() * 1.6, 1);
    sp.position.set(-24 + rng() * 48, 7 + rng() * 5, -14 - rng() * 4);
    sp.userData.speed = 0.12 + rng() * 0.25;
    scene.add(sp);
    clouds.push(sp);
  }

  // Stars (visible at night).
  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(320 * 3);
  for (let i = 0; i < 320; i++) {
    starPos[i * 3] = (rng() - 0.5) * 70;
    starPos[i * 3 + 1] = 4 + rng() * 22;
    starPos[i * 3 + 2] = -18 - rng() * 10;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.14, transparent: true, opacity: 0.12, fog: false });
  scene.add(new THREE.Points(starGeo, starMat));

  // Floating ember particles.
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(180 * 3);
  for (let i = 0; i < 180; i++) {
    pPos[i * 3] = (rng() - 0.5) * 36;
    pPos[i * 3 + 1] = -1 + rng() * 10;
    pPos[i * 3 + 2] = -6 + rng() * 14;
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const pMat = new THREE.PointsMaterial({ color: 0xffc46b, size: 0.09, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
  const particles = new THREE.Points(pGeo, pMat);
  scene.add(particles);

  let cycle = 'sunset';
  let target = CYCLES.sunset;
  const current = { sunY: 2.4, sunX: 0, hemi: 0.7, stars: 0.12, neon: 1.0, sunSize: 3.2 };
  const fogColor = new THREE.Color(0x7a1e5e);
  const targetFog = new THREE.Color(0x7a1e5e);
  const sunColor = new THREE.Color(0xff7a18);
  const targetSunColor = new THREE.Color(0xff7a18);

  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('pointermove', (e) => {
    mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
    mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  const clock = new THREE.Clock();
  let raf = 0;
  function tick() {
    raf = requestAnimationFrame(tick);
    const t = clock.getElapsedTime();
    const k = 0.02; // easing toward the cycle target
    current.sunY += (target.sun[1] - current.sunY) * k;
    current.sunX += (target.sun[0] - current.sunX) * k;
    current.hemi += (target.hemi - current.hemi) * k;
    current.stars += (target.stars - current.stars) * k;
    current.neon += (target.neon - current.neon) * k;
    current.sunSize += (target.sunSize - current.sunSize) * k;
    fogColor.lerp(targetFog, k);
    sunColor.lerp(targetSunColor, k);
    scene.fog.color.copy(fogColor);
    hemi.intensity = current.hemi;
    starMat.opacity = current.stars;
    sun.position.set(current.sunX, current.sunY, -16);
    sun.scale.setScalar(current.sunSize / 3.2);
    sunMat.color.copy(sunColor);
    glow.position.copy(sun.position);
    glow.material.opacity = 0.35 + current.neon * 0.45;

    // Slow automatic camera drift + mouse parallax.
    mouse.x += (mouse.tx - mouse.x) * 0.04;
    mouse.y += (mouse.ty - mouse.y) * 0.04;
    camera.position.x = Math.sin(t * 0.07) * 1.4 + mouse.x * 1.6;
    camera.position.y = 3.2 + Math.cos(t * 0.05) * 0.5 - mouse.y * 0.8;
    camera.lookAt(0, 1.6, -8);

    // Moving water reflections + drifting clouds + rising embers.
    streakTex.offset.y = (t * 0.008) % 1;
    streakTex.offset.x = (Math.sin(t * 0.05) * 0.02) % 1;
    for (const c of clouds) {
      c.position.x += c.userData.speed * 0.016;
      if (c.position.x > 30) c.position.x = -30;
    }
    particles.position.y = Math.sin(t * 0.18) * 0.5;
    particles.rotation.y = t * 0.01;

    // Neon flicker: brief random dips.
    for (let i = 0; i < neonMats.length; i++) {
      const dip = Math.sin(t * 13 + i * 7) > 0.995 ? 0.25 : 1;
      neonMats[i].opacity = Math.min(1, current.neon) * dip;
    }
    // Sun shimmer.
    sunMat.color.offsetHSL(0, 0, Math.sin(t * 0.8) * 0.02);

    renderer.render(scene, camera);
  }
  tick();
  onStatus(true, 'webgl');

  return {
    setCycle(name) {
      if (!CYCLES[name]) return;
      cycle = name;
      target = CYCLES[name];
      targetFog.set(target.fog);
      targetSunColor.set(target.sunColor);
      document.getElementById('stage').style.background =
        'linear-gradient(180deg, ' + target.sky.join(', ') + ')';
    },
    getCycle() { return cycle; },
    dispose() { cancelAnimationFrame(raf); renderer.dispose(); },
  };
}

// 2D fallback: an animated skyline on a plain canvas, so the studio is
// never a blank screen when WebGL is unavailable.
export function createFallback2D(canvas) {
  const g = canvas.getContext('2d');
  const rng = mulberry32(777);
  const buildings = [];
  for (let i = 0; i < 26; i++) buildings.push({ x: i * 0.042, w: 0.03 + rng() * 0.02, h: 0.18 + rng() * rng() * 0.4 });
  const stars = [];
  for (let i = 0; i < 90; i++) stars.push({ x: rng(), y: rng() * 0.5, r: rng() * 1.4 + 0.4 });
  let raf = 0;
  function draw(now) {
    raf = requestAnimationFrame(draw);
    const t = now / 1000;
    const w = canvas.width = canvas.clientWidth || 800;
    const h = canvas.height = canvas.clientHeight || 450;
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#2a0f4a'); sky.addColorStop(0.55, '#7a1e5e'); sky.addColorStop(0.8, '#ff7a18'); sky.addColorStop(1, '#1a0533');
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    // Sun with shimmer.
    const sy = h * 0.62 + Math.sin(t * 0.4) * 3;
    const sg = g.createRadialGradient(w * 0.5, sy, 4, w * 0.5, sy, w * 0.12);
    sg.addColorStop(0, 'rgba(255,220,140,.95)'); sg.addColorStop(1, 'rgba(255,122,24,0)');
    g.fillStyle = sg; g.beginPath(); g.arc(w * 0.5, sy, w * 0.12, 0, 7); g.fill();
    g.fillStyle = '#ff7a18'; g.beginPath(); g.arc(w * 0.5, sy, w * 0.035, 0, 7); g.fill();
    // Stars.
    g.fillStyle = 'rgba(255,255,255,.8)';
    for (const s of stars) { g.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(t + s.x * 20)); g.fillRect(s.x * w, s.y * h, s.r, s.r); }
    g.globalAlpha = 1;
    // Buildings with lit windows.
    const horizon = h * 0.78;
    for (const b of buildings) {
      g.fillStyle = '#160b2e';
      g.fillRect(b.x * w, horizon - b.h * h, b.w * w, b.h * h);
      g.fillStyle = 'rgba(255,217,138,.85)';
      for (let wy = horizon - b.h * h + 6; wy < horizon - 8; wy += 12) {
        for (let wx = b.x * w + 4; wx < (b.x + b.w) * w - 5; wx += 11) {
          if (Math.sin(wx * 3.1 + wy * 1.7) > 0.2) g.fillRect(wx, wy, 5, 5);
        }
      }
    }
    // Water with moving reflection streaks.
    g.fillStyle = '#241040'; g.fillRect(0, horizon, w, h - horizon);
    for (let i = 0; i < 40; i++) {
      const yy = horizon + ((i * 37 + t * 12) % (h - horizon));
      g.fillStyle = i % 2 ? 'rgba(255,150,80,.4)' : 'rgba(255,80,180,.35)';
      g.fillRect(((i * 91) % w), yy, 20 + (i % 5) * 12, 1.5);
    }
  }
  raf = requestAnimationFrame(draw);
  return { dispose() { cancelAnimationFrame(raf); } };
}
