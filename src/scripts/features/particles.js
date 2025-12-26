import * as THREE from "three";

function makeSoftDotTexture({ size = 128, inner = 0.15, outer = 0.95 } = {}) {
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
    blending,
  });

  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;

  return { points, geo, mat, pos, seed };
}

export function addAlchemyParticles(scene, opts = {}) {
  const {
    radius = 6,
    height = 3.5,
    center = new THREE.Vector3(0, 1.2, 0),

    dustCount = 900,
    moteCount = 380,
    emberCount = 90,

    dustSize = 0.02,
    moteSize = 0.03,
    emberSize = 0.028,

    dustSpeed = 0.06,
    moteSpeed = 0.1,
    emberSpeed = 0.22,

    candlePoints: candlePointsInit = [
      new THREE.Vector3(0.55, 0.95, 0.4),
      new THREE.Vector3(-0.25, 0.85, -0.05),
    ],

    magicPoint = new THREE.Vector3(0.15, 1.05, -0.25),

    // ajustes de “pavio”
    flameYOffset = 0.06,    // sobe a chama (pavio)
    emberSpawnJitter = 0.10 // espalhamento horizontal
  } = opts;

  const group = new THREE.Group();
  group.name = "AlchemyParticles";
  scene.add(group);

  const dotTex = makeSoftDotTexture({ inner: 0.12, outer: 0.95 });
  const flameTex = makeFlameTexture();

  // estado vivo
  let candlePoints = candlePointsInit.slice();

  // layers
  const dust = createPointsLayer({
    texture: dotTex,
    count: dustCount,
    size: dustSize,
    opacity: 0.16,
    color: 0x9fc5ff,
    blending: THREE.NormalBlending,
    depthWrite: false,
  });
  group.add(dust.points);

  const motes = createPointsLayer({
    texture: dotTex,
    count: moteCount,
    size: moteSize,
    opacity: 0.55,
    color: 0xcaa6ff,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  group.add(motes.points);

  const embers = createPointsLayer({
    texture: dotTex,
    count: emberCount,
    size: emberSize,
    opacity: 0.65,
    color: 0xffb86b,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  group.add(embers.points);

  // flame sprites
  const flameMatBase = new THREE.SpriteMaterial({
    map: flameTex,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    color: 0xffffff,
  });

  let flames = [];

  // candle lights
  let candleLights = [];
  const candleLightColor = new THREE.Color(0xffc98a);

  function clearArrayObjects(arr) {
    for (const o of arr) group.remove(o);
    arr.length = 0;
  }

  function rebuildFlamesAndLights() {
    clearArrayObjects(flames);
    clearArrayObjects(candleLights);

    for (let i = 0; i < candlePoints.length; i++) {
      const p = candlePoints[i];

      // flame sprite
      const s = new THREE.Sprite(flameMatBase.clone());
      s.position.copy(p);
      s.position.y += flameYOffset;
      s.scale.set(0.22, 0.4, 1);
      s.userData.base = s.position.clone();
      s.userData.phase = Math.random() * Math.PI * 2;
      group.add(s);
      flames.push(s);

      // point light
      const L = new THREE.PointLight(candleLightColor, 0.8, 2.2, 2);
      L.position.copy(p);
      L.position.y += flameYOffset;
      L.userData.phase = Math.random() * Math.PI * 2;
      group.add(L);
      candleLights.push(L);
    }
  }

  // magic wisp
  const wispMat = new THREE.SpriteMaterial({
    map: dotTex,
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    color: new THREE.Color(0x7cf5ff),
  });

  const wisp = new THREE.Sprite(wispMat);
  wisp.position.copy(magicPoint);
  wisp.scale.set(0.65, 0.65, 1);
  wisp.userData.phase = Math.random() * Math.PI * 2;
  group.add(wisp);

  function spawnDust() {
    for (let i = 0; i < dustCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * radius;
      const y = center.y + (Math.random() - 0.5) * height;
      dust.pos[i * 3 + 0] = center.x + Math.cos(a) * r;
      dust.pos[i * 3 + 1] = y;
      dust.pos[i * 3 + 2] = center.z + Math.sin(a) * r;
    }
    dust.geo.attributes.position.needsUpdate = true;
  }

  function spawnMotes() {
    for (let i = 0; i < moteCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * (radius * 0.55);
      const y = center.y + Math.random() * height * 0.65;
      motes.pos[i * 3 + 0] = center.x + Math.cos(a) * r;
      motes.pos[i * 3 + 1] = y;
      motes.pos[i * 3 + 2] = center.z + Math.sin(a) * r;
    }
    motes.geo.attributes.position.needsUpdate = true;
  }

  function spawnEmbers() {
    if (!candlePoints.length) return;

    for (let i = 0; i < emberCount; i++) {
      const cp = candlePoints[i % candlePoints.length];
      embers.pos[i * 3 + 0] = cp.x + rand(-emberSpawnJitter, emberSpawnJitter);
      embers.pos[i * 3 + 1] = cp.y + rand(-0.03, 0.05) + flameYOffset * 0.6;
      embers.pos[i * 3 + 2] = cp.z + rand(-emberSpawnJitter, emberSpawnJitter);
    }
    embers.geo.attributes.position.needsUpdate = true;
  }

  // init
  rebuildFlamesAndLights();
  spawnDust();
  spawnMotes();
  spawnEmbers();

  // setter forte (reconstrói sprites + luzes)
  function setCandlePoints(newPoints) {
    if (!newPoints || !newPoints.length) return;
    candlePoints = newPoints.slice();
    rebuildFlamesAndLights();
    spawnEmbers();
  }

  let t = 0;
  const v = new THREE.Vector3();

  function update(dt) {
    t += dt;

    // Dust
    for (let i = 0; i < dustCount; i++) {
      const si = i * 4;
      const px = i * 3;

      const s0 = dust.seed[si + 0];
      const s1 = dust.seed[si + 1];
      const s2 = dust.seed[si + 2];

      dust.pos[px + 0] += Math.sin(t * 0.3 + s0 * 10) * 0.0015 * (dustSpeed * 5);
      dust.pos[px + 2] += Math.cos(t * 0.28 + s1 * 10) * 0.0015 * (dustSpeed * 5);
      dust.pos[px + 1] += Math.sin(t * 0.22 + s2 * 10) * 0.001 * dustSpeed;

      const dx = dust.pos[px + 0] - center.x;
      const dz = dust.pos[px + 2] - center.z;
      if (dx * dx + dz * dz > radius * radius) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * radius;
        dust.pos[px + 0] = center.x + Math.cos(a) * r;
        dust.pos[px + 2] = center.z + Math.sin(a) * r;
      }
      if (dust.pos[px + 1] < center.y - height * 0.55) dust.pos[px + 1] = center.y + height * 0.55;
      if (dust.pos[px + 1] > center.y + height * 0.55) dust.pos[px + 1] = center.y - height * 0.55;
    }
    dust.geo.attributes.position.needsUpdate = true;

    // Motes
    motes.mat.opacity = 0.45 + 0.25 * Math.sin(t * 1.5);

    for (let i = 0; i < moteCount; i++) {
      const si = i * 4;
      const px = i * 3;
      const s0 = motes.seed[si + 0];
      const s1 = motes.seed[si + 1];

      const ang = t * (0.35 + s0 * 0.25);
      const ax = Math.sin(ang + s1 * 6.0) * 0.003 * moteSpeed;
      const az = Math.cos(ang + s0 * 6.0) * 0.003 * moteSpeed;

      motes.pos[px + 0] += ax;
      motes.pos[px + 2] += az;
      motes.pos[px + 1] += Math.sin(t * 0.7 + s0 * 9) * 0.0012 * moteSpeed;

      const vx = magicPoint.x - motes.pos[px + 0];
      const vy = magicPoint.y - motes.pos[px + 1];
      const vz = magicPoint.z - motes.pos[px + 2];
      motes.pos[px + 0] += vx * 0.00015;
      motes.pos[px + 1] += vy * 0.00015;
      motes.pos[px + 2] += vz * 0.00015;
    }
    motes.geo.attributes.position.needsUpdate = true;

    // Embers
    if (candlePoints.length) {
      for (let i = 0; i < emberCount; i++) {
        const si = i * 4;
        const px = i * 3;
        const s0 = embers.seed[si + 0];

        embers.pos[px + 1] += (0.006 + s0 * 0.006) * emberSpeed;
        embers.pos[px + 0] += Math.sin(t * 2.0 + s0 * 10) * 0.0009;
        embers.pos[px + 2] += Math.cos(t * 1.8 + s0 * 10) * 0.0009;

        const cp = candlePoints[i % candlePoints.length];
        if (embers.pos[px + 1] > cp.y + 0.75) {
          embers.pos[px + 0] = cp.x + rand(-emberSpawnJitter, emberSpawnJitter);
          embers.pos[px + 1] = cp.y + rand(-0.03, 0.05) + flameYOffset * 0.6;
          embers.pos[px + 2] = cp.z + rand(-emberSpawnJitter, emberSpawnJitter);
        }
      }
      embers.geo.attributes.position.needsUpdate = true;
    }

    // Flames + candle lights flicker
    for (let i = 0; i < flames.length; i++) {
      const s = flames[i];
      const ph = s.userData.phase;

      const flick = 0.1 * Math.sin(t * 10 + ph) + 0.06 * Math.sin(t * 17 + ph * 1.7);

      s.position.y = s.userData.base.y + flick * 0.08;
      s.scale.set(0.22 + flick * 0.08, 0.4 + flick * 0.15, 1);
      s.material.opacity = 0.75 + flick * 0.2;

      const L = candleLights[i];
      if (L) {
        L.intensity = 0.75 + flick * 0.55;
        L.position.y = s.position.y; // sincroniza com a chama
      }
    }

    // Wisp
    const wp = wisp.userData.phase;
    wisp.material.opacity = 0.26 + 0.18 * Math.sin(t * 1.7 + wp);
    wisp.scale.setScalar(0.6 + 0.12 * Math.sin(t * 1.2 + wp));
    wisp.position.x = magicPoint.x + Math.sin(t * 0.55 + wp) * 0.1;
    wisp.position.z = magicPoint.z + Math.cos(t * 0.48 + wp) * 0.1;
  }

  return {
    object: group,
    update,
    setCenter(v3) {
      center.copy(v3);
    },
    setCandlePoints,
    setMagicPoint(v3) {
      magicPoint.copy(v3);
      wisp.position.copy(magicPoint);
    },
    // se quiseres depurar:
    _debug: { getCandlePoints: () => candlePoints, candleLights }
  };
}