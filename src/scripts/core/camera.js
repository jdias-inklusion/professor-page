import * as THREE from 'three';

export function createCamera() {
  const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    50000
  );
  camera.position.set(40, 28, 55);
  camera.updateProjectionMatrix();
  return camera;
}