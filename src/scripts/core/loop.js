import * as THREE from 'three';

export function startLoop({ renderer, scene, camera, controls, onTick }) {
  const clock = new THREE.Clock();

  function tick() {
    const dt = clock.getDelta(); // segundos
    controls?.update?.();
    onTick?.(dt);
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  tick();
}