import * as THREE from "three";

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = null;
  scene.fog = new THREE.FogExp2(0x1b1630, 0.035);
  scene.fog.color.set(0x0d0b1a);
  scene.fog.near = 1.5;
  scene.fog.far = 120;
  return scene;
}
