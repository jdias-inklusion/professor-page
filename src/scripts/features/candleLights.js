// scripts/features/candleLights.js
import * as THREE from "three";

function average(points) {
  const v = new THREE.Vector3();
  for (const p of points) v.add(p);
  return v.multiplyScalar(1 / Math.max(1, points.length));
}

// ruído 1D simples (barato) — não é Perlin, mas chega para flicker orgânico
function hash1(x) {
  // retorna 0..1
  const s = Math.sin(x * 127.1) * 43758.5453123;
  return s - Math.floor(s);
}

function smoothNoise(t, seed) {
  // noise interpolado (0..1), suavizado
  const x = t + seed * 10.0;
  const i = Math.floor(x);
  const f = x - i;

  const a = hash1(i * 1.0);
  const b = hash1((i + 1) * 1.0);

  // smoothstep
  const u = f * f * (3 - 2 * f);
  return a * (1 - u) + b * u; // 0..1
}

export function createCandleLights(scene, opts = {}) {
  const {
    color = 0xffc27a,
    intensity = 2.2,
    distance = 7.5,
    decay = 2.0,
    shadow = false,

    // --- flicker tuning (mais "real") ---
    // amplitude final (0.0–0.35 é razoável)
    flickerAmount = 0.18,

    // frequência do noise (0.8–2.5 típico)
    flickerSpeed = 1.6,

    // variação adicional rápida (chama) — pequena!
    microFlicker = 0.04,
    microSpeed = 12.0,

    // suavização (inércia): 0.08–0.2
    smoothing = 0.12,

    // evita que a vela "apague" demasiado
    minFactor = 0.78,
    maxFactor = 1.12,

    // y bob — deixa quase impercetível
    yBob = 0.006,

    // clustering
    mode = "clusters", // "clusters" | "perCandle"
  } = opts;

  const group = new THREE.Group();
  group.name = "CandleLights";
  scene.add(group);

  const lights = [];
  const base = [];
  const phases = [];
  const intensitySmoothed = []; // <-- novo: guarda estado suavizado
  let t = 0;

  function clearAll() {
    for (const L of lights) group.remove(L);
    lights.length = 0;
    base.length = 0;
    phases.length = 0;
    intensitySmoothed.length = 0;
  }

  function ensureCount(n) {
    while (lights.length < n) {
      const L = new THREE.PointLight(color, intensity, distance, decay);
      L.castShadow = shadow;
      group.add(L);

      lights.push(L);
      base.push(new THREE.Vector3());
      phases.push(Math.random() * Math.PI * 2);
      intensitySmoothed.push(intensity); // começa no valor base
    }

    while (lights.length > n) {
      const L = lights.pop();
      group.remove(L);
      base.pop();
      phases.pop();
      intensitySmoothed.pop();
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
        // reset suave
        intensitySmoothed[i] = intensity;
        lights[i].intensity = intensity;
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
      // auto: divide em maxClusters chunks
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

      // ligeiro boost de alcance por cluster (ok)
      const spread = pts.length > 1 ? Math.min(3.0, pts.length * 0.15) : 0;
      lights[i].distance = distance + spread;

      // reset suave
      intensitySmoothed[i] = intensity;
      lights[i].intensity = intensity;
    }
  }

  function setParams(p = {}) {
    for (let i = 0; i < lights.length; i++) {
      const L = lights[i];
      if (p.color !== undefined) L.color.set(p.color);
      if (p.distance !== undefined) L.distance = p.distance;
      if (p.decay !== undefined) L.decay = p.decay;

      // se mudares intensity base, atualiza o "state" suavizado
      if (p.intensity !== undefined) {
        L.intensity = p.intensity;
        intensitySmoothed[i] = p.intensity;
      }
    }
  }

  function update(dt) {
    t += dt;

    for (let i = 0; i < lights.length; i++) {
      const ph = phases[i];

      // noise 0..1 -> -1..1
      const n = smoothNoise(t * flickerSpeed, ph) * 2.0 - 1.0;

      // micro flicker senoidal pequeno (só para vida)
      const m = Math.sin(t * microSpeed + ph * 3.1) * microFlicker;

      // factor alvo (clamp para não “apagar” nem “explodir”)
      const targetFactor = THREE.MathUtils.clamp(
        1.0 + n * flickerAmount + m,
        minFactor,
        maxFactor
      );

      const targetIntensity = intensity * targetFactor;

      // suavização (low-pass)
      intensitySmoothed[i] = THREE.MathUtils.lerp(
        intensitySmoothed[i],
        targetIntensity,
        smoothing
      );

      lights[i].intensity = intensitySmoothed[i];

      // bob quase invisível
      lights[i].position.y = base[i].y + yBob * Math.sin(t * 4.0 + ph);
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