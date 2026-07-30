// Kolibri armature — the page's only WebGL scene.
//
// A calibration rig drawn in thin gold lines: a core instrument (spindle,
// gimbal rings, ticked equator) held inside three tiers of scaffolding. Scroll
// position through the guidance-removal section withdraws the scaffolding tier
// by tier — outer cage, struts, then the measurement plate — until only the
// core keeps turning. Same object, same meaning as the section: the support is
// removed as the learner takes over the decisions.
//
// Decorative only. The canvas is aria-hidden and carries no information that is
// not also in the DOM.
import * as THREE from '/assets/vendor/three.module.min.js';

const GOLD = 0xc9a962;
const GRAY = 0x6f6a60;

const clamp01 = (n) => (n < 0 ? 0 : n > 1 ? 1 : n);

function material(color, opacity) {
  return new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
}

function loop(points, mat) {
  return new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), mat);
}

function segments(points, mat) {
  return new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points), mat);
}

function circlePoints(radius, count) {
  const points = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
  }
  return points;
}

const v = (x, y, z) => new THREE.Vector3(x, y, z);

// Core instrument: always present, brightens as the scaffolding leaves.
function buildCore(detail) {
  const group = new THREE.Group();
  const mats = [];

  const frameMat = material(GOLD, 0.5);
  const ringMat = material(GOLD, 0.4);
  const coreMat = material(GOLD, 0.6);
  mats.push(frameMat, ringMat, coreMat);

  group.add(segments([v(0, -1.15, 0), v(0, 1.15, 0)], frameMat));

  const equator = loop(circlePoints(1, detail.ringSegments), frameMat);
  const meridian = loop(circlePoints(0.78, detail.ringSegments), ringMat);
  meridian.rotation.x = Math.PI / 2;
  const inner = loop(circlePoints(0.56, detail.ringSegments), ringMat);
  inner.rotation.z = Math.PI / 2;
  group.add(equator, meridian, inner);

  const ticks = [];
  for (let i = 0; i < detail.ticks; i++) {
    const a = (i / detail.ticks) * Math.PI * 2;
    const long = i % 4 === 0;
    const r0 = 1;
    const r1 = 1 + (long ? 0.13 : 0.07);
    ticks.push(v(Math.cos(a) * r0, 0, Math.sin(a) * r0), v(Math.cos(a) * r1, 0, Math.sin(a) * r1));
  }
  group.add(segments(ticks, ringMat));

  const hub = new THREE.LineSegments(
    new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(0.34, 0)),
    coreMat,
  );
  group.add(hub);

  return { group, mats, spin: [meridian, inner], hub };
}

// Tier 0: measurement plate under the rig — the fully guided lesson, where the
// file, the expected output and the check are all laid out for you.
function buildPlate(detail) {
  const group = new THREE.Group();
  const mat = material(GRAY, 0.34);
  const y = -1.18;
  const half = 1.7;
  const points = [
    v(-half, y, -half), v(half, y, -half),
    v(half, y, -half), v(half, y, half),
    v(half, y, half), v(-half, y, half),
    v(-half, y, half), v(-half, y, -half),
    v(-half - 0.28, y, 0), v(half + 0.28, y, 0),
    v(0, y, -half - 0.28), v(0, y, half + 0.28),
  ];
  for (let i = 1; i < detail.gridLines; i++) {
    const t = -half + (i / detail.gridLines) * half * 2;
    points.push(v(t, y, -half), v(t, y, half), v(-half, y, t), v(half, y, t));
  }
  for (const [x, z] of [[-half, -half], [half, -half], [half, half], [-half, half]]) {
    points.push(v(x, y, z), v(x, y + 0.55, z));
  }
  group.add(segments(points, mat));
  return { group, mats: [mat] };
}

// Tier 1: struts and tie rings — partial guidance, still holding the shape.
function buildStruts(detail) {
  const group = new THREE.Group();
  const mat = material(GOLD, 0.26);
  const points = [];
  const legs = detail.legs;
  for (let i = 0; i < legs; i++) {
    const a = (i / legs) * Math.PI * 2;
    points.push(v(Math.cos(a) * 1.52, -1.18, Math.sin(a) * 1.52), v(0, 1.28, 0));
  }
  group.add(segments(points, mat));
  for (const [radius, y] of [[1.1, -0.42], [0.66, 0.46]]) {
    const tie = loop(circlePoints(radius, detail.ringSegments / 2), mat);
    tie.position.y = y;
    group.add(tie);
  }
  return { group, mats: [mat] };
}

// Tier 2: outer cage — the last visible boundary around the work.
function buildCage() {
  const group = new THREE.Group();
  const mat = material(GRAY, 0.22);
  const radius = 1.88;
  const top = 1.38;
  const points = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const b = ((i + 1) / 6) * Math.PI * 2;
    const x0 = Math.cos(a) * radius;
    const z0 = Math.sin(a) * radius;
    const x1 = Math.cos(b) * radius;
    const z1 = Math.sin(b) * radius;
    points.push(v(x0, top, z0), v(x1, top, z1));
    points.push(v(x0, -top, z0), v(x1, -top, z1));
    points.push(v(x0, -top, z0), v(x0, top, z0));
  }
  group.add(segments(points, mat));
  return { group, mats: [mat] };
}

export function mountArmature({ canvas, driver, reduceMotion }) {
  const lowPower =
    window.matchMedia('(max-width: 900px)').matches ||
    (navigator.hardwareConcurrency || 8) <= 4;

  const detail = lowPower
    ? { ringSegments: 48, ticks: 12, gridLines: 4, legs: 4 }
    : { ringSegments: 96, ticks: 24, gridLines: 8, legs: 6 };

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: !lowPower,
      powerPreference: 'low-power',
    });
  } catch {
    return null;
  }
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1 : 1.5));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 2.8, 0.1, 40);

  const core = buildCore(detail);
  const tiers = [buildPlate(detail), buildStruts(detail), buildCage()];
  const rig = new THREE.Group();
  rig.add(core.group);
  for (const tier of tiers) rig.add(tier.group);
  rig.rotation.x = 0.22;
  scene.add(rig);

  const baseOpacity = tiers.map((tier) => tier.mats[0].opacity);

  const resize = () => {
    const width = canvas.clientWidth || 1;
    const height = canvas.clientHeight || 1;
    renderer.setSize(width, height, false);
    const aspect = width / height;
    camera.aspect = aspect;
    camera.position.set(0, 0.5, aspect > 1.6 ? 7.6 : 7.6 * (1.6 / Math.max(aspect, 0.7)) ** 0.6);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  };

  // 0 while the section is entering, 1 once it has scrolled past.
  const progress = () => {
    const rect = driver.getBoundingClientRect();
    const span = rect.height + window.innerHeight;
    const raw = span > 0 ? (window.innerHeight - rect.top) / span : 0;
    return clamp01((raw - 0.2) / 0.6);
  };

  const apply = (p, time) => {
    tiers.forEach((tier, i) => {
      const removed = clamp01((p - i * 0.26) / 0.3);
      const opacity = baseOpacity[i] * (1 - removed);
      tier.group.visible = opacity > 0.004;
      for (const mat of tier.mats) mat.opacity = opacity;
      const lift = removed * removed;
      tier.group.position.y = lift * (i === 0 ? -0.5 : 0.45);
      tier.group.scale.setScalar(1 + lift * 0.22);
    });
    core.mats[0].opacity = 0.42 + p * 0.34;
    core.mats[1].opacity = 0.32 + p * 0.3;
    core.mats[2].opacity = 0.5 + p * 0.4;
    rig.rotation.y = 0.35 + p * 0.9 + time * 0.055;
    core.spin[0].rotation.y = time * 0.09;
    core.spin[1].rotation.x = -time * 0.07;
    core.hub.rotation.y = -time * 0.12;
  };

  resize();

  if (reduceMotion) {
    apply(0.5, 0);
    renderer.render(scene, camera);
    window.addEventListener('resize', () => {
      resize();
      renderer.render(scene, camera);
    }, { passive: true });
    return { renderer };
  }

  let running = false;
  let frame = 0;
  const start = performance.now();

  const tick = () => {
    if (!running) return;
    apply(progress(), (performance.now() - start) / 1000);
    renderer.render(scene, camera);
    frame = requestAnimationFrame(tick);
  };

  const setRunning = (next) => {
    if (next === running) return;
    running = next;
    if (running) frame = requestAnimationFrame(tick);
    else cancelAnimationFrame(frame);
  };

  const visible = { onScreen: false };
  new IntersectionObserver((entries) => {
    visible.onScreen = entries.some((entry) => entry.isIntersecting);
    setRunning(visible.onScreen && !document.hidden);
  }, { rootMargin: '120px' }).observe(canvas);

  document.addEventListener('visibilitychange', () => {
    setRunning(visible.onScreen && !document.hidden);
  });

  window.addEventListener('resize', resize, { passive: true });

  return { renderer, setRunning };
}
