import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export function setupControls(camera, domElement) {
  const controls = new OrbitControls(camera, domElement);

  controls.enableDamping = true;
  controls.dampingFactor = 0.08;

  controls.enablePan = false; // recomendo para página web
  controls.rotateSpeed = 0.6;
  controls.zoomSpeed = 0.7;

  controls.maxPolarAngle = Math.PI * 0.49;

  return controls;
}
