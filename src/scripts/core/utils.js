import * as THREE from 'three';

export function recenterObject3D(root) {
  const box = new THREE.Box3().setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());
  root.position.sub(center);
  return { box, center };
}

export function frameObject3D(root, camera, controls, options = {}) {
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  // OrbitControls deve orbitar o centro real do modelo
  controls.target.copy(center);

  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = camera.fov * (Math.PI / 180);

  let distance = (maxDim / 2) / Math.tan(fov / 2);
  distance *= options.padding ?? 1.6;

  // vista 3/4 agradável
  const direction = new THREE.Vector3(1, 0.6, 1).normalize();
  camera.position.copy(center).add(direction.multiplyScalar(distance));

  // clipping correto (muito importante!)
  camera.near = Math.max(0.1, maxDim / 100);
  camera.far = Math.max(2000, maxDim * 20);
  camera.updateProjectionMatrix();

  controls.update();

  return { box, size, center, distance };
}

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export function easeInOutQuad(t) {
  return t < 0.5
    ? 2 * t * t
    : 1 - Math.pow(-2 * t + 2, 2) / 2;
}