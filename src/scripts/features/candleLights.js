// scripts/features/candleLights.js
import * as THREE from "three";

export function createCandleLights(scene, opts = {}) {
  const {
    color = 0xffc27a,
    intensity = 2.2,
    distance = 6.0,
    decay = 2.0,
    shadow = false,
  } = opts;

  const group = new THREE.Group();
  group.name = "CandleLights";
  scene.add(group);

  const lights = [];
  const base = []; // posições base
  const phases = []; // fases para flicker
  let t = 0;

  function ensureCount(n) {
    while (lights.length < n) {
      const L = new THREE.PointLight(color, intensity, distance, decay);
      L.castShadow = shadow;
      group.add(L);

      lights.push(L);
      base.push(new THREE.Vector3());
      phases.push(Math.random() * Math.PI * 2);
    }
    while (lights.length > n) {
      const L = lights.pop();
      group.remove(L);
      base.pop();
      phases.pop();
      L.dispose?.();
    }
  }

  function setPoints(points, { yOffset = 0.12 } = {}) {
    if (!points || !points.length) return;

    ensureCount(points.length);

    for (let i = 0; i < points.length; i++) {
      base[i].copy(points[i]);
      base[i].y += yOffset; // ligeiramente acima do pavio
      lights[i].position.copy(base[i]);
    }
  }

  function setParams(p = {}) {
    for (const L of lights) {
      if (p.color !== undefined) L.color.set(p.color);
      if (p.intensity !== undefined) L.intensity = p.intensity;
      if (p.distance !== undefined) L.distance = p.distance;
      if (p.decay !== undefined) L.decay = p.decay;
    }
  }

  function update(dt) {
    t += dt;

    for (let i = 0; i < lights.length; i++) {
      const ph = phases[i];

      // flicker suave e orgânico (2 camadas)
      const f =
        0.18 * Math.sin(t * 10.0 + ph) + 0.1 * Math.sin(t * 17.0 + ph * 1.7);

      lights[i].intensity = intensity * (0.85 + f);
      lights[i].position.y = base[i].y + 0.03 * Math.sin(t * 12.0 + ph);
    }
  }

  return {
    object: group,
    lights,
    setPoints,
    setParams,
    update,
  };
}
