// scripts/features/candleLights.js
import * as THREE from "three";

function average(points) {
  const v = new THREE.Vector3();
  for (const p of points) v.add(p);
  return v.multiplyScalar(1 / Math.max(1, points.length));
}

export function createCandleLights(scene, opts = {}) {
  const {
    color = 0xffc27a,
    intensity = 2.2,
    distance = 7.5,
    decay = 2.0,
    shadow = false,

    // flicker tuning
    flickerA = 0.18,
    flickerB = 0.1,
    flickerSpeedA = 10.0,
    flickerSpeedB = 17.0,
    yBob = 0.02,

    // clustering
    mode = "clusters", // "clusters" | "perCandle"
  } = opts;

  const group = new THREE.Group();
  group.name = "CandleLights";
  scene.add(group);

  const lights = [];
  const base = [];
  const phases = [];
  let t = 0;

  function clearAll() {
    for (const L of lights) group.remove(L);
    lights.length = 0;
    base.length = 0;
    phases.length = 0;
  }

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
      // PointLight não tem dispose() (não é geometria/material), isto é seguro:
    }
  }

  /**
   * @param {THREE.Vector3[]} pointsWorld - pontos das velas (WORLD)
   * @param {Object} cfg
   * @param {number} cfg.yOffset - sobe ligeiramente o ponto (pavio)
   * @param {Array<Array<number>>} cfg.clusters - índices por cluster (ex: [[0,1,2],[3,4,5]])
   * @param {number} cfg.maxClusters - se não deres clusters, auto agrupa em N por chunk
   */
  function setPoints(pointsWorld, cfg = {}) {
    const { yOffset = 0.12, clusters = null, maxClusters = 4 } = cfg;
    if (!pointsWorld || !pointsWorld.length) return;

    // per-candle (debug / opção)
    if (mode === "perCandle") {
      ensureCount(pointsWorld.length);
      for (let i = 0; i < pointsWorld.length; i++) {
        base[i].copy(pointsWorld[i]);
        base[i].y += yOffset;
        lights[i].position.copy(base[i]);
      }
      return;
    }

    // clustered
    let clusterPoints = [];

    if (clusters && clusters.length) {
      clusterPoints = clusters.map((idxs) =>
        idxs.map((i) => pointsWorld[i]).filter(Boolean)
      );
    } else {
      // auto: divide em maxClusters chunks (mantém ordem — ótimo se já tens “zonas” em sequência)
      const k = Math.min(maxClusters, pointsWorld.length);
      const chunk = Math.ceil(pointsWorld.length / k);
      for (let c = 0; c < k; c++) {
        const start = c * chunk;
        const end = Math.min(pointsWorld.length, start + chunk);
        clusterPoints.push(pointsWorld.slice(start, end));
      }
    }

    ensureCount(clusterPoints.length);

    for (let i = 0; i < clusterPoints.length; i++) {
      const pts = clusterPoints[i];
      const p = average(pts);
      base[i].copy(p);
      base[i].y += yOffset;
      lights[i].position.copy(base[i]);

      // opcional: aumenta um bocadinho o alcance se o cluster for “grande”
      // (isto é barato e ajuda a cobrir melhor cada zona)
      const spread = pts.length > 1 ? Math.min(3.0, pts.length * 0.15) : 0;
      lights[i].distance = distance + spread;
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

      const f =
        flickerA * Math.sin(t * flickerSpeedA + ph) +
        flickerB * Math.sin(t * flickerSpeedB + ph * 1.7);

      lights[i].intensity = intensity * (0.88 + f);
      lights[i].position.y = base[i].y + yBob * Math.sin(t * 12.0 + ph);
    }
  }

  return {
    object: group,
    lights,
    clearAll,
    setPoints,
    setParams,
    update,
  };
}
