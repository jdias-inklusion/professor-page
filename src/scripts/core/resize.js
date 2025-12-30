export function setupResize({ renderer, camera, onResize } = {}) {
  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    onResize?.({ width: w, height: h });
  }

  window.addEventListener("resize", resize);
  resize();
}
