import * as THREE from "three";

export function startLoop({
  renderer,
  scene,
  camera,
  controls,
  onTick,
  render = true, // <-- novo: default mantém comportamento antigo
}) {
  const clock = new THREE.Clock();

  function tick() {
    const dt = Math.min(0.033, clock.getDelta()); // clamp evita saltos grandes
    controls?.update?.();
    onTick?.(dt);

    // Só renderiza aqui se render=true
    if (render) renderer.render(scene, camera);

    requestAnimationFrame(tick);
  }

  tick();
}