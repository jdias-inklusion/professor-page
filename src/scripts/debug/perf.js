// scripts/debug/perf.js
export function createPerfMonitor(renderer, { overlay = false } = {}) {
  const info = {
    fps: 0,
    calls: 0,
    triangles: 0,
    points: 0,
    textures: 0,
    geometries: 0,
  };

  let _frames = 0;
  let _last = performance.now();

  function begin() {
    // reservado (se quiseres medir CPU time, podes guardar timestamp aqui)
  }

  function end() {
    _frames++;
    const now = performance.now();
    const dt = now - _last;

    if (dt >= 500) {
      info.fps = Math.round((_frames * 1000) / dt);
      _frames = 0;
      _last = now;

      // renderer stats
      const r = renderer?.info;
      info.calls = r?.render?.calls ?? 0;
      info.triangles = r?.render?.triangles ?? 0;
      info.points = r?.render?.points ?? 0;
      info.textures = r?.memory?.textures ?? 0;
      info.geometries = r?.memory?.geometries ?? 0;
    }
  }

  // overlay opcional (por defeito OFF)
  if (overlay) {
    // se um dia quiseres overlay, implementas aqui
  }

  return { info, begin, end };
}
