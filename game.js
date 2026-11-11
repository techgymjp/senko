// 線香花火 — 縁側で楽しむ 3D 線香花火ゲーム
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const T = (k, ...a) => window.SENKO_T(k, ...a);
const FONT = "'Shippori Mincho', 'Hiragino Mincho ProN', 'Yu Mincho', serif";

// ============================================================
// レンダラ
// ============================================================
const glCanvas = document.getElementById('gl');
const hud = document.getElementById('hud');
const hctx = hud.getContext('2d');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, powerPreference: 'high-performance' });
} catch (e) {
  document.getElementById('err').style.display = 'flex';
  document.getElementById('title').classList.add('hidden');
  throw e;
}
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x070915, 5, 26);
const camera = new THREE.PerspectiveCamera(42, 1, 0.02, 120);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.35, 0.8);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ============================================================
// テクスチャ（すべてその場で描く）
// ============================================================
function canvasTex(w, h, draw, opt = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (opt.srgb !== false) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (opt.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(opt.repeat[0], opt.repeat[1]); }
  return t;
}

// 加算合成用：黒地に白のにじみ（アルファに頼らない）
const glowTex = canvasTex(128, 128, (c, w) => {
  c.fillStyle = '#000'; c.fillRect(0, 0, w, w);
  const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  // ガウス状に減衰させ、四角の端より手前で完全に 0 にする（四角く見えないように）
  for (let i = 0; i <= 20; i++) {
    const t = i / 20, r = t * 0.8;
    const v = t >= 1 ? 0 : Math.round(255 * Math.exp(-r * r * 9) * (1 - t * t));
    g.addColorStop(r, `rgb(${v},${v},${v})`);
  }
  g.addColorStop(1, 'rgb(0,0,0)');
  c.fillStyle = g; c.fillRect(0, 0, w, w);
}, { srgb: false });

// 着火の炎（下が白く、上へ橙にすぼまる）
const flameTex = canvasTex(64, 128, (c, w, h) => {
  c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 3; i++) {
    const g = c.createRadialGradient(w / 2, h * 0.66, 0, w / 2, h * 0.66, h * (0.32 - i * 0.07));
    const col = [[255, 120, 30], [255, 190, 90], [255, 245, 210]][i];
    g.addColorStop(0, `rgb(${col})`); g.addColorStop(1, 'rgb(0,0,0)');
    c.save(); c.globalCompositeOperation = 'lighter';
    c.translate(w / 2, h * 0.66); c.scale(0.6 - i * 0.1, 1); c.translate(-w / 2, -h * 0.66);
    c.fillStyle = g; c.fillRect(0, 0, w * 3, h);
    c.restore();
  }
}, { srgb: false });

const smokeTex = canvasTex(128, 128, (c, w) => {
  for (let i = 0; i < 14; i++) {
    const x = w / 2 + rand(-18, 18), y = w / 2 + rand(-18, 18), r = rand(18, 40);
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.22)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, w);
  }
}, { srgb: false });

const ringTex = canvasTex(256, 256, (c, w) => {
  c.fillStyle = '#000'; c.fillRect(0, 0, w, w);
  const g = c.createRadialGradient(w / 2, w / 2, w * 0.36, w / 2, w / 2, w / 2);
  g.addColorStop(0, 'rgb(0,0,0)');
  g.addColorStop(0.55, 'rgb(230,230,230)');
  g.addColorStop(1, 'rgb(0,0,0)');
  c.fillStyle = g; c.fillRect(0, 0, w, w);
}, { srgb: false });

// 縁側の板（長年磨かれた木）
const woodTex = canvasTex(1024, 512, (c, w, h) => {
  const ph = h / 5;
  for (let p = 0; p < 5; p++) {
    const y0 = p * ph;
    const base = [rand(88, 112), rand(58, 72), rand(36, 46)];
    c.fillStyle = `rgb(${base[0]},${base[1]},${base[2]})`;
    c.fillRect(0, y0, w, ph);
    for (let i = 0; i < 70; i++) {
      const yy = y0 + Math.random() * ph, amp = rand(1, 5), fr = rand(0.004, 0.02), ph0 = rand(0, 6);
      c.strokeStyle = Math.random() < 0.5 ? `rgba(40,22,10,${rand(0.08, 0.3)})` : `rgba(160,120,80,${rand(0.05, 0.15)})`;
      c.lineWidth = rand(0.6, 2.2);
      c.beginPath();
      for (let x = 0; x <= w; x += 8) {
        const y = yy + Math.sin(x * fr + ph0) * amp;
        x === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
      }
      c.stroke();
    }
    // 艶のむら
    const g = c.createLinearGradient(0, y0, 0, y0 + ph);
    g.addColorStop(0, 'rgba(255,220,170,0.06)'); g.addColorStop(0.5, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.18)');
    c.fillStyle = g; c.fillRect(0, y0, w, ph);
    // 板の継ぎ目
    c.fillStyle = 'rgba(15,8,4,0.85)'; c.fillRect(0, y0, w, 2);
    const jx = rand(100, w - 100);
    c.fillRect(jx, y0, 2, ph);
  }
}, { repeat: [5, 8] });

const soilTex = canvasTex(512, 512, (c, w, h) => {
  c.fillStyle = '#2b251e'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 9000; i++) {
    const v = rand(20, 80);
    c.fillStyle = `rgba(${v + 10},${v},${v - 8},${rand(0.2, 0.6)})`;
    c.fillRect(Math.random() * w, Math.random() * h, rand(1, 3), rand(1, 3));
  }
  for (let i = 0; i < 40; i++) {  // 苔のむら
    const x = Math.random() * w, y = Math.random() * h, r = rand(20, 70);
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(40,60,25,0.35)'); g.addColorStop(1, 'rgba(40,60,25,0)');
    c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (let i = 0; i < 260; i++) {  // 小石
    const v = rand(70, 120);
    c.fillStyle = `rgba(${v},${v - 4},${v - 10},0.8)`;
    c.beginPath(); c.ellipse(Math.random() * w, Math.random() * h, rand(1.5, 4), rand(1, 3), rand(0, 3), 0, Math.PI * 2); c.fill();
  }
}, { repeat: [10, 10] });

const skyTex = canvasTex(2048, 1024, (c, w, h) => {
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#010208');
  g.addColorStop(0.35, '#050819');
  g.addColorStop(0.5, '#141a3a');
  g.addColorStop(0.56, '#0a0c1a');
  g.addColorStop(1, '#050608');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 2600; i++) {
    const y = Math.pow(Math.random(), 1.3) * h * 0.48;
    const r = Math.random() < 0.04 ? rand(1.1, 1.8) : rand(0.4, 1);
    c.fillStyle = `rgba(225,225,255,${rand(0.2, 0.9) * (1 - y / (h * 0.5)) + 0.05})`;
    c.beginPath(); c.arc(Math.random() * w, y, r, 0, Math.PI * 2); c.fill();
  }
});

// ============================================================
// 舞台：夏の夜の縁側と庭
// ============================================================
const FLOOR_Y = 0.45, EDGE_Z = 0.9;

const sky = new THREE.Mesh(new THREE.SphereGeometry(60, 32, 16), new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false }));
scene.add(sky);

// 月
const moonTex = canvasTex(256, 256, (c, w) => {
  const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  g.addColorStop(0, 'rgba(240,230,190,0.35)'); g.addColorStop(0.3, 'rgba(240,230,190,0.1)'); g.addColorStop(1, 'rgba(240,230,190,0)');
  c.fillStyle = g; c.fillRect(0, 0, w, w);
  c.save();
  c.fillStyle = '#f2e8c4'; c.beginPath(); c.arc(w / 2, w / 2, 22, 0, Math.PI * 2); c.fill();
  c.globalCompositeOperation = 'destination-out';
  c.beginPath(); c.arc(w / 2 + 10, w / 2 - 6, 20, 0, Math.PI * 2); c.fill();
  c.restore();
});
const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTex, fog: false, depthWrite: false, transparent: true }));
moon.scale.set(9, 9, 1);
moon.position.set(12, 15, -40);
scene.add(moon);

// 光
scene.add(new THREE.HemisphereLight(0x3a4677, 0x14100b, 0.9));
const moonLight = new THREE.DirectionalLight(0x93a6e0, 0.45);
moonLight.position.set(-6, 9, 3);
scene.add(moonLight);
const roomLight = new THREE.PointLight(0xffb878, 3.2, 9, 2);  // 背後の座敷から漏れる灯り
roomLight.position.set(0.4, 1.7, 4.6);
scene.add(roomLight);

// 地面（庭）
const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40),
  new THREE.MeshStandardMaterial({ map: soilTex, roughness: 0.97, metalness: 0 }));
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// 縁側
const woodMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.5, metalness: 0.0, color: 0xf0d8c0 });
const darkWood = new THREE.MeshStandardMaterial({ color: 0x3a2617, roughness: 0.6 });
const engawa = new THREE.Group();
const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 4), woodMat);
floor.rotation.x = -Math.PI / 2;
floor.position.set(0, FLOOR_Y, EDGE_Z + 2);
engawa.add(floor);
const fascia = new THREE.Mesh(new THREE.BoxGeometry(14, 0.1, 0.07), darkWood);  // 縁框
fascia.position.set(0, FLOOR_Y - 0.05, EDGE_Z + 0.035);
engawa.add(fascia);
const under = new THREE.Mesh(new THREE.BoxGeometry(14, FLOOR_Y - 0.1, 3.5), new THREE.MeshStandardMaterial({ color: 0x050403, roughness: 1 }));
under.position.set(0, (FLOOR_Y - 0.1) / 2, EDGE_Z + 0.25 + 1.75);
engawa.add(under);
for (let x = -6; x <= 6; x += 1.5) {  // 束
  const p = new THREE.Mesh(new THREE.BoxGeometry(0.08, FLOOR_Y - 0.1, 0.08), darkWood);
  p.position.set(x, (FLOOR_Y - 0.1) / 2, EDGE_Z + 0.12);
  engawa.add(p);
  const st = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.06, 8), new THREE.MeshStandardMaterial({ color: 0x55524c, roughness: 0.9 }));
  st.position.set(x, 0.03, EDGE_Z + 0.12);
  engawa.add(st);
}
const pillars = [];
for (const s of [-1, 1]) {  // 柱
  const p = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3, 0.12), darkWood);
  p.position.set(s * 1.8, FLOOR_Y + 1.5, EDGE_Z + 0.06);
  engawa.add(p); pillars.push(p);
}
scene.add(engawa);

// 沓脱石
const rockMat = new THREE.MeshStandardMaterial({ color: 0x6b675f, roughness: 0.8 });
function rock(x, z, sx, sy, sz, rot) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), rockMat);
  const pos = m.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const X = pos.getX(i), Y = pos.getY(i), Z = pos.getZ(i);
    const k = 1 + 0.07 * Math.sin(X * 3.1 + Z * 2.3 + x * 7) * Math.cos(Y * 2.7 + z * 5);
    pos.setXYZ(i, X * k, Y * k, Z * k);
  }
  m.geometry.computeVertexNormals();
  m.scale.set(sx, sy, sz); m.position.set(x, sy * 0.35, z); m.rotation.y = rot || 0;
  scene.add(m); return m;
}
rock(0.25, 0.55, 0.36, 0.14, 0.24, 0.3);   // 沓脱石
rock(-0.35, -0.55, 0.24, 0.05, 0.19, 1.1); // 飛び石
rock(0.3, -1.35, 0.22, 0.05, 0.18, 0.4);
rock(-0.2, -2.15, 0.23, 0.05, 0.17, 2.0);
rock(2.6, -2.2, 0.5, 0.35, 0.4, 0.8);
rock(-2.9, -0.9, 0.4, 0.22, 0.32, 0.2);

// 竹垣
{
  const n = 300;
  const bam = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.022, 0.022, 1.7, 7), new THREE.MeshStandardMaterial({ color: 0x8a8a58, roughness: 0.85 }), n);
  const m = new THREE.Matrix4(), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    m.makeTranslation(-7 + i * 0.047, 0.85 + rand(-0.02, 0.02), -3.4 + rand(-0.01, 0.01));
    bam.setMatrixAt(i, m);
    c.setHSL(rand(0.13, 0.17), rand(0.2, 0.35), rand(0.28, 0.4)); bam.setColorAt(i, c);
  }
  scene.add(bam);
  for (const y of [0.35, 0.95, 1.5]) {
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 14, 8), new THREE.MeshStandardMaterial({ color: 0x4d4a30, roughness: 0.6 }));
    bar.rotation.z = Math.PI / 2; bar.position.set(0, y, -3.33);
    scene.add(bar);
  }
  for (let x = -6; x <= 6; x += 2) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.8, 8), new THREE.MeshStandardMaterial({ color: 0x3a3020, roughness: 0.8 }));
    post.position.set(x, 0.9, -3.3); scene.add(post);
  }
}

// 植え込み・木
function bush(x, y, z, r, col, smooth) {
  const g = new THREE.SphereGeometry(r, 40, 28);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i), vy = pos.getY(i), vz = pos.getZ(i);
    const k = 1 + 0.16 * Math.sin(vx * 6 / r + vz * 5 / r + x) * Math.cos(vy * 5 / r) + 0.05 * Math.sin(vx * 17 / r + vy * 13 / r);
    pos.setXYZ(i, vx * k, vy * k * 0.8, vz * k);
  }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: col, roughness: 0.95 }));
  m.position.set(x, y, z); scene.add(m);
}
bush(-2.4, 0.35, -1.9, 0.6, 0x1b3a1f);
bush(-1.8, 0.25, -2.6, 0.45, 0x22401f);
bush(2.3, 0.35, -1.4, 0.55, 0x1a361d);
bush(3.2, 0.3, -0.4, 0.45, 0x203d20);
for (let i = 0; i < 9; i++) bush(-9 + i * 2.2 + rand(-0.5, 0.5), rand(0.9, 1.7), rand(-6.5, -8.5), rand(1.2, 1.9), 0x0a140e, true);

// 石灯籠
{
  const g = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: 0x77736a, roughness: 0.95 });
  const add = (geo, y) => { const m = new THREE.Mesh(geo, stone); m.position.y = y; g.add(m); return m; };
  add(new THREE.CylinderGeometry(0.22, 0.26, 0.12, 6), 0.06);
  add(new THREE.CylinderGeometry(0.08, 0.1, 0.6, 8), 0.42);
  add(new THREE.CylinderGeometry(0.2, 0.16, 0.1, 6), 0.77);
  const box = add(new THREE.BoxGeometry(0.24, 0.22, 0.24), 0.93);
  box.material = stone;
  const win = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.1), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 0.9, 0.4) }));
  win.position.set(0, 0.93, 0.121); g.add(win);
  add(new THREE.ConeGeometry(0.3, 0.2, 6), 1.14);
  add(new THREE.SphereGeometry(0.05, 8, 6), 1.27);
  g.position.set(-2.1, 0, -2.6); g.rotation.y = 0.35;
  scene.add(g);
  const l = new THREE.PointLight(0xffb060, 0.35, 2.5, 2); l.position.set(-2.05, 0.93, -2.4); scene.add(l);
}

// 水の入ったバケツ（燃え殻入れ）
const bucket = new THREE.Group();
{
  const metal = new THREE.MeshStandardMaterial({ color: 0x8a8d90, roughness: 0.35, metalness: 0.7, side: THREE.DoubleSide });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.11, 0.24, 24, 1, true), metal);
  body.position.y = 0.12; bucket.add(body);
  const water = new THREE.Mesh(new THREE.CircleGeometry(0.133, 24), new THREE.MeshStandardMaterial({ color: 0x0a1424, roughness: 0.05, metalness: 0.4 }));
  water.rotation.x = -Math.PI / 2; water.position.y = 0.2; bucket.add(water);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.006, 6, 32), metal);
  rim.rotation.x = Math.PI / 2; rim.position.y = 0.24; bucket.add(rim);
  const stickMat = new THREE.MeshStandardMaterial({ color: 0x2a1c14, roughness: 0.9 });
  for (let i = 0; i < 4; i++) {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.2, 4), stickMat);
    s.position.set(rand(-0.06, 0.06), 0.27, rand(-0.06, 0.06)); s.rotation.set(rand(-0.4, 0.4), 0, rand(-0.4, 0.4));
    bucket.add(s);
  }
  scene.add(bucket);
}

// 蚊取り線香
const coil = new THREE.Group();
let coilTipLocal = new THREE.Vector3();
{
  const pts = [];
  const turns = 3.6;
  for (let i = 0; i <= 220; i++) {
    const t = i / 220, a = t * turns * Math.PI * 2, r = 0.012 + t * 0.05;
    pts.push(new THREE.Vector3(Math.cos(a) * r, 0.012, Math.sin(a) * r));
  }
  coilTipLocal.copy(pts[pts.length - 1]);
  const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 400, 0.0035, 6, false),
    new THREE.MeshStandardMaterial({ color: 0x2f4a26, roughness: 0.85 }));
  coil.add(tube);
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.004, 32), new THREE.MeshStandardMaterial({ color: 0x55585c, roughness: 0.5, metalness: 0.6 }));
  plate.position.y = 0.002; coil.add(plate);
  const ember = new THREE.Mesh(new THREE.SphereGeometry(0.004, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 0.8, 0.2) }));
  ember.position.copy(coilTipLocal); coil.add(ember);
  scene.add(coil);
}

// ============================================================
// カメラと配置（画面比に合わせる）
// ============================================================
let W = 1, H = 1, DPR = 1;
let maxSlots = 3;
const slots = [];
const ZJ = [0, -0.16, -0.06, -0.22, -0.1, -0.28];
let sparkZ = -0.2, portrait = false;
const _v = new THREE.Vector3();

function rayAt(ndcX, ndcY, z) {  // 視錐台と平面 z の交点
  _v.set(ndcX, ndcY, 0.5).unproject(camera).sub(camera.position).normalize();
  const t = (z - camera.position.z) / _v.z;
  return { x: camera.position.x + _v.x * t, y: camera.position.y + _v.y * t };
}

function floorZ(ndcY) {  // 画面の高さ ndcY に見える縁側の床の奥行き
  _v.set(0, ndcY, 0.5).unproject(camera).sub(camera.position).normalize();
  if (_v.y >= -1e-4) return EDGE_Z + 0.3;
  const t = (FLOOR_Y - camera.position.y) / _v.y;
  return camera.position.z + _v.z * t;
}
function layout() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  renderer.setPixelRatio(DPR);
  renderer.setSize(W, H, false);
  composer.setPixelRatio(DPR);
  composer.setSize(W, H);
  hud.width = Math.round(W * DPR); hud.height = Math.round(H * DPR);

  const aspect = W / H;
  camera.aspect = aspect;
  portrait = aspect < 0.9;
  if (portrait) {
    // 縦長：横の画角を保ったまま縦に広く見せ、火玉は上・着地点は下・縁側は最下部に少しだけ
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(24)) / aspect));
    camera.updateProjectionMatrix();
    sparkZ = -0.35;
    const camZ = 2.1;
    const edge = new THREE.Vector3(), land = new THREE.Vector3();
    let bestE = 1e9, bestY = 1, bestP = -0.3;
    for (let cy = 0.6; cy <= 2.2; cy += 0.04) {
      for (let pd = -2; pd >= -50; pd -= 0.5) {
        camera.position.set(0, cy, camZ);
        camera.rotation.set(THREE.MathUtils.degToRad(pd), 0, 0);
        camera.updateMatrixWorld(true);
        edge.set(0, FLOOR_Y, EDGE_Z).project(camera);
        land.set(0, 0, sparkZ).project(camera);
        const e = (edge.y + 0.88) ** 2 + (land.y + 0.72) ** 2;
        if (e < bestE && land.y > edge.y) { bestE = e; bestY = cy; bestP = pd; }
      }
    }
    camera.position.set(0, bestY, camZ);
    camera.rotation.set(THREE.MathUtils.degToRad(bestP), 0, 0);
  } else {
    camera.fov = 42;
    const k = aspect < 1.25 ? 1 + (1.25 / aspect - 1) * 0.75 : 1;
    const camY = 1.3 + (k - 1) * 0.5, camZ = 2.75 + (k - 1) * 1.3;
    camera.position.set(0, camY, camZ);
    // 落下点が縁側に隠れない奥行きを求める
    const lim = 0.53;
    sparkZ = Math.min(-0.15, (camY * EDGE_Z - lim * camZ) / (camY - lim) - 0.08);
    camera.lookAt(0, 0.42, sparkZ - 0.2);
  }
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);

  const halfW = Math.abs(rayAt(1, 0, sparkZ).x);
  const n = clamp(Math.min(Math.floor(W / 105), Math.floor(halfW * 2 * 0.82 / 0.26)), 3, 6);
  maxSlots = n;
  while (slots.length < n) slots.push({ i: slots.length, active: false, sn: null, cool: 0, x: 0, z: 0, top: 1.4, yLo: 0.7, yHi: 0.9 });
  for (let i = slots.length - 1; i >= n; i--) { if (slots[i].sn) slots[i].sn.dispose(); slots.pop(); }
  for (const s of slots) {
    s.z = sparkZ + ZJ[s.i];
    const hw = Math.abs(rayAt(1, 0, s.z).x);
    s.x = lerp(-hw * 0.8, hw * 0.8, (s.i + 0.5) / n);
    s.top = rayAt(0, 1, s.z).y;
    // 火玉の高さの範囲（縦長では画面の上の方に）
    if (portrait) { s.yLo = rayAt(0, 0.5, s.z).y; s.yHi = rayAt(0, 0.74, s.z).y; }
    else { s.yLo = s.top * 0.5; s.yHi = s.top * 0.66; }
  }

  // 小道具の位置
  const fz = portrait ? EDGE_Z + Math.max(0.07, (floorZ(-0.98) - EDGE_Z) * 0.5) : EDGE_Z + 0.22;
  const fhw = Math.abs(rayAt(1, -0.85, fz).x);
  coil.position.set(-Math.min(fhw * 0.62, 1.2), FLOOR_Y, fz);
  bucket.position.set(Math.min(Math.abs(rayAt(1, 0, 0.05).x) * 0.78, 1.4), 0, 0.05);
  for (const [i, p] of pillars.entries()) p.position.x = (i ? 1 : -1) * Math.max(1.5, fhw * 1.02);
}

// ============================================================
// 状態
// ============================================================
let mode = 'title';
let score = 0, combo = 0, lives = 3, elapsed = 0, bestCombo = 0;
let best = 0;
try { best = +localStorage.getItem('senko-best') || 0; } catch (e) {}
let shake = 0, overTimer = -1, time = 0, redFlash = 0;
const pops = [], ripples = [];

function durMul() { return mode === 'play' ? Math.max(0.5, 1 - elapsed / 180) : 1; }
function gravity() { return mode === 'play' ? 3.0 + Math.min(elapsed / 110, 1) * 3.0 : 3.0; }

// ============================================================
// 音（すべて Web Audio で合成）
// ============================================================
let AC = null, master = null, revIn = null, noiseBuf = null, sizzleGain = null, muted = false;
let clickBudget = 0;

function initAudio() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  const C = window.AudioContext || window.webkitAudioContext;
  if (!C) return;
  AC = new C();
  const comp = AC.createDynamicsCompressor();
  comp.threshold.value = -14; comp.ratio.value = 4;
  master = AC.createGain(); master.gain.value = muted ? 0 : 0.9;
  master.connect(comp); comp.connect(AC.destination);

  const len = AC.sampleRate * 2;
  noiseBuf = AC.createBuffer(1, len, AC.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

  const rl = Math.floor(AC.sampleRate * 2.6);
  const ir = AC.createBuffer(2, rl, AC.sampleRate);
  for (let c = 0; c < 2; c++) {
    const ch = ir.getChannelData(c);
    for (let i = 0; i < rl; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / rl, 3.2);
  }
  const conv = AC.createConvolver(); conv.buffer = ir;
  const wet = AC.createGain(); wet.gain.value = 0.32;
  conv.connect(wet); wet.connect(master);
  revIn = conv;

  const src = AC.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
  const bp = AC.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 5200; bp.Q.value = 0.7;
  sizzleGain = AC.createGain(); sizzleGain.gain.value = 0;
  src.connect(bp); bp.connect(sizzleGain); sizzleGain.connect(master);
  src.start();

  cricketLoop();
  startFestival();
}

function env(g, t, peak, attack, decay) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}
function noiseShot(t, dur, type, f0, f1, peak, attack, q) {
  const s = AC.createBufferSource(); s.buffer = noiseBuf;
  const f = AC.createBiquadFilter(); f.type = type; f.Q.value = q || 0.8;
  f.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = AC.createGain(); env(g, t, peak, attack, dur);
  s.connect(f); f.connect(g); g.connect(master);
  s.start(t, Math.random() * 1.2, dur + attack + 0.05);
}
function sfxClick(vol, when) {
  if (!AC) return;
  noiseShot(when || AC.currentTime, rand(0.008, 0.03), 'highpass', rand(1800, 5200), rand(1800, 5200), vol, 0.001, 0.7);
}
function sfxDrop() {  // ぽたっ
  if (!AC) return;
  const t = AC.currentTime;
  const o = AC.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(820, t); o.frequency.exponentialRampToValueAtTime(150, t + 0.11);
  const g = AC.createGain(); env(g, t, 0.32, 0.004, 0.16);
  o.connect(g); g.connect(master); g.connect(revIn);
  o.start(t); o.stop(t + 0.25);
  sfxClick(0.15, t);
}
function sfxIgnite() {  // シュッ
  if (!AC) return;
  const t = AC.currentTime;
  noiseShot(t, 0.4, 'bandpass', 2400, 6000, 0.16, 0.04, 1.2);
  for (let i = 0; i < 5; i++) sfxClick(0.07, t + 0.05 + Math.random() * 0.3);
}
function sfxMiss() {  // じゅっ
  if (!AC) return;
  const t = AC.currentTime;
  noiseShot(t, 0.55, 'lowpass', 5000, 400, 0.4, 0.01, 0.9);
  const o = AC.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(50, t + 0.25);
  const g = AC.createGain(); env(g, t, 0.35, 0.005, 0.3);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.4);
}
const SCALE = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51, 1567.98, 1760.0];
function bell(freq, t, vol, dur) {  // 風鈴
  const parts = [[1, 1, 1], [2.76, 0.45, 0.55], [5.4, 0.22, 0.3], [8.93, 0.1, 0.18]];
  for (const [m, a, dd] of parts) {
    const o = AC.createOscillator(); o.type = 'sine';
    o.frequency.value = freq * m * (1 + rand(-0.002, 0.002));
    const g = AC.createGain(); env(g, t, vol * a, 0.003, dur * dd);
    o.connect(g); g.connect(master); g.connect(revIn);
    o.start(t); o.stop(t + dur * dd + 0.1);
  }
}
function sfxCatch(rank, c) {
  if (!AC) return;
  const t = AC.currentTime;
  const f = SCALE[Math.min(c - 1, SCALE.length - 1)];
  bell(f, t, 0.24, 2.4);
  if (rank === 0) { bell(f * 2, t + 0.07, 0.12, 1.8); bell(f * 1.5, t + 0.14, 0.08, 1.6); }
  else if (rank === 1) bell(f * 1.5, t + 0.08, 0.1, 1.6);
  const n = rank === 0 ? 22 : rank === 1 ? 14 : 8;
  for (let i = 0; i < n; i++) sfxClick(rand(0.04, 0.12), t + 0.02 + Math.pow(Math.random(), 1.6) * 0.9);
}
function sfxLifeUp() {
  if (!AC) return;
  const t = AC.currentTime;
  bell(1046.5, t + 0.25, 0.14, 1.6); bell(1567.98, t + 0.4, 0.14, 2);
}
function sfxEarly() {
  if (!AC) return;
  const t = AC.currentTime;
  const o = AC.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(320, t);
  o.frequency.exponentialRampToValueAtTime(220, t + 0.12);
  const g = AC.createGain(); env(g, t, 0.12, 0.005, 0.14);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.2);
}
function sfxOver() {
  if (!AC) return;
  const t = AC.currentTime;
  bell(392, t, 0.2, 3.5); bell(293.66, t + 0.5, 0.18, 4.5);
}
function cricketLoop() {  // 庭の虫の声
  if (!AC) return;
  const t = AC.currentTime + 0.05;
  const f = rand(3900, 4700), n = 2 + Math.floor(Math.random() * 4);
  const pan = AC.createStereoPanner ? AC.createStereoPanner() : null;
  if (pan) { pan.pan.value = rand(-0.8, 0.8); pan.connect(master); }
  for (let i = 0; i < n; i++) {
    const o = AC.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    const am = AC.createOscillator(); am.frequency.value = 55;
    const amg = AC.createGain(); amg.gain.value = 0.5;
    const g = AC.createGain();
    const ts = t + i * 0.11;
    g.gain.setValueAtTime(0, ts);
    g.gain.linearRampToValueAtTime(0.008, ts + 0.02);
    g.gain.linearRampToValueAtTime(0, ts + 0.08);
    am.connect(amg); amg.connect(g.gain);
    o.connect(g); g.connect(pan || master);
    o.start(ts); o.stop(ts + 0.1); am.start(ts); am.stop(ts + 0.1);
  }
  setTimeout(cricketLoop, rand(900, 2600));
}
// 時々鳴る風鈴（環境音）
function windChime() {
  if (AC && !muted) {
    const t = AC.currentTime, f = [1318.51, 1567.98, 1760, 2093][Math.floor(Math.random() * 4)];
    bell(f, t, 0.035, 2.2);
    if (Math.random() < 0.5) bell(f * 1.12, t + rand(0.15, 0.4), 0.025, 2);
  }
  setTimeout(windChime, rand(9000, 20000));
}
setTimeout(windChime, 6000);

// 遠くの祭り囃子（大太鼓・締太鼓・鉦・篠笛）。こもらせて残響を深くし、ほんのり流す
let fest = null;
function startFestival() {
  if (!AC || fest) return;
  const bus = AC.createGain(); bus.gain.value = 0;
  const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1500; lp.Q.value = 0.3;
  const dry = AC.createGain(); dry.gain.value = 0.55;
  const wet = AC.createGain(); wet.gain.value = 1.0;
  bus.connect(lp); lp.connect(dry); dry.connect(master); lp.connect(wet); wet.connect(revIn);
  bus.gain.setTargetAtTime(0.11, AC.currentTime, 3);  // ゆっくり聞こえてくる
  // 風で遠くなったり近くなったり
  const lfo = AC.createOscillator(); lfo.frequency.value = 0.045;
  const lfoG = AC.createGain(); lfoG.gain.value = 0.035;
  lfo.connect(lfoG); lfoG.connect(bus.gain); lfo.start();

  // 篠笛の旋律（律音階）を一度だけ作り、繰り返す
  const scale = [587.33, 659.25, 783.99, 880.0, 987.77, 1174.66, 1318.51, 1567.98];
  const phrase = [];
  let idx = 3;
  for (let i = 0; i < 32; i++) {
    if (i % 8 === 7) { phrase.push(null); continue; }
    idx = clamp(idx + [-2, -1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 7)], 0, scale.length - 1);
    phrase.push({ f: scale[idx], len: Math.random() < 0.3 ? 2 : 1 });
  }
  const BEAT = 60 / 104 / 2;  // 8分音符
  fest = { bus, step: 0, next: AC.currentTime + 0.5, phrase, BEAT };
  setInterval(festTick, 90);
}
function festTick() {
  if (!fest || !AC) return;
  while (fest.next < AC.currentTime + 0.35) {
    festStep(fest.step, fest.next);
    fest.step++;
    fest.next += fest.BEAT * (fest.step % 2 ? 1.06 : 0.94);  // 少し跳ねる
  }
}
function festStep(i, t) {
  const b = fest.bus, bar = i % 16;
  // 大太鼓：ドン ・ ・ ドン ・ ドドン ・
  if ([0, 6, 10, 11].includes(bar) || (bar === 14 && Math.random() < 0.5)) {
    const o = AC.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.25);
    const g = AC.createGain(); env(g, t, bar === 11 ? 0.5 : 0.8, 0.005, 0.45);
    o.connect(g); g.connect(b); o.start(t); o.stop(t + 0.6);
  }
  // 締太鼓：テケテケ
  if (bar % 2 === 1 || Math.random() < 0.25) {
    const o = AC.createOscillator(); o.type = 'triangle';
    o.frequency.setValueAtTime(330, t); o.frequency.exponentialRampToValueAtTime(220, t + 0.06);
    const g = AC.createGain(); env(g, t, 0.18 * rand(0.6, 1), 0.002, 0.08);
    o.connect(g); g.connect(b); o.start(t); o.stop(t + 0.12);
  }
  // 鉦：チャン・チキ
  if (bar % 4 === 0 || bar % 4 === 2 || (bar % 4 === 3 && Math.random() < 0.6)) {
    for (const [m, a] of [[1, 1], [2.41, 0.6], [3.87, 0.4]]) {
      const o = AC.createOscillator(); o.type = 'square'; o.frequency.value = 1180 * m;
      const g = AC.createGain(); env(g, t, 0.025 * a, 0.001, bar % 4 === 0 ? 0.18 : 0.07);
      o.connect(g); g.connect(b); o.start(t); o.stop(t + 0.25);
    }
  }
  // 篠笛
  const n = fest.phrase[i % fest.phrase.length];
  if (n && (i % fest.phrase.length === 0 || fest.phrase[(i - 1 + fest.phrase.length) % fest.phrase.length] !== n)) {
    const dur = fest.BEAT * 2 * n.len;
    const o = AC.createOscillator(); o.type = 'triangle';
    o.frequency.setValueAtTime(n.f * 0.94, t);
    o.frequency.exponentialRampToValueAtTime(n.f, t + 0.06);  // 指打ちのようなしゃくり
    const vib = AC.createOscillator(); vib.frequency.value = 5.5;
    const vg = AC.createGain(); vg.gain.value = n.f * 0.008;
    vib.connect(vg); vg.connect(o.frequency);
    const g = AC.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09, t + 0.05);
    g.gain.setValueAtTime(0.08, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(b);
    o.start(t); o.stop(t + dur + 0.05); vib.start(t); vib.stop(t + dur + 0.05);
  }
}

// ============================================================
// 火花（線＋光点、加算合成）
// ============================================================
const MAXS = 7000;
const sparks = [];
const lPos = new Float32Array(MAXS * 6), lCol = new Float32Array(MAXS * 6);
const hPos = new Float32Array(MAXS * 3), hCol = new Float32Array(MAXS * 3);
const lineGeo = new THREE.BufferGeometry();
lineGeo.setAttribute('position', new THREE.BufferAttribute(lPos, 3).setUsage(THREE.DynamicDrawUsage));
lineGeo.setAttribute('color', new THREE.BufferAttribute(lCol, 3).setUsage(THREE.DynamicDrawUsage));
const sparkLines = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({
  vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false }));
sparkLines.frustumCulled = false;
scene.add(sparkLines);
const headGeo = new THREE.BufferGeometry();
headGeo.setAttribute('position', new THREE.BufferAttribute(hPos, 3).setUsage(THREE.DynamicDrawUsage));
headGeo.setAttribute('color', new THREE.BufferAttribute(hCol, 3).setUsage(THREE.DynamicDrawUsage));
const sparkHeads = new THREE.Points(headGeo, new THREE.PointsMaterial({
  size: 0.022, map: glowTex, vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false }));
sparkHeads.frustumCulled = false;
scene.add(sparkHeads);

// パレット：[熱い色, 冷めた色]
const PAL = [
  [[1.0, 0.82, 0.48], [1.0, 0.3, 0.06]],   // 線香花火の橙
  [[1.0, 0.96, 0.8], [1.0, 0.62, 0.18]],   // 極：金
  [[1.0, 0.86, 0.55], [1.0, 0.45, 0.1]],   // 見事
  [[1.0, 0.7, 0.4], [0.9, 0.22, 0.05]],    // よし
  [[1.0, 0.45, 0.2], [0.6, 0.08, 0.02]],   // 落下の飛沫
  [[1.0, 0.6, 0.3], [0.65, 0.1, 0.02]],    // 散り菊：冷めた赤
];
const KIND = {
  bud:     { sp: [0.08, 0.24], life: [0.08, 0.2],  tr: 0.04,  g: 0.3 },
  // 牡丹：太く大きく広がり、枝の先も大きく開く
  botan:   { sp: [0.6, 1.3],   life: [0.2, 0.42],  tr: 0.05,  g: 0.6, br: 1, bp: 0.9, cm: 1.6, cl: 1.7, k: 0.95 },
  // 松葉：細く長い線が勢いよく、二段に枝分かれ
  matsuba: { sp: [0.9, 1.9],   life: [0.12, 0.3],  tr: 0.07,  g: 0.3, br: 2, bp: 0.92, cm: 0.85, cl: 0.8, k: 0.85 },
  yanagi:  { sp: [0.35, 0.8],  life: [0.45, 0.95], tr: 0.08,  g: 1.6 },
  // 散り菊：小さく短く、暗い
  chiri:   { sp: [0.12, 0.35], life: [0.08, 0.22], tr: 0.03,  g: 0.4, br: 1, bp: 0.2, cm: 0.6, cl: 0.7 },
  child:   { sp: [0.25, 0.75], life: [0.05, 0.16], tr: 0.035, g: 0.3 },
  burst:   { sp: [0.7, 2.0],   life: [0.5, 1.15],  tr: 0.05,  g: 0.8, br: 1, bp: 0.35, drag: 1.5 },
  splash:  { sp: [0.3, 0.9],   life: [0.18, 0.45], tr: 0.035, g: 3.0 },
};
function randDir(out) {
  const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u);
  out.x = s * Math.cos(a); out.y = u; out.z = s * Math.sin(a);
  return out;
}
const _d = { x: 0, y: 0, z: 0 };
function spawn(kind, x, y, z, opt) {
  if (sparks.length >= MAXS) return;
  const k = KIND[kind];
  randDir(_d);
  if (opt && opt.up) { _d.y = Math.abs(_d.y) * 1.5 + 0.4; }
  if (opt && opt.r) { x += _d.x * opt.r; y += _d.y * opt.r; z += _d.z * opt.r; }
  const sp = rand(k.sp[0], k.sp[1]) * ((opt && opt.spMul) || 1);
  const life = rand(k.life[0], k.life[1]);
  let br = 0;
  if (opt && opt.br !== undefined) br = opt.br;
  else if (k.br && Math.random() < (k.bp || 1)) br = k.br;
  const lm = (opt && opt.lifeMul) || 1;
  sparks.push({ x, y, z, vx: _d.x * sp, vy: _d.y * sp, vz: _d.z * sp, l: life * lm, m: life * lm, tr: k.tr, g: k.g,
    br, p: (opt && opt.p) || 0, drag: k.drag || 1,
    k: (opt && opt.k !== undefined) ? opt.k : (k.k || 1), cm: k.cm || 1, cl: k.cl || 1 });
  return sparks[sparks.length - 1];
}
function updateSparks(dt) {
  for (let i = sparks.length - 1; i >= 0; i--) {
    const p = sparks[i];
    p.l -= dt;
    if (p.l <= 0 || p.y < 0.002) {
      if (p.l <= 0 && p.br > 0) {
        const n = 3 + Math.floor(Math.random() * 4);
        for (let j = 0; j < n; j++) {
          const o = 0.004;
          const c = spawn('child', p.x + rand(-o, o), p.y + rand(-o, o), p.z + rand(-o, o),
            { br: p.br - 1, p: p.p, spMul: (p.br > 1 ? 1 : 0.8) * p.cm, lifeMul: p.cl, k: p.k * 0.45 });
          if (c) { c.cm = p.cm; c.cl = p.cl; }
        }
        if (clickBudget > 0 && Math.random() < 0.55) { clickBudget--; sfxClick(rand(0.03, 0.09) * (mode === 'play' ? 1 : 0.6)); }
      }
      sparks[i] = sparks[sparks.length - 1]; sparks.pop();
      continue;
    }
    const dr = Math.exp(-p.drag * 2 * dt);
    p.vx *= dr; p.vz *= dr; p.vy = p.vy * dr - p.g * dt;
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
  }
}
function writeSparks() {
  const n = sparks.length;
  for (let i = 0; i < n; i++) {
    const p = sparks[i];
    const f = p.l / p.m;
    const pal = PAL[p.p];
    const hot = pal[0], cool = pal[1];
    const I = (0.3 + 1.5 * f * f) * Math.min(1, f * 2.2) * p.k * Math.min(1, 0.25 + (p.m - p.l) * 25);
    const r = lerp(cool[0], hot[0], f) * I, g = lerp(cool[1], hot[1], f) * I, b = lerp(cool[2], hot[2], f) * I;
    const o = i * 6;
    lPos[o] = p.x - p.vx * p.tr; lPos[o + 1] = p.y - p.vy * p.tr; lPos[o + 2] = p.z - p.vz * p.tr;
    lPos[o + 3] = p.x; lPos[o + 4] = p.y; lPos[o + 5] = p.z;
    lCol[o] = r * 0.12; lCol[o + 1] = g * 0.12; lCol[o + 2] = b * 0.12;
    lCol[o + 3] = r; lCol[o + 4] = g; lCol[o + 5] = b;
    const h = i * 3;
    hPos[h] = p.x; hPos[h + 1] = p.y; hPos[h + 2] = p.z;
    hCol[h] = r * 0.16; hCol[h + 1] = g * 0.16; hCol[h + 2] = b * 0.16;
  }
  lineGeo.setDrawRange(0, n * 2);
  headGeo.setDrawRange(0, n);
  lineGeo.attributes.position.needsUpdate = true; lineGeo.attributes.color.needsUpdate = true;
  headGeo.attributes.position.needsUpdate = true; headGeo.attributes.color.needsUpdate = true;
}

// ============================================================
// 煙・閃光・輪・残り火・蛍
// ============================================================
const smokePool = [];
for (let i = 0; i < 140; i++) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, color: 0x9a929a, transparent: true, depthWrite: false, opacity: 0 }));
  s.visible = false; scene.add(s);
  smokePool.push({ s, on: false });
}
function addSmoke(x, y, z, kind) {
  const o = smokePool.find(q => !q.on);
  if (!o) return;
  o.on = true; o.s.visible = true;
  o.x = x; o.y = y; o.z = z; o.l = 0;
  if (kind === 'big') { o.m = rand(1.8, 2.8); o.r = 0.05; o.gr = 0.16; o.vy = rand(0.08, 0.15); o.a = 0.5; }
  else if (kind === 'thin') { o.m = rand(2.5, 3.5); o.r = 0.008; o.gr = 0.022; o.vy = rand(0.06, 0.1); o.a = 0.12; }
  else { o.m = rand(1.5, 2.5); o.r = 0.02; o.gr = 0.07; o.vy = rand(0.1, 0.18); o.a = 0.28; }
  o.vx = rand(-0.02, 0.02); o.vz = rand(-0.02, 0.02); o.ph = rand(0, 6);
}
function updateSmoke(dt) {
  for (const o of smokePool) {
    if (!o.on) continue;
    o.l += dt;
    if (o.l >= o.m) { o.on = false; o.s.visible = false; continue; }
    const f = o.l / o.m;
    o.x += (o.vx + Math.sin(time * 0.9 + o.ph) * 0.02) * dt; o.y += o.vy * dt; o.z += o.vz * dt;
    o.vy *= Math.exp(-0.3 * dt);
    o.r += o.gr * dt;
    o.s.position.set(o.x, o.y, o.z);
    o.s.scale.set(o.r, o.r, 1);
    o.s.material.opacity = o.a * Math.sin(f * Math.PI) * (1 - f * 0.4);
    o.s.material.rotation = o.ph + o.l * 0.3;
  }
}

const fx = [];  // 閃光・輪・残り火
function addFx(type, pos, opt) {
  const mat = new THREE.SpriteMaterial({
    map: type === 'ring' ? ringTex : glowTex, color: opt.color, blending: THREE.AdditiveBlending,
    transparent: true, depthWrite: false, fog: false });
  const s = new THREE.Sprite(mat);
  s.position.copy(pos);
  scene.add(s);
  fx.push({ type, s, l: opt.life, m: opt.life, size: opt.size, grow: opt.grow || 0 });
}
function updateFx(dt) {
  for (let i = fx.length - 1; i >= 0; i--) {
    const e = fx[i];
    e.l -= dt;
    if (e.l <= 0) { scene.remove(e.s); e.s.material.dispose(); fx.splice(i, 1); continue; }
    const k = e.l / e.m;
    let sz = e.size;
    if (e.type === 'ring') { sz = e.size + e.grow * easeOut(1 - k); e.s.material.opacity = k; }
    else if (e.type === 'ember') { e.s.material.opacity = k * (0.75 + 0.25 * Math.sin(time * 20 + i)); }
    else { e.s.material.opacity = k * k; sz = e.size * (1 + (1 - k) * 0.6); }
    e.s.scale.set(sz, sz, 1);
  }
}
const flashLight = new THREE.PointLight(0xffc070, 0, 6, 2);
scene.add(flashLight);
let flashI = 0;

const fireflies = [];
for (let i = 0; i < 12; i++) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(0.7, 1.6, 0.4), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
  s.scale.set(0.05, 0.05, 1);
  const home = new THREE.Vector3(rand(-3.2, 3.2), rand(0.25, 1.3), rand(-3.0, -1.0));
  s.position.copy(home);
  scene.add(s);
  fireflies.push({ s, home, ph: rand(0, 20), w: rand(0.6, 1.3) });
}
function updateFireflies() {
  for (const f of fireflies) {
    const t = time * 0.3 + f.ph;
    f.s.position.set(f.home.x + Math.sin(t * 1.3) * 0.4, f.home.y + Math.sin(t * 1.9) * 0.15, f.home.z + Math.cos(t * 1.1) * 0.3);
    const b = Math.max(0, Math.sin(time * f.w + f.ph));
    f.s.material.opacity = Math.pow(b, 6) * 0.9;
  }
}

// ============================================================
// 線香花火
// ============================================================
const cylGeo = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true);
const beadGeo = new THREE.SphereGeometry(1, 20, 14);
const PAPERS = [0xc2456f, 0x7a58c0, 0x2f7fa8, 0xd0902c, 0x3f8f5c].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 }));
const wickMat = new THREE.MeshStandardMaterial({ color: 0x5a3a28, roughness: 0.9 });
const PHASE_INT = { tsubomi: 0.35, botan: 0.75, matsuba: 1.0, yanagi: 0.7, chiri: 0.22 };
const _up = new THREE.Vector3(0, 1, 0), _dir = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3();

const slotLights = [];
for (let i = 0; i < 6; i++) {
  const l = new THREE.PointLight(0xff8a3a, 0, 5, 2);
  scene.add(l); slotLights.push(l);
}

function placeSegment(mesh, a, b, r) {
  _dir.subVectors(b, a);
  const len = _dir.length();
  mesh.position.addVectors(a, b).multiplyScalar(0.5);
  mesh.scale.set(r, Math.max(len, 1e-4), r);
  mesh.quaternion.setFromUnitVectors(_up, _dir.normalize());
}

class Senko {
  constructor(slot) {
    this.slot = slot;
    this.beadFrac = Math.random();
    const m = durMul();
    this.phases = [
      ['tsubomi', rand(1.0, 1.6) * m],
      ['botan',   rand(1.2, 2.2) * m],
      ['matsuba', rand(1.6, 3.0) * m],
      ['yanagi',  rand(1.0, 2.0) * m],
      ['chiri',   rand(0.7, 2.4) * m],
    ];
    this.pi = 0; this.pt = 0;
    this.state = 'enter'; this.et = 0; this.st = 0;
    this.t = rand(0, 10);
    this.swA = rand(0.02, 0.045); this.swW = rand(0.8, 1.4); this.swP = rand(0, 6);
    this.r = 0.002; this.int = 0;
    this.acc = {}; this.smokeAcc = 0;
    this.pos = new THREE.Vector3(); this.vel = new THREE.Vector3(); this.tip = new THREE.Vector3(); this.prevTip = new THREE.Vector3();
    this.y0 = 0;
    this.alpha = 1;

    this.paper = new THREE.Mesh(cylGeo, PAPERS[Math.floor(Math.random() * PAPERS.length)]);
    this.wick = new THREE.Mesh(cylGeo, wickMat);
    this.beadMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.2, 0.35), transparent: true });
    this.bead = new THREE.Mesh(beadGeo, this.beadMat);
    this.glowMat = new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(2.0, 0.75, 0.22), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false });
    this.glow = new THREE.Sprite(this.glowMat);
    this.flameMat = new THREE.SpriteMaterial({ map: flameTex, color: new THREE.Color(1.3, 1.0, 0.8), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false });
    this.flame = new THREE.Sprite(this.flameMat);
    this.flame.center.set(0.5, 0.3);
    this.bead.visible = this.glow.visible = this.flame.visible = false;
    this.it = 0; this.burnt = 0; this.burstT = 0.1;
    this.igniteDur = rand(1.0, 1.4);
    scene.add(this.paper, this.wick, this.bead, this.glow, this.flame);
    this.light = slotLights[slot.i];
  }
  dispose() {
    scene.remove(this.paper, this.wick, this.bead, this.glow, this.flame);
    this.beadMat.dispose(); this.glowMat.dispose(); this.flameMat.dispose();
    this.light.intensity = 0;
  }
  anchor(out) { return out.set(this.slot.x, this.slot.top + 0.12, this.slot.z); }
  emit(kind, rate, dt, opt) {
    this.acc[kind] = (this.acc[kind] || 0) + rate * dt;
    while (this.acc[kind] >= 1) {
      this.acc[kind] -= 1;
      spawn(kind, this.pos.x, this.pos.y, this.pos.z, Object.assign({ r: this.r * 1.05 }, opt));
    }
  }
  // 各段階の火花の出方。k は段階内の進み具合 (0〜1)
  rates(ph, k) {
    switch (ph) {
      case 'tsubomi': return { bud: 3 + 8 * k };
      case 'botan':   return { botan: 16 + 16 * k, bud: 6, burst: 1.0 + 0.6 * k };
      case 'matsuba': return { matsuba: 80 + 60 * Math.sin(k * Math.PI) };
      case 'yanagi':  return { yanagi: 85 * (1 - k * 0.45), matsuba: 14 * (1 - k) };
      case 'chiri':   return { chiri: 12 * (1 - k) + 1.5 };
    }
    return {};
  }
  update(dt) {
    this.t += dt;
    const A = this.anchor(_a);
    const fullLen = A.y - lerp(this.slot.yLo, this.slot.yHi, this.beadFrac);
    const ax = this.swA * Math.sin(this.t * this.swW + this.swP) + 0.008 * Math.sin(this.t * 2.7);
    const az = this.swA * 0.6 * Math.sin(this.t * this.swW * 0.83 + this.swP * 1.7);
    let L = fullLen;
    if (this.state === 'enter') {
      this.et += dt;
      const k = Math.min(1, this.et / 0.8);
      L = fullLen * easeOut(k);
      if (k >= 1) { this.state = 'ignite'; this.it = 0; sfxIgnite(); }
    } else if (this.state === 'ignite') {
      this.it += dt;
      this.burnt = 0.03 * easeOut(Math.min(1, this.it / this.igniteDur));  // 先端の紙が燃えて縮む
      if (this.it >= this.igniteDur) { this.state = 'burn'; this.r = 0.0018; }
    }
    L = Math.max(0.02, L - this.burnt);
    this.prevTip.copy(this.tip);
    this.tip.set(A.x + Math.sin(ax) * L, A.y - Math.cos(ax) * Math.cos(az) * L, A.z + Math.sin(az) * L);

    if (this.state === 'burn') {
      const [ph, dur] = this.phases[this.pi];
      this.pt += dt;
      const k = clamp(this.pt / dur, 0, 1);
      this.int = lerp(this.int, PHASE_INT[ph], 1 - Math.exp(-4 * dt));
      let tremble = 0;
      const R0 = 0.0072;
      // 段階の終わり 3 割で、次の段階の出方へ少しずつ移る
      const cur = this.rates(ph, k);
      const nextPh = this.phases[this.pi + 1];
      const w = nextPh ? clamp((k - 0.7) / 0.3, 0, 1) ** 2 * (3 - 2 * clamp((k - 0.7) / 0.3, 0, 1)) : 0;
      const nxt = nextPh ? this.rates(nextPh[0], 0) : {};
      const mix = {};
      for (const key in cur) mix[key] = cur[key] * (1 - w);
      for (const key in nxt) mix[key] = (mix[key] || 0) + nxt[key] * w;
      const chiriK = ph === 'chiri' ? k : (nextPh && nextPh[0] === 'chiri' ? 0 : -1);
      for (const key in mix) {
        if (key === 'burst') continue;
        const opt = key === 'chiri' ? { p: 5, k: lerp(0.75, 0.3, Math.max(0, chiriK)) } : undefined;
        this.emit(key, mix[key], dt, opt);
      }
      // 牡丹：ときどき「ぱっ」と大きく開く
      if (mix.burst) {
        this.burstT -= dt;
        if (this.burstT <= 0) {
          this.burstT = rand(0.14, 0.32) / mix.burst;
          const n = 9 + Math.floor(Math.random() * 8);
          for (let i = 0; i < n; i++) spawn('botan', this.pos.x, this.pos.y, this.pos.z, { r: this.r * 1.05 });
          if (clickBudget > 0) { clickBudget--; sfxClick(rand(0.06, 0.12) * (mode === 'play' ? 1 : 0.6)); }
        }
      }
      switch (ph) {
        case 'tsubomi':  // 蕾：火玉が膨らむ
          this.r = lerp(0.0018, R0, easeOut(k)) * (1 + 0.08 * Math.sin(this.t * 37));
          break;
        case 'botan':    // 牡丹：ぱちぱちと大きく
          this.r = R0 * (1 + 0.06 * Math.sin(this.t * 31));
          break;
        case 'matsuba':  // 松葉：細く長く、激しく枝分かれ
          this.r = R0 * 1.06 * (1 + 0.05 * Math.sin(this.t * 41));
          break;
        case 'yanagi':   // 柳：しだれる
          this.r = lerp(R0 * 1.06, R0 * 1.0, k);
          break;
        case 'chiri':    // 散り菊：小さく、冷めて、震える
          this.r = lerp(R0, R0 * 0.85, k);
          if (k > 0.55) tremble = (k - 0.55) * 0.006;
          break;
      }
      this.pos.set(this.tip.x + rand(-1, 1) * tremble, this.tip.y - this.r * 0.8 + rand(-1, 1) * tremble * 0.5, this.tip.z + rand(-1, 1) * tremble);
      this.smokeAcc += dt * 3 * (0.4 + this.int);
      while (this.smokeAcc >= 1) { this.smokeAcc -= 1; addSmoke(this.pos.x, this.pos.y + 0.01, this.pos.z); }
      if (this.pt >= dur) {
        this.pi++; this.pt = 0;
        if (this.pi >= this.phases.length) this.drop(dt);
      }
    } else if (this.state === 'enter' || this.state === 'ignite') {
      this.pos.copy(this.tip);
      if (this.state === 'ignite') {
        this.smokeAcc += dt * 7;
        while (this.smokeAcc >= 1) { this.smokeAcc -= 1; addSmoke(this.pos.x, this.pos.y + 0.03, this.pos.z); }
        const q = this.it / this.igniteDur;
        if (q > 0.6) { this.r = lerp(0.0008, 0.0018, (q - 0.6) / 0.4); this.emit('bud', 4, dt, { k: 0.6 }); }
      }
    } else if (this.state === 'fall') {
      this.vel.y -= gravity() * dt;
      this.pos.addScaledVector(this.vel, dt);
      this.int = lerp(this.int, 0.45, 1 - Math.exp(-3 * dt));
      this.emit('bud', 26, dt);
      if (this.pos.y - this.r <= 0) this.miss();
    } else if (this.state === 'spent') {
      this.st += dt;
      if (this.st > 1.2) this.state = 'gone';
    }

    // 見た目
    const top = A, mid = _b.lerpVectors(A, this.tip, 0.55);
    placeSegment(this.paper, top, mid, 0.0019);
    placeSegment(this.wick, mid, this.tip, 0.0014);
    const igniting = this.state === 'ignite';
    this.flame.visible = igniting;
    if (igniting) {
      const q = this.it / this.igniteDur;
      const fs = (q < 0.15 ? q / 0.15 : q > 0.6 ? Math.max(0, 1 - (q - 0.6) / 0.4) : 1) * (0.85 + Math.random() * 0.3);
      this.flame.position.copy(this.tip);
      this.flame.scale.set(0.032 * fs, 0.095 * fs * (0.9 + Math.random() * 0.25), 1);
      this.light.position.copy(this.tip);
      this.light.intensity = 0.9 * fs + 0.15;
    }
    const live = this.state === 'burn' || this.state === 'fall' || (igniting && this.it / this.igniteDur > 0.6);
    this.bead.visible = this.glow.visible = live;
    if (live) {
      const fl = 0.85 + Math.random() * 0.15;
      this.bead.position.copy(this.pos);
      this.bead.scale.setScalar(this.r);
      const heat = 0.7 + this.int * 0.6;
      // 散り菊では火玉が冷めて赤く暗くなっていく
      const cool = this.state === 'burn' && this.phases[this.pi] && this.phases[this.pi][0] === 'chiri' ? clamp(this.pt / this.phases[this.pi][1], 0, 1) : 0;
      this.beadMat.color.setRGB(2.1 * heat * fl * (1 - 0.3 * cool), 0.85 * heat * fl * (1 - 0.55 * cool), 0.25 * heat * (1 - 0.6 * cool));
      this.glow.position.copy(this.pos);
      const gs = 0.09 + this.int * 0.18;
      this.glow.scale.set(gs, gs, 1);
      this.glowMat.opacity = (0.55 + 0.45 * fl) * 1.0;
      this.light.position.copy(this.pos);
      this.light.intensity = (0.25 + this.int * 1.7) * fl;
    } else if (!igniting) {
      this.light.intensity = 0;
    }
  }
  drop(dt) {
    this.state = 'fall';
    this.vel.subVectors(this.tip, this.prevTip).divideScalar(Math.max(dt, 1e-3)).multiplyScalar(0.8);
    this.vel.y = -rand(0.03, 0.08);
    this.y0 = this.pos.y;
    addFx('flash', this.pos, { color: new THREE.Color(1.4, 0.7, 0.3), life: 0.2, size: 0.12 });
    for (let i = 0; i < 6; i++) spawn('chiri', this.pos.x, this.pos.y, this.pos.z, { br: 0 });
    if (mode === 'play') sfxDrop();
  }
  miss() {
    this.pos.y = this.r * 0.5;
    this.state = 'spent'; this.st = 0;
    for (let i = 0; i < 26; i++) spawn('splash', this.pos.x, 0.005, this.pos.z, { up: true, p: 4 });
    for (let i = 0; i < 3; i++) addSmoke(this.pos.x + rand(-0.02, 0.02), 0.02, this.pos.z + rand(-0.02, 0.02), 'big');
    addFx('ember', this.pos, { color: new THREE.Color(1.2, 0.25, 0.05), life: 3.5, size: 0.035 });
    addFx('flash', this.pos, { color: new THREE.Color(1.2, 0.35, 0.1), life: 0.3, size: 0.3 });
    if (mode === 'play') {
      lives--; combo = 0; shake = 0.35; redFlash = 0.35;
      sfxMiss();
      if (lives <= 0 && overTimer < 0) overTimer = 1.6;
    }
  }
  caught() {
    const f = clamp((this.y0 - this.pos.y) / Math.max(0.01, this.y0), 0, 1);
    let rank, pts;
    if (f < 0.3)       { rank = 0; pts = 300; }
    else if (f < 0.62) { rank = 1; pts = 200; }
    else               { rank = 2; pts = 100; }
    combo++; bestCombo = Math.max(bestCombo, combo);
    const mult = 1 + Math.min(combo - 1, 10) * 0.1;
    const gain = Math.round(pts * mult);
    score += gain;

    const n = rank === 0 ? 220 : rank === 1 ? 150 : 100;
    for (let i = 0; i < n; i++) spawn('burst', this.pos.x, this.pos.y, this.pos.z, { p: rank + 1, spMul: rank === 0 ? 1.15 : rank === 1 ? 0.95 : 0.75 });
    addFx('ring', this.pos, { color: new THREE.Color(1.0, 0.7, 0.35), life: 0.6, size: 0.05, grow: 0.9 });
    if (rank === 0) addFx('ring', this.pos, { color: new THREE.Color(1.6, 1.3, 0.8), life: 0.85, size: 0.03, grow: 0.55 });
    addFx('flash', this.pos, { color: new THREE.Color(0.9, 0.55, 0.25), life: 0.4, size: rank === 0 ? 0.5 : 0.38 });
    flashLight.position.copy(this.pos); flashI = rank === 0 ? 6 : 4;
    sfxCatch(rank, combo);
    if (combo % 10 === 0 && lives < 3) {
      lives++;
      sfxLifeUp();
    }
    this.state = 'spent'; this.st = 0;
  }
}

// ============================================================
// 入力
// ============================================================
const _sv = new THREE.Vector3();
function toScreen(p) {
  _sv.copy(p).project(camera);
  return { x: (_sv.x * 0.5 + 0.5) * W, y: (-_sv.y * 0.5 + 0.5) * H };
}
function tap(x, y) {
  if (mode !== 'play') return;
  const hitR = Math.max(46, Math.min(W, H) * 0.075);
  let best = null, bestD = 1e9;
  for (const s of slots) {
    const sn = s.sn;
    if (!sn || sn.state !== 'fall') continue;
    const a = toScreen(sn.pos);
    _a.copy(sn.pos).addScaledVector(sn.vel, 0.06);  // タップの遅れを吸収
    const b = toScreen(_a);
    const d = Math.min(Math.hypot(x - a.x, y - a.y), Math.hypot(x - b.x, y - b.y));
    if (d < hitR && d < bestD) { best = sn; bestD = d; }
  }
  if (best) { best.caught(); return; }
  for (const s of slots) {
    const sn = s.sn;
    if (!sn || sn.state !== 'burn') continue;
    const a = toScreen(sn.pos);
    if (Math.hypot(x - a.x, y - a.y) < hitR * 0.8) {
      combo = 0;
      sfxEarly();
      ripples.push({ x, y, l: 0.5, m: 0.5, c: '154,160,192' });
      return;
    }
  }
  ripples.push({ x, y, l: 0.45, m: 0.45, c: '244,230,200' });
}
glCanvas.addEventListener('pointerdown', e => { e.preventDefault(); tap(e.clientX, e.clientY); }, { passive: false });
window.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && mode !== 'play') startGame(); });

// ============================================================
// 画面遷移
// ============================================================
const titleEl = document.getElementById('title');
const overEl = document.getElementById('over');
function clearSlots() {
  for (const s of slots) { if (s.sn) s.sn.dispose(); s.active = false; s.sn = null; s.cool = 0; }
}
function activeCount() { let c = 0; for (const s of slots) if (s.active) c++; return c; }
function activateOne() {
  const cand = slots.filter(s => !s.active);
  if (!cand.length) return null;
  let bestS = cand[0], bestD = -1;
  for (const s of cand) {
    let d = 99;
    for (const o of slots) if (o.active) d = Math.min(d, Math.abs(o.i - s.i));
    d += Math.random() * 1.2;
    if (d > bestD) { bestD = d; bestS = s; }
  }
  bestS.active = true; bestS.sn = null; bestS.cool = rand(0.1, 0.5);
  return bestS;
}
function startGame() {
  initAudio();
  mode = 'play';
  score = 0; combo = 0; lives = 3; elapsed = 0; bestCombo = 0; overTimer = -1;
  sparks.length = 0; pops.length = 0;
  clearSlots();
  activateOne();
  titleEl.classList.add('hidden'); overEl.classList.add('hidden');
  document.body.classList.add('playing');
}
function gameOver() {
  mode = 'over';
  const isBest = score > best;
  if (isBest) { best = score; try { localStorage.setItem('senko-best', String(best)); } catch (e) {} }
  document.getElementById('finalScore').textContent = score.toLocaleString();
  document.getElementById('bestScore').textContent = best.toLocaleString();
  document.getElementById('newBest').textContent = isBest && score > 0 ? T('newBest') : (bestCombo >= 3 ? T('maxCombo', bestCombo) : '');
  overEl.classList.remove('hidden');
  document.body.classList.remove('playing');
  sfxOver();
}
document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('retryBtn').addEventListener('click', startGame);
const muteBtn = document.getElementById('mute');
muteBtn.addEventListener('click', () => {
  muted = !muted;
  muteBtn.textContent = muted ? '×' : '♪';
  if (master) master.gain.setTargetAtTime(muted ? 0 : 0.9, AC.currentTime, 0.05);
});

// ============================================================
// ループ
// ============================================================
const camBase = new THREE.Vector3();
let lastT = performance.now();
let coilSmokeAcc = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  if (!window.__senkoPaused) { update(dt); render(); }
  requestAnimationFrame(frame);
}
function update(dt) {
  time += dt;
  clickBudget = 3;

  // どんどん増える
  const target = mode === 'play' ? Math.min(maxSlots, 1 + Math.floor(elapsed / 8)) : Math.min(maxSlots, 3);
  if (mode === 'play') elapsed += dt;
  if (activeCount() < target && (mode !== 'play' || lives > 0)) {
    activateOne();
  }
  for (const s of slots) {
    if (!s.active) continue;
    if (!s.sn) {
      s.cool -= dt;
      if (s.cool <= 0 && (mode !== 'play' || lives > 0)) s.sn = new Senko(s);
    } else {
      s.sn.update(dt);
      if (s.sn.state === 'gone') { s.sn.dispose(); s.sn = null; s.cool = rand(0.5, 1.3); }
    }
  }
  updateSparks(dt);
  writeSparks();
  updateSmoke(dt);
  updateFx(dt);
  updateFireflies();
  flashI *= Math.exp(-6 * dt);
  flashLight.intensity = flashI;

  // 蚊取り線香の煙
  coilSmokeAcc += dt * 1.6;
  while (coilSmokeAcc >= 1) {
    coilSmokeAcc -= 1;
    _a.copy(coilTipLocal).add(coil.position);
    addSmoke(_a.x, _a.y + 0.01, _a.z, 'thin');
  }

  for (const arr of [pops, ripples]) for (let i = arr.length - 1; i >= 0; i--) { arr[i].l -= dt; if (arr[i].l <= 0) arr.splice(i, 1); }
  if (overTimer > 0) { overTimer -= dt; if (overTimer <= 0) { overTimer = -1; gameOver(); } }
  shake = Math.max(0, shake - dt);
  redFlash = Math.max(0, redFlash - dt);

  if (AC && sizzleGain) {
    const tgt = Math.min(0.16, sparks.length * 0.0002) * (mode === 'play' ? 1 : 0.6);
    sizzleGain.gain.setTargetAtTime(tgt, AC.currentTime, 0.08);
  }

}
function render() {
  // カメラのゆらぎ（呼吸）と揺れ
  camBase.copy(camera.position);
  const breathe = 0.004;
  camera.position.x += Math.sin(time * 0.35) * breathe + (shake > 0 ? rand(-1, 1) * shake * 0.02 : 0);
  camera.position.y += Math.sin(time * 0.5) * breathe * 0.6 + (shake > 0 ? rand(-1, 1) * shake * 0.02 : 0);
  composer.render();
  camera.position.copy(camBase);

  drawHud();
}

function drawHud() {
  const c = hctx;
  c.setTransform(DPR, 0, 0, DPR, 0, 0);
  c.clearRect(0, 0, W, H);
  if (redFlash > 0) {
    const g = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
    g.addColorStop(0, 'rgba(120,10,0,0)'); g.addColorStop(1, `rgba(120,10,0,${redFlash * 0.7})`);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }
  for (const r of ripples) {
    const k = r.l / r.m;
    c.strokeStyle = `rgba(${r.c},${0.4 * k})`; c.lineWidth = 1.2;
    c.beginPath(); c.arc(r.x, r.y, (1 - k) * 30 + 6, 0, Math.PI * 2); c.stroke();
  }
  c.textAlign = 'center'; c.textBaseline = 'middle';
  for (const p of pops) {
    const k = p.l / p.m, age = 1 - k;
    const sc = p.still ? 1 : 1 + 0.35 * Math.max(0, 1 - age * 6);
    c.font = `700 ${p.size * sc}px ${FONT}`;
    c.globalAlpha = Math.min(1, k * 2.2) * Math.min(1, age * 12 + 0.2);
    c.shadowColor = 'rgba(255,120,40,0.8)'; c.shadowBlur = 16;
    c.fillStyle = p.color;
    c.fillText(p.text, p.x, p.y - (p.still ? 0 : easeOut(age) * 34));
  }
  c.shadowBlur = 0; c.globalAlpha = 1;
  if (!(mode === 'play' || overTimer > 0)) return;

  const pad = 18, top = 24;
  // ゲーム中は文字を出さない（命の火玉だけ）
  for (let i = 0; i < 3; i++) {
    const x = W - pad - 8 - i * 24, y = top + 4;
    if (i < lives) {
      const g = c.createRadialGradient(x, y, 0, x, y, 14);
      g.addColorStop(0, 'rgba(255,160,70,0.55)'); g.addColorStop(1, 'rgba(255,90,30,0)');
      c.fillStyle = g; c.fillRect(x - 14, y - 14, 28, 28);
      const g2 = c.createRadialGradient(x - 1.5, y - 1.5, 0, x, y, 6);
      g2.addColorStop(0, '#fffbe8'); g2.addColorStop(0.45, '#ffc260'); g2.addColorStop(1, '#ff5a1a');
      c.fillStyle = g2;
    } else {
      c.fillStyle = 'rgba(90,80,90,0.6)';
    }
    c.beginPath(); c.arc(x, y, 5.5, 0, Math.PI * 2); c.fill();
  }
}

// ============================================================
// 起動
// ============================================================
window.addEventListener('resize', layout);
layout();
// テスト用の小さな窓口
window.__senko = { get state() { return { mode, score, lives, combo, sparks: sparks.length, slots: slots.map(s => s.sn && { state: s.sn.state, ph: s.sn.phases[s.sn.pi] && s.sn.phases[s.sn.pi][0], k: s.sn.phases[s.sn.pi] ? s.sn.pt / s.sn.phases[s.sn.pi][1] : 0, ...toScreen(s.sn.pos) }) }; }, tap, startGame, step(sec, noRender) { for (let t = 0; t < sec; t += 1 / 60) update(1 / 60); if (!noRender) render(); } };
requestAnimationFrame(t => { lastT = t; requestAnimationFrame(frame); });
