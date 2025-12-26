import * as THREE from "three";

import { createRenderer } from "./core/renderer.js";
import { createScene } from "./core/scene.js";
import { createCamera } from "./core/camera.js";
import { addAlchemyLights } from "./core/lights.js";
import { addAlchemyBackground } from "./core/background.js";
import { setupResize } from "./core/resize.js";
import { startLoop } from "./core/loop.js";

import { loadGLB } from "./features/loaders.js";
import { addAlchemyParticles } from "./features/particles.js";
import { createCameraRig } from "./features/cameraRig.js";
import { createCandleLights } from "./features/candleLights.js";

import { UI } from "./ui/ui.js";

import { setupGUI } from "./debug/gui.js";
import { createPicker } from "./debug/pick.js";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const canvas = document.getElementById("canvas");

/* Renderer */
const renderer = createRenderer(canvas);

/* Scene */
const scene = createScene();
scene.background = null; // deixa ver o CSS do body
addAlchemyBackground(scene);

/* Camera */
const camera = createCamera();

/* Lights */
const lights = addAlchemyLights(scene);

/* Controls — ORBIT */
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.maxPolarAngle = Math.PI * 0.48;

/* UI */
const ui = new UI();
ui.setHint("Arrasta para orbitar · Scroll para zoom");

/* LOAD DIORAMA */
const diorama = await loadGLB({
  url: "/models/alchemist_workshop_web.glb",
  scene,
  recenter: true,
  onProgress: (p) => ui.setLoading(p),
});

/* Bounds do diorama (WORLD) */
const box = new THREE.Box3().setFromObject(diorama);
const size = box.getSize(new THREE.Vector3());
const center = box.getCenter(new THREE.Vector3());
const sphere = box.getBoundingSphere(new THREE.Sphere());
const radius = sphere.radius;

/* Target */
controls.target.copy(center);
controls.target.y += size.y * 0.12;

/* START POSE */
const startTarget = center.clone().add(new THREE.Vector3(0, size.y * 0.12, 0));
controls.target.copy(startTarget);

const startDistance = radius * 1.15;
const startAzimuth = THREE.MathUtils.degToRad(35);
const startPolar = THREE.MathUtils.degToRad(65);

camera.position.copy(
  new THREE.Vector3()
    .setFromSpherical(
      new THREE.Spherical(startDistance, startPolar, startAzimuth)
    )
    .add(startTarget)
);

controls.update();

/* Camera Rig */
const rig = createCameraRig({
  camera,
  controls,
  domElement: renderer.domElement,
  smooth: 0.08,
  driftEnabled: true,
  driftStrength: 0.05,
  driftSpeed: 0.22,
  pushInEnabled: false,
  pushInSpeed: 0.12,
  pushInAmount: 0.25,
  minDistance: radius * 0.35,
  maxDistance: radius * 1.5,
  heroAngle: { azimuthDeg: 35, polarDeg: 82 },
});

rig.frameObject(diorama, {
  paddingOverride: 1.22,
  azimuthDeg: 110,
  polarDeg: 82,
  instant: true,
});

/* Reposiciona luzes gerais (mantém) */
if (lights.moon) {
  lights.moon.position.set(
    center.x + size.x * 0.6,
    center.y + size.y * 1.1,
    center.z - size.z * 0.7
  );
}
if (lights.candleA)
  lights.candleA.position.set(
    center.x + size.x * 0.12,
    center.y + size.y * 0.25,
    center.z + size.z * 0.1
  );
if (lights.candleB)
  lights.candleB.position.set(
    center.x - size.x * 0.18,
    center.y + size.y * 0.2,
    center.z - size.z * 0.05
  );
if (lights.magic)
  lights.magic.position.set(
    center.x + size.x * 0.02,
    center.y + size.y * 0.2,
    center.z - size.z * 0.22
  );

/* Candle points (WORLD) */
const candleWorldPoints = [
  // Estande de livros - direita
  new THREE.Vector3(5.417, -3.08, -1.008),
  new THREE.Vector3(5.61, -3.37, -0.829),
  new THREE.Vector3(5.632, -3.478, -1.145),

  // Estande de livros - esquerda
  new THREE.Vector3(10.736, -4.166, 4.044),
  new THREE.Vector3(10.951, -4.5, 4.112),
  new THREE.Vector3(10.601, -4.471, 3.848),

  // Mesa alquimista - esquerda
  new THREE.Vector3(-0.724, -2.348, -5.233),
  new THREE.Vector3(-1.744, -2.613, -5.75),
  new THREE.Vector3(-1.406, -2.028, -5.428),
  new THREE.Vector3(-1.893, -2.141, -5.068),
  new THREE.Vector3(-1.426, -2.087, -4.417),

  // Mesa alquimista - tampo
  new THREE.Vector3(-1.352, -1.653, -3.769),
  new THREE.Vector3(-1.274, -1.751, -3.542),
  new THREE.Vector3(-1.499, -1.517, -3.385),
  new THREE.Vector3(-1.47, -1.353, -3.616),
  new THREE.Vector3(-1.724, -1.26, -3.283),
  new THREE.Vector3(-0.37, -1.321, -3.6),
];

/* Candle lights (WORLD) */
const candleLights = createCandleLights(scene, {
  intensity: 2.2,
  distance: 6.0,
  decay: 2.0,
});
scene.add(candleLights.object);
candleLights.setPoints(candleWorldPoints, {
  yOffset: 0.14,
  clusters: [
    [0, 1, 2], // bookstand direita
    [3, 4, 5], // bookstand esquerda
    [6, 7, 8, 9, 10], // mesa esquerda
    [11, 12, 13, 14, 15, 16], // tampo
  ],
});

/* Partículas (WORLD + espalhadas pelo diorama todo via bounds) */
const bounds = { box, center, size, radius };
const particles = addAlchemyParticles(scene, {
  bounds,
  // mais densidade + mais “presença”
  dustCount: 2600,
  moteCount: 1600,
  mistCount: 520,

  // ligeiramente maiores (o teu diorama é grande)
  dustSize: 0.018,
  moteSize: 0.028,
  mistSize: 0.14,

  // mais visíveis por cor
  dustColor: 0xb7d6ff,
  moteColor: 0xe3c1ff,
  mistColor: 0xa7ffff,
});

/* Candle flames/embers no sítio certo (WORLD direto) */
particles.setCandlePoints(candleWorldPoints);

/* UI */
controls.update();
ui.setLoading(null);

// /* Picker debug */
const picker = createPicker({
  camera,
  domElement: renderer.domElement,
  root: diorama,
});

window.addEventListener("pointerdown", (e) => {
  if (e.button !== 0) return;
  const p = picker.pick(e.clientX, e.clientY);
  if (!p) return;
  console.log("PICK WORLD:", p.x.toFixed(3), p.y.toFixed(3), p.z.toFixed(3));
});

/* Debug GUI */
setupGUI({
  renderer,
  scene,
  lights,
  particles
});

/* Resize */
setupResize({ renderer, camera });

/* Loop */
startLoop({
  renderer,
  scene,
  camera,
  onTick: (dt) => {
    controls.update();
    rig.update(dt);
    particles.update(dt);
    candleLights.update(dt);

    const d = camera.position.distanceTo(controls.target);
    renderer.toneMappingExposure = THREE.MathUtils.clamp(
      1.55 - d * 0.055,
      1.10,
      1.55
    );
  },
});
