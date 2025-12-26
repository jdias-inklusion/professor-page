// scripts/features/particles.js
import * as THREE from "three";

/* ---------------------------------------------
   Textures (procedural, leves)
--------------------------------------------- */
function makeSoftDotTexture({ size = 128, inner = 0.12, outer = 0.95 } = {}) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");

  const g = ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * inner,
    size / 2,
    size / 2,
    size * outer
  );
  g.addColorStop(0.0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.55)");
  g.addColorStop(1.0, "rgba(255,255,255,0)");

  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function makeFlameTexture({ size = 128 } = {}) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");

  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.translate(size / 2, size / 2);

  const g = ctx.createRadialGradient(
    0,
    size * 0.1,
    size * 0.04,
    0,
    0,
    size * 0.42
  );
  g.addColorStop(0.0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,240,180,0.95)");
  g.addColorStop(0.55, "rgba(255,170,60,0.55)");
  g.addColorStop(1.0, "rgba(255,120,20,0)");

  ctx.fillStyle = g;

  ctx.beginPath();
  ctx.moveTo(0, -size * 0.42);
  ctx.bezierCurveTo(
    size * 0.28,
    -size * 0.18,
    size * 0.22,
    size * 0.18,
    0,
    size * 0.38
  );
  ctx.bezierCurveTo(
    -size * 0.22,
    size * 0.18,
    -size * 0.28,
    -size * 0.18,
    0,
    -size * 0.42
  );
  ctx.closePath();
  ctx.fill();

  ctx.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/* ---------------------------------------------
   Utils
--------------------------------------------- */
function rand(a, b) {
  return a + Math.random() * (b - a);
}

function createPointsLayer({
  texture,
  count = 800,
  size = 0.02,
  opacity = 0.25,
  color = 0xffffff,
  blending = THREE.AdditiveBlending,
  depthWrite = false,
  depthTest = true,
}) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count * 4);
  const col = new Float32Array(count * 3);

  const c = new THREE.Color(color);
  for (let i = 0; i < count; i++) {
    pos[i * 3 + 0] = 0;
    pos[i * 3 + 1] = 0;
    pos[i * 3 + 2] = 0;

    seed[i * 4 + 0] = Math.random();
    seed[i * 4 + 1] = Math.random();
    seed[i * 4 + 2] = Math.random();
    seed[i * 4 + 3] = Math.random();

    col[i * 3 + 0] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }

  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 4));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));

  const mat = new THREE.PointsMaterial({
    map: texture,
    transparent: true,
    opacity,
    size,
    sizeAttenuation: true,
    vertexColors: true,
    depthWrite,
    depthTest,
    blending,
  });

  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;

  return { points, geo, mat, pos, seed };
}

/* ---------------------------------------------
   Global spawn helpers (WORLD SPACE)
--------------------------------------------- */
const _tmp = new THREE.Vector3();

function randomInBox3(box) {
  return _tmp.set(
    THREE.MathUtils.lerp(box.min.x, box.max.x, Math.random()),
    THREE.MathUtils.lerp(box.min.y, box.max.y, Math.random()),
    THREE.MathUtils.lerp(box.min.z, box.max.z, Math.random())
  );
}

function randomNearDiorama(box, center, radius, inflate = 1.15, maxTries = 14) {
  const r2 = (radius * inflate) ** 2;
  for (let i = 0; i < maxTries; i++) {
    const p = randomInBox3(box).clone();
    if (p.distanceToSquared(center) <= r2) return p;
  }
  return randomInBox3(box).clone();
}

/* ---------------------------------------------
   Main
--------------------------------------------- */
export function addAlchemyParticles(scene, opts = {}) {
  const {
    bounds = null,

    radius = 6,
    height = 3.5,
    center = new THREE.Vector3(0, 1.2, 0),

    // counts
    dustCount = 1800,
    moteCount = 900,
    mistCount = 260,
    emberCount = 160,

    // sizes
    dustSize = 0.012,
    moteSize = 0.02,
    mistSize = 0.09,
    emberSize = 0.02,

    // speeds
    dustSpeed = 0.06,
    moteSpeed = 0.12,
    mistSpeed = 0.035,
    emberSpeed = 0.24,

    // candle anchors (WORLD)
    candlePoints: candlePointsInit = [
      new THREE.Vector3(0.55, 0.95, 0.4),
      new THREE.Vector3(-0.25, 0.85, -0.05),
    ],

    // visual tuning
    dustColor = 0x9fc5ff,
    moteColor = 0xcaa6ff,
    mistColor = 0x7cf5ff,
    emberColor = 0xffb86b,
  } = opts;

  const group = new THREE.Group();
  group.name = "AlchemyParticles";
  group.position.set(0, 0, 0);
  scene.add(group);

  const dotTex = makeSoftDotTexture({ inner: 0.12, outer: 0.95 });
  const flameTex = makeFlameTexture();

  let candlePoints = candlePointsInit.map((p) => p.clone());

  let boundsState = bounds;
  const useBounds =
    !!boundsState?.box &&
    !!boundsState?.center &&
    typeof boundsState?.radius === "number";

  const getBoxW = () => (useBounds ? boundsState.box : null);
  const getCenterW = () => (useBounds ? boundsState.center : center);
  const getRadiusW = () => (useBounds ? boundsState.radius : radius);

  // --- 1) Dust
  const dust = createPointsLayer({
    texture: dotTex,
    count: dustCount,
    size: dustSize,
    opacity: 0.14,
    color: dustColor,
    blending: THREE.NormalBlending,
    depthWrite: false,
    depthTest: true,
  });
  group.add(dust.points);

  // --- 2) Sparkles / motes
  const sparkles = createPointsLayer({
    texture: dotTex,
    count: moteCount,
    size: moteSize,
    opacity: 0.65,
    color: moteColor,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
  });
  group.add(sparkles.points);

  // --- 3) Mist
  const mist = createPointsLayer({
    texture: dotTex,
    count: mistCount,
    size: mistSize,
    opacity: 0.1,
    color: mistColor,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
  });
  group.add(mist.points);

  // --- 4) Embers
  const embers = createPointsLayer({
    texture: dotTex,
    count: emberCount,
    size: emberSize,
    opacity: 0.8,
    color: emberColor,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
  });
  group.add(embers.points);

  // --- 5) Flames
  const flameMatBase = new THREE.SpriteMaterial({
    map: flameTex,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    color: 0xffffff,
  });

  let flames = [];
  function buildFlames() {
    for (const f of flames) group.remove(f);
    flames = [];

    for (let i = 0; i < candlePoints.length; i++) {
      const p = candlePoints[i];
      const s = new THREE.Sprite(flameMatBase.clone());
      s.position.copy(p);
      s.scale.set(0.22, 0.4, 1);
      s.userData.base = p.clone();
      s.userData.phase = Math.random() * Math.PI * 2;
      group.add(s);
      flames.push(s);
    }
  }
  buildFlames();

  /* ---------------------------------------------
     GUI params (vivos)
  --------------------------------------------- */
  const params = {
    enabled: true,

    dustOpacity: dust.mat.opacity,
    sparklesOpacity: sparkles.mat.opacity,
    mistOpacity: mist.mat.opacity,
    embersOpacity: embers.mat.opacity,

    dustSize: dust.mat.size,
    sparklesSize: sparkles.mat.size,
    mistSize: mist.mat.size,
    embersSize: embers.mat.size,

    dustSpeed,
    moteSpeed,
    mistSpeed,
    emberSpeed,
  };

  function applyParamsToMaterials() {
    dust.mat.opacity = params.dustOpacity;
    sparkles.mat.opacity = params.sparklesOpacity;
    mist.mat.opacity = params.mistOpacity;
    embers.mat.opacity = params.embersOpacity;

    dust.mat.size = params.dustSize;
    sparkles.mat.size = params.sparklesSize;
    mist.mat.size = params.mistSize;
    embers.mat.size = params.embersSize;

    group.visible = !!params.enabled;
  }
  applyParamsToMaterials();

  /* ---------------------------------------------
     Spawns (WORLD)
  --------------------------------------------- */
  function spawnDust() {
    const boxW = getBoxW();
    const centerW = getCenterW();
    const radiusW = getRadiusW();

    for (let i = 0; i < dustCount; i++) {
      let p;

      if (useBounds) {
        p = randomNearDiorama(boxW, centerW, radiusW, 1.18);
        // mais para baixo (poeira “no ar” mas não no teto)
        const t = Math.random() ** 1.6;
        p.y = THREE.MathUtils.lerp(boxW.min.y, boxW.max.y, t);
      } else {
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * radiusW;
        const y = centerW.y + (Math.random() - 0.5) * height;
        p = new THREE.Vector3(
          centerW.x + Math.cos(a) * r,
          y,
          centerW.z + Math.sin(a) * r
        );
      }

      dust.pos[i * 3 + 0] = p.x;
      dust.pos[i * 3 + 1] = p.y;
      dust.pos[i * 3 + 2] = p.z;
    }
    dust.geo.attributes.position.needsUpdate = true;
  }

  function spawnSparkles() {
    const boxW = getBoxW();
    const centerW = getCenterW();
    const radiusW = getRadiusW();

    for (let i = 0; i < moteCount; i++) {
      let p;

      if (useBounds) {
        p = randomNearDiorama(boxW, centerW, radiusW, 1.28);
        // distribui bem, mas evita colar ao teto
        const t = Math.random() ** 0.9;
        const yMax = THREE.MathUtils.lerp(centerW.y, boxW.max.y, 0.88);
        p.y = THREE.MathUtils.lerp(centerW.y, yMax, t);
      } else {
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * (radiusW * 0.95);
        const y = centerW.y + Math.random() * height * 0.9;
        p = new THREE.Vector3(
          centerW.x + Math.cos(a) * r,
          y,
          centerW.z + Math.sin(a) * r
        );
      }

      sparkles.pos[i * 3 + 0] = p.x;
      sparkles.pos[i * 3 + 1] = p.y;
      sparkles.pos[i * 3 + 2] = p.z;
    }
    sparkles.geo.attributes.position.needsUpdate = true;
  }

  function spawnMist() {
    const boxW = getBoxW();
    const centerW = getCenterW();
    const radiusW = getRadiusW();

    for (let i = 0; i < mistCount; i++) {
      let p;

      if (useBounds) {
        p = randomNearDiorama(boxW, centerW, radiusW, 1.35);
        const t = Math.random() ** 1.1;
        const yMax = THREE.MathUtils.lerp(centerW.y, boxW.max.y, 0.82);
        p.y = THREE.MathUtils.lerp(centerW.y, yMax, t);
      } else {
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * (radiusW * 0.95);
        const y = centerW.y + Math.random() * height * 0.85;
        p = new THREE.Vector3(
          centerW.x + Math.cos(a) * r,
          y,
          centerW.z + Math.sin(a) * r
        );
      }

      mist.pos[i * 3 + 0] = p.x;
      mist.pos[i * 3 + 1] = p.y;
      mist.pos[i * 3 + 2] = p.z;
    }
    mist.geo.attributes.position.needsUpdate = true;
  }

  function spawnEmbers() {
    if (!candlePoints.length) return;
    for (let i = 0; i < emberCount; i++) {
      const cp = candlePoints[i % candlePoints.length];
      embers.pos[i * 3 + 0] = cp.x + rand(-0.12, 0.12);
      embers.pos[i * 3 + 1] = cp.y + rand(-0.04, 0.05);
      embers.pos[i * 3 + 2] = cp.z + rand(-0.12, 0.12);
    }
    embers.geo.attributes.position.needsUpdate = true;
  }

  function respawn() {
    spawnDust();
    spawnSparkles();
    spawnMist();
    spawnEmbers();
  }

  respawn();

  /* ---------------------------------------------
     Setters (para main/gui)
  --------------------------------------------- */
  function setCandlePoints(newPoints) {
    if (!newPoints || !newPoints.length) return;
    candlePoints = newPoints.map((p) => p.clone());
    buildFlames();
    spawnEmbers();
  }

  function setBounds(newBounds) {
    if (
      !newBounds?.box ||
      !newBounds?.center ||
      typeof newBounds?.radius !== "number"
    )
      return;
    boundsState = newBounds;
    respawn();
  }

  function setParams(p = {}) {
    if (p.enabled !== undefined) params.enabled = !!p.enabled;

    if (p.dustOpacity !== undefined) params.dustOpacity = p.dustOpacity;
    if (p.sparklesOpacity !== undefined)
      params.sparklesOpacity = p.sparklesOpacity;
    if (p.mistOpacity !== undefined) params.mistOpacity = p.mistOpacity;
    if (p.embersOpacity !== undefined) params.embersOpacity = p.embersOpacity;

    if (p.dustSize !== undefined) params.dustSize = p.dustSize;
    if (p.sparklesSize !== undefined) params.sparklesSize = p.sparklesSize;
    if (p.mistSize !== undefined) params.mistSize = p.mistSize;
    if (p.embersSize !== undefined) params.embersSize = p.embersSize;

    if (p.dustSpeed !== undefined) params.dustSpeed = p.dustSpeed;
    if (p.moteSpeed !== undefined) params.moteSpeed = p.moteSpeed;
    if (p.mistSpeed !== undefined) params.mistSpeed = p.mistSpeed;
    if (p.emberSpeed !== undefined) params.emberSpeed = p.emberSpeed;

    applyParamsToMaterials();
  }

  function getParams() {
    return {
      enabled: group.visible,

      dustOpacity: params.dustOpacity,
      sparklesOpacity: params.sparklesOpacity,
      mistOpacity: params.mistOpacity,
      embersOpacity: params.embersOpacity,

      dustSize: params.dustSize,
      sparklesSize: params.sparklesSize,
      mistSize: params.mistSize,
      embersSize: params.embersSize,

      dustSpeed: params.dustSpeed,
      moteSpeed: params.moteSpeed,
      mistSpeed: params.mistSpeed,
      emberSpeed: params.emberSpeed,
    };
  }

  /* ---------------------------------------------
     Update
  --------------------------------------------- */
  let t = 0;

  function update(dt) {
    t += dt;

    const centerW = getCenterW();
    const radiusW = getRadiusW();
    const boxW = getBoxW();

    // Dust
    for (let i = 0; i < dustCount; i++) {
      const si = i * 4;
      const px = i * 3;

      const s0 = dust.seed[si + 0];
      const s1 = dust.seed[si + 1];
      const s2 = dust.seed[si + 2];

      dust.pos[px + 0] +=
        Math.sin(t * 0.25 + s0 * 10) * 0.0012 * (params.dustSpeed * 6);
      dust.pos[px + 2] +=
        Math.cos(t * 0.22 + s1 * 10) * 0.0012 * (params.dustSpeed * 6);
      dust.pos[px + 1] +=
        Math.sin(t * 0.18 + s2 * 10) * 0.0009 * params.dustSpeed;

      const dx = dust.pos[px + 0] - centerW.x;
      const dy = dust.pos[px + 1] - centerW.y;
      const dz = dust.pos[px + 2] - centerW.z;

      if (dx * dx + dy * dy + dz * dz > (radiusW * 1.35) ** 2) {
        let p;
        if (useBounds) {
          p = randomNearDiorama(boxW, centerW, radiusW, 1.18);
          const tt = Math.random() ** 1.6;
          p.y = THREE.MathUtils.lerp(boxW.min.y, boxW.max.y, tt);
        } else {
          const a = Math.random() * Math.PI * 2;
          const r = Math.sqrt(Math.random()) * radiusW;
          const y = centerW.y + (Math.random() - 0.5) * height;
          p = new THREE.Vector3(
            centerW.x + Math.cos(a) * r,
            y,
            centerW.z + Math.sin(a) * r
          );
        }
        dust.pos[px + 0] = p.x;
        dust.pos[px + 1] = p.y;
        dust.pos[px + 2] = p.z;
      }
    }
    dust.geo.attributes.position.needsUpdate = true;

    // Sparkles (sem pull)
    sparkles.mat.opacity =
      params.sparklesOpacity * (0.78 + 0.22 * Math.sin(t * 1.6));

    for (let i = 0; i < moteCount; i++) {
      const si = i * 4;
      const px = i * 3;
      const s0 = sparkles.seed[si + 0];
      const s1 = sparkles.seed[si + 1];
      const s2 = sparkles.seed[si + 2];

      const ang = t * (0.28 + s0 * 0.22);
      sparkles.pos[px + 0] +=
        Math.sin(ang + s1 * 6.0) * 0.0026 * params.moteSpeed;
      sparkles.pos[px + 2] +=
        Math.cos(ang + s0 * 6.0) * 0.0026 * params.moteSpeed;
      sparkles.pos[px + 1] +=
        Math.sin(t * 0.6 + s2 * 9) * 0.0011 * params.moteSpeed;

      const dx = sparkles.pos[px + 0] - centerW.x;
      const dy = sparkles.pos[px + 1] - centerW.y;
      const dz = sparkles.pos[px + 2] - centerW.z;

      if (dx * dx + dy * dy + dz * dz > (radiusW * 1.55) ** 2) {
        let p;
        if (useBounds) {
          p = randomNearDiorama(boxW, centerW, radiusW, 1.28);
          const tt = Math.random() ** 0.9;
          const yMax = THREE.MathUtils.lerp(centerW.y, boxW.max.y, 0.88);
          p.y = THREE.MathUtils.lerp(centerW.y, yMax, tt);
        } else {
          const a = Math.random() * Math.PI * 2;
          const r = Math.sqrt(Math.random()) * (radiusW * 0.95);
          const y = centerW.y + Math.random() * height * 0.9;
          p = new THREE.Vector3(
            centerW.x + Math.cos(a) * r,
            y,
            centerW.z + Math.sin(a) * r
          );
        }
        sparkles.pos[px + 0] = p.x;
        sparkles.pos[px + 1] = p.y;
        sparkles.pos[px + 2] = p.z;
      }
    }
    sparkles.geo.attributes.position.needsUpdate = true;

    // Mist
    mist.mat.opacity = params.mistOpacity * (0.75 + 0.25 * Math.sin(t * 0.45));
    for (let i = 0; i < mistCount; i++) {
      const si = i * 4;
      const px = i * 3;

      const s0 = mist.seed[si + 0];
      const s1 = mist.seed[si + 1];

      mist.pos[px + 0] +=
        Math.sin(t * 0.12 + s0 * 10) * 0.0012 * params.mistSpeed;
      mist.pos[px + 2] +=
        Math.cos(t * 0.11 + s1 * 10) * 0.0012 * params.mistSpeed;

      const dx = mist.pos[px + 0] - centerW.x;
      const dy = mist.pos[px + 1] - centerW.y;
      const dz = mist.pos[px + 2] - centerW.z;

      if (dx * dx + dy * dy + dz * dz > (radiusW * 1.7) ** 2) {
        let p;
        if (useBounds) {
          p = randomNearDiorama(boxW, centerW, radiusW, 1.35);
          const tt = Math.random() ** 1.1;
          const yMax = THREE.MathUtils.lerp(centerW.y, boxW.max.y, 0.82);
          p.y = THREE.MathUtils.lerp(centerW.y, yMax, tt);
        } else {
          const a = Math.random() * Math.PI * 2;
          const r = Math.sqrt(Math.random()) * (radiusW * 0.95);
          const y = centerW.y + Math.random() * height * 0.85;
          p = new THREE.Vector3(
            centerW.x + Math.cos(a) * r,
            y,
            centerW.z + Math.sin(a) * r
          );
        }
        mist.pos[px + 0] = p.x;
        mist.pos[px + 1] = p.y;
        mist.pos[px + 2] = p.z;
      }
    }
    mist.geo.attributes.position.needsUpdate = true;

    // Embers
    if (candlePoints.length) {
      for (let i = 0; i < emberCount; i++) {
        const si = i * 4;
        const px = i * 3;
        const s0 = embers.seed[si + 0];
        const s1 = embers.seed[si + 1];

        embers.pos[px + 1] += (0.006 + s0 * 0.006) * params.emberSpeed;
        embers.pos[px + 0] += Math.sin(t * 2.2 + s0 * 10) * 0.0009;
        embers.pos[px + 2] += Math.cos(t * 2.0 + s1 * 10) * 0.0009;

        const cp = candlePoints[i % candlePoints.length];
        if (embers.pos[px + 1] > cp.y + 0.85) {
          embers.pos[px + 0] = cp.x + rand(-0.12, 0.12);
          embers.pos[px + 1] = cp.y + rand(-0.04, 0.05);
          embers.pos[px + 2] = cp.z + rand(-0.12, 0.12);
        }
      }
      embers.geo.attributes.position.needsUpdate = true;
    }

    // Flames
    for (let i = 0; i < flames.length; i++) {
      const s = flames[i];
      const ph = s.userData.phase;
      const flick =
        0.1 * Math.sin(t * 10 + ph) +
        0.06 * Math.sin(t * 17 + ph * 1.7) +
        0.02 * Math.sin(t * 31 + ph * 2.1);

      s.position.x = s.userData.base.x + Math.sin(t * 3.0 + ph) * 0.005;
      s.position.z = s.userData.base.z + Math.cos(t * 2.8 + ph) * 0.005;
      s.position.y = s.userData.base.y + 0.02 + flick * 0.08;

      s.scale.set(0.22 + flick * 0.08, 0.4 + flick * 0.16, 1);
      s.material.opacity = 0.78 + flick * 0.22;
    }
  }

  return {
    object: group,
    update,

    // main
    setCandlePoints,
    setBounds,

    // gui
    setParams,
    getParams,
    respawn,

    // debug
    _debug: { dust, sparkles, mist, embers, flames },
  };
}
