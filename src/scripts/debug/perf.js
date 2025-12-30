// scripts/debug/perf.js
import Stats from "stats.js";

export function createPerfMonitor(renderer) {
  const stats = new Stats();
  stats.showPanel(0); // 0: FPS, 1: MS, 2: MB (se suportado)
  stats.dom.style.position = "fixed";
  stats.dom.style.left = "10px";
  stats.dom.style.top = "10px";
  stats.dom.style.zIndex = "9999";
  document.body.appendChild(stats.dom);

  const info = {
    fps: 0,
    ms: 0,
    calls: 0,
    triangles: 0,
    points: 0,
    lines: 0,
    textures: 0,
    geometries: 0,
  };

  // “rolling” fps (opcional)
  let acc = 0;
  let frames = 0;

  function begin() {
    stats.begin();
  }

  function end(dt) {
    stats.end();

    // renderer stats
    const r = renderer.info.render;
    const mem = renderer.info.memory;

    info.calls = r.calls;
    info.triangles = r.triangles;
    info.points = r.points;
    info.lines = r.lines;
    info.textures = mem.textures;
    info.geometries = mem.geometries;

    // fps aproximado via dt (mais útil que tentar ler do stats)
    if (dt > 0) {
      acc += dt;
      frames++;
      if (acc >= 0.5) {
        info.fps = Math.round(frames / acc);
        acc = 0;
        frames = 0;
      }
    }
  }

  function destroy() {
    stats.dom?.remove();
  }

  return { stats, info, begin, end, destroy };
}