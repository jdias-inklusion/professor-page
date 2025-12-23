import * as THREE from "three";
import { createRenderer } from "./core/renderer.js";
import { createScene } from "./core/scene.js";
import { createCamera } from "./core/camera.js";
import { addAlchemyLights } from "./core/lights.js";
import { addAlchemyParticles } from "./features/particles.js";
import { addAlchemyBackground } from "./core/background.js";
import { setupResize } from "./core/resize.js";
import { startLoop } from "./core/loop.js";

import { loadGLB } from "./features/loaders.js";
import { UI } from "./ui/ui.js";
import { setupGUI } from "./debug/gui.js";

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
camera.position.set(3, 3, 6);

/* Lights */
const lights = addAlchemyLights(scene);

/* Controls — ORBIT (diorama mode) */
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

/* --- AUTO FIT / ESCALA REAL --- */
const box = new THREE.Box3().setFromObject(diorama);
const size = box.getSize(new THREE.Vector3());
const center = box.getCenter(new THREE.Vector3());

// target = centro do diorama (um bocadinho acima)
controls.target.copy(center);
controls.target.y += size.y * 0.12;
controls.update();

// reposiciona algumas luzes em função do diorama (para não ficarem “longe demais”)
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

/* Partículas (agora centradas no diorama) */
const particles = addAlchemyParticles(scene, {
  radius: Math.max(size.x, size.z) * 0.45,
  height: size.y * 0.55,

  // densidades por camada
  dustCount: 900,
  moteCount: 380,
  emberCount: 90,

  // opcional: centra no diorama (ajusta se precisares)
  center: new THREE.Vector3(0, size.y * 0.25, 0),
});

// mete as partículas no centro do diorama
if (particles.object) particles.object.position.copy(center);

/* Look-at elegante (mantém) */
controls.update();

ui.setLoading(null);

/* Debug GUI */
setupGUI({
  renderer,
  scene,
  lights,
});

/* Resize */
setupResize({ renderer, camera });

/* Loop */
startLoop({
  renderer,
  scene,
  camera,
  onTick: (dt) => {
    controls.update(); // OrbitControls não precisa de dt
    particles.update(dt);
    const d = camera.position.length();
    renderer.toneMappingExposure = THREE.MathUtils.clamp(
      1.4 - d * 0.03,
      0.9,
      1.3
    );
  },
});
