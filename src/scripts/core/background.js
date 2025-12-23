import * as THREE from "three";

export function addAlchemyBackground(scene) {
  const geo = new THREE.SphereGeometry(60, 32, 32);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x0b0a12,
    side: THREE.BackSide,
  });
  const dome = new THREE.Mesh(geo, mat);
  scene.add(dome);
  return dome;
}