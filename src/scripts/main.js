import * as THREE from "three";
import { createRenderer } from "./core/renderer.js";
import { createScene } from "./core/scene.js";
import { createCamera } from "./core/camera.js";
import { addOlympusLights } from "./core/lights.js";
import { setupResize } from "./core/resize.js";
import { startLoop } from "./core/loop.js";
import { frameObject3D } from "./core/utils.js";

import { setupControls } from "./features/controls.js";
import { loadGLB } from "./features/loaders.js";
import { setupHotspots } from "./features/hotspots.js";
import { addUnderCloudLayer, applyOlympusFog } from "./features/clouds.js";

import { UI } from "./ui/ui.js";

import { setupGUI } from "./debug/gui.js";

const canvas = document.getElementById("canvas");

const renderer = createRenderer(canvas);

const scene = createScene();
scene.background = null;

const camera = createCamera();

// Fog só 1x (linear)
applyOlympusFog(scene, {
  color: 0xd6e6ff, // ligeiramente azul
  near: 700,
  far: 3200,
});

// Luzes
const lights = addOlympusLights(scene);

// Controls
const controls = setupControls(camera, renderer.domElement);

// UI
const ui = new UI();
ui.setHint("Arrasta para orbitar · Scroll para zoom · Clica nos hotspots");

// Hotspots
const hotspots = setupHotspots({ scene, camera, renderer, ui, controls });
hotspots.enable(false);

// Load model
const campus = await loadGLB({
  url: "/models/campus.glb",
  scene,
  recenter: true,
  onProgress: (p) => ui.setLoading(p),
});

// Nuvens por baixo do modelo (auto)
const box = new THREE.Box3().setFromObject(campus);
const minY = box.min.y;
const cloudY = minY - 35;

const clouds = addUnderCloudLayer(scene, {
  y: cloudY,
  size: 2400,
  opacity: 0.35,
  scale: 2.0,
  softness: 0.18,
  layers: 2,
  speed: 0.2,
});

frameObject3D(campus, camera, controls, { padding: 1.6 });

ui.setLoading(null);
hotspots.enable(true);

setupGUI({
  renderer,
  scene,
  lights,
  clouds,
});

setupResize({ renderer, camera });

startLoop({
  renderer,
  scene,
  camera,
  controls,
  onTick: (dt) => clouds.update(dt),
});
