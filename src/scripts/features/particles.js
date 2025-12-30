// scripts/features/particles.js
import * as THREE from "three";

/* ---------------------------------------------
   Textures
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
   Spawn helpers (WORLD)
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

    // fallback volume
    radius = 6,
    height = 3.5,
    center = new THREE.Vector3(0, 1.2, 0),

    // counts (fixos depois de criar)
    dustCount = 1400,
    moteCount = 750,
    mistCount = 160,
    emberCount = 140,

    // sizes
    dustSize = 0.012,
    moteSize = 0.02,
    mistSize = 0.085,
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

    // colors
    dustColor = 0x9fc5ff,
    moteColor = 0xcaa6ff,
    mistColor = 0x7cf5ff,
    emberColor = 0xffb86b,
  } = opts;

  // ---------- GUI-friendly params ----------
  const params = {
    enabled: true,

    showDust: true,
    showSparkles: true,
    showMist: true,
    showEmbers: true,
    showFlames: true,

    dustOpacity: 0.11,
    sparklesOpacity: 0.55,
    mistOpacity: 0.08,
    embersOpacity: 0.75,
    flamesOpacity: 0.88,

    dustSize,
    sparklesSize: moteSize,
    mistSize,
    embersSize: emberSize,

    dustSpeed,
    sparklesSpeed: moteSpeed,
    mistSpeed,
    embersSpeed: emberSpeed,

    flamesScale: 0.4, // controla altura da chama (base 0.40)
    flamesFlicker: 1.0, // multiplier do flicker
  };

  const group = new THREE.Group();
  group.name = "AlchemyParticles";
  scene.add(group);

  const dotTex = makeSoftDotTexture({ inner: 0.12, outer: 0.95 });
  const flameTex = makeFlameTexture();

  let candlePoints = candlePointsInit.map((p) => p.clone());

  const useBounds =
    !!bounds?.box && !!bounds?.center && typeof bounds?.radius === "number";
  const boxW = useBounds ? bounds.box : null;
  const centerW = useBounds ? bounds.center : center.clone();
  const radiusW = useBounds ? bounds.radius : radius;

  // --- layers
  const dust = createPointsLayer({
    texture: dotTex,
    count: dustCount,
    size: params.dustSize,
    opacity: params.dustOpacity,
    color: dustColor,
    blending: THREE.NormalBlending,
    depthWrite: false,
    depthTest: true,
  });
  group.add(dust.points);

  const sparkles = createPointsLayer({
    texture: dotTex,
    count: moteCount,
    size: params.sparklesSize,
    opacity: params.sparklesOpacity,
    color: moteColor,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
  });
  group.add(sparkles.points);

  const mist = createPointsLayer({
    texture: dotTex,
    count: mistCount,
    size: params.mistSize,
    opacity: params.mistOpacity,
    color: mistColor,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
  });
  group.add(mist.points);

  const embers = createPointsLayer({
    texture: dotTex,
    count: emberCount,
    size: params.embersSize,
    opacity: params.embersOpacity,
    color: emberColor,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
  });
  group.add(embers.points);

  // --- flames
  const flameMatBase = new THREE.SpriteMaterial({
    map: flameTex,
    transparent: true,
    opacity: params.flamesOpacity,
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
      s.scale.set(0.22, params.flamesScale, 1);
      s.userData.base = p.clone();
      s.userData.phase = Math.random() * Math.PI * 2;
      group.add(s);
      flames.push(s);
    }
  }
  buildFlames();

  /* ---------------------------------------------
     Spawns
  --------------------------------------------- */
  function spawnDust() {
    for (let i = 0; i < dustCount; i++) {
      let p;
      if (useBounds) {
        p = randomNearDiorama(boxW, centerW, radiusW, 1.18);
        // ✅ menos bias para o topo
        const t = Math.random() ** 1.15;
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
    for (let i = 0; i < moteCount; i++) {
      let p;
      if (useBounds) {
        p = randomNearDiorama(boxW, centerW, radiusW, 1.25);
        // ✅ menos puxa-para-cima
        const t = Math.random() ** 0.95;
        p.y = THREE.MathUtils.lerp(
          boxW.min.y + (bounds?.size?.y ?? 1) * 0.25,
          boxW.max.y,
          t
        );
      } else {
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * (radiusW * 0.9);
        const y = centerW.y + Math.random() * height * 0.95;
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
    for (let i = 0; i < mistCount; i++) {
      let p;
      if (useBounds) {
        p = randomNearDiorama(boxW, centerW, radiusW, 1.32);
        const t = Math.random() ** 1.05;
        p.y = THREE.MathUtils.lerp(boxW.min.y, boxW.max.y, t);
      } else {
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * (radiusW * 0.95);
        const y = centerW.y + Math.random() * height;
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

  spawnDust();
  spawnSparkles();
  spawnMist();
  spawnEmbers();

  /* ---------------------------------------------
     Setters
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
    opts.bounds = newBounds;
    spawnDust();
    spawnSparkles();
    spawnMist();
  }

  function applyParams() {
    group.visible = !!params.enabled;

    dust.points.visible = !!params.showDust;
    sparkles.points.visible = !!params.showSparkles;
    mist.points.visible = !!params.showMist;
    embers.points.visible = !!params.showEmbers;

    for (const f of flames) f.visible = !!params.showFlames;

    dust.mat.opacity = params.dustOpacity;
    sparkles.mat.opacity = params.sparklesOpacity;
    mist.mat.opacity = params.mistOpacity;
    embers.mat.opacity = params.embersOpacity;

    dust.mat.size = params.dustSize;
    sparkles.mat.size = params.sparklesSize;
    mist.mat.size = params.mistSize;
    embers.mat.size = params.embersSize;

    for (const f of flames) {
      f.material.opacity = params.flamesOpacity;
      f.scale.set(0.22, params.flamesScale, 1);
    }
  }

  function setParams(p = {}) {
    Object.assign(params, p);
    applyParams();
  }

  function getParams() {
    return params; // devolve a referência (GUI mexe direto)
  }

  applyParams();

  /* ---------------------------------------------
     Update
  --------------------------------------------- */
  let t = 0;

  function update(dt) {
    if (!params.enabled) return;
    t += dt;

    // Dust
    if (params.showDust) {
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

        // ✅ drift vertical muito mais baixo para não “subirem”
        dust.pos[px + 1] +=
          Math.sin(t * 0.18 + s2 * 10) * 0.00035 * params.dustSpeed;

        const dx = dust.pos[px + 0] - centerW.x;
        const dy = dust.pos[px + 1] - centerW.y;
        const dz = dust.pos[px + 2] - centerW.z;

        if (dx * dx + dy * dy + dz * dz > (radiusW * 1.35) ** 2) {
          let p;
          if (useBounds) {
            p = randomNearDiorama(boxW, centerW, radiusW, 1.18);
            const tt = Math.random() ** 1.15;
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
    }

    // Sparkles
    if (params.showSparkles) {
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
          Math.sin(ang + s1 * 6.0) * 0.0026 * params.sparklesSpeed;
        sparkles.pos[px + 2] +=
          Math.cos(ang + s0 * 6.0) * 0.0026 * params.sparklesSpeed;

        // ✅ drift vertical reduzido
        sparkles.pos[px + 1] +=
          Math.sin(t * 0.6 + s2 * 9) * 0.00055 * params.sparklesSpeed;

        const dx = sparkles.pos[px + 0] - centerW.x;
        const dy = sparkles.pos[px + 1] - centerW.y;
        const dz = sparkles.pos[px + 2] - centerW.z;

        if (dx * dx + dy * dy + dz * dz > (radiusW * 1.55) ** 2) {
          let p;
          if (useBounds) {
            p = randomNearDiorama(boxW, centerW, radiusW, 1.25);
            const tt = Math.random() ** 0.95;
            p.y = THREE.MathUtils.lerp(
              boxW.min.y + (bounds?.size?.y ?? 1) * 0.25,
              boxW.max.y,
              tt
            );
          } else {
            const a = Math.random() * Math.PI * 2;
            const r = Math.sqrt(Math.random()) * (radiusW * 0.9);
            const y = centerW.y + Math.random() * height * 0.95;
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
    }

    // Mist
    if (params.showMist) {
      mist.mat.opacity =
        params.mistOpacity * (0.78 + 0.22 * Math.sin(t * 0.45));

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
            p = randomNearDiorama(boxW, centerW, radiusW, 1.32);
            const tt = Math.random() ** 1.05;
            p.y = THREE.MathUtils.lerp(boxW.min.y, boxW.max.y, tt);
          } else {
            const a = Math.random() * Math.PI * 2;
            const r = Math.sqrt(Math.random()) * (radiusW * 0.95);
            const y = centerW.y + Math.random() * height;
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
    }

    // Embers
    if (params.showEmbers && candlePoints.length) {
      for (let i = 0; i < emberCount; i++) {
        const si = i * 4;
        const px = i * 3;
        const s0 = embers.seed[si + 0];
        const s1 = embers.seed[si + 1];

        embers.pos[px + 1] += (0.006 + s0 * 0.006) * params.embersSpeed;
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
    if (params.showFlames) {
      for (let i = 0; i < flames.length; i++) {
        const s = flames[i];
        const ph = s.userData.phase;

        const flickBase =
          0.1 * Math.sin(t * 10 + ph) +
          0.06 * Math.sin(t * 17 + ph * 1.7) +
          0.02 * Math.sin(t * 31 + ph * 2.1);

        const flick = flickBase * params.flamesFlicker;

        s.position.x = s.userData.base.x + Math.sin(t * 3.0 + ph) * 0.005;
        s.position.z = s.userData.base.z + Math.cos(t * 2.8 + ph) * 0.005;
        s.position.y = s.userData.base.y + 0.02 + flick * 0.08;

        s.scale.set(0.22 + flick * 0.08, params.flamesScale + flick * 0.16, 1);
        s.material.opacity = params.flamesOpacity * (0.86 + flick * 0.18);
      }
    }
  }

  return {
    object: group,
    update,
    setCandlePoints,
    setBounds,
    setParams,
    getParams,
    _debug: { dust, sparkles, mist, embers, flames },
  };
}
