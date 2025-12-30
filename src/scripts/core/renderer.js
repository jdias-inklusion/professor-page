import * as THREE from "three";

export function createRenderer(canvas) {
  THREE.ColorManagement.enabled = true;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false, // 👈 já não precisamos de transparência
    powerPreference: "high-performance",
  });

  renderer.setPixelRatio(1.25);
  renderer.setSize(window.innerWidth, window.innerHeight);

  renderer.setClearColor(0x0d0b1a, 1);

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = false;

  return renderer;
}