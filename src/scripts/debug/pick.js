import * as THREE from "three";

export function createPicker({ camera, domElement, root }) {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  function pick(clientX, clientY) {
    const r = domElement.getBoundingClientRect();
    mouse.x = ((clientX - r.left) / r.width) * 2 - 1;
    mouse.y = -(((clientY - r.top) / r.height) * 2 - 1);

    raycaster.setFromCamera(mouse, camera);

    const hits = raycaster.intersectObject(root, true);
    if (!hits.length) return null;
    return hits[0].point.clone(); // world position
  }

  return { pick };
}