import * as THREE from "three";

export function addAlchemyParticles(scene, opts = {}) {
  const {
    radius = 7,
    height = 4,
    center = new THREE.Vector3(0, 1.2, 0),

    dustCount = 1200,
    moteCount = 260,
    emberCount = 60,

    dustColor = 0xb9c3ff, // poeira fria
    moteColorA = 0x9fc5ff, // brilho azul
    moteColorB = 0xc7ffb0, // brilho esverdeado
    emberColor = 0xffb36b, // laranja “vela”

    seed = 1337,
  } = opts;

  // ---------- helpers ----------
  const rand = mulberry32(seed);
  const tmpV = new THREE.Vector3();

  function randomInCylinder(r, h) {
    const a = rand() * Math.PI * 2;
    const rr = Math.sqrt(rand()) * r;
    const x = Math.cos(a) * rr;
    const z = Math.sin(a) * rr;
    const y = (rand() - 0.5) * h;
    return { x, y, z };
  }

  function makePoints({
    count,
    size,
    opacity,
    blending,
    depthWrite,
    colorFn,
    speedFn,
    twinkle = false,
    twinkleSpeed = 2.0,
    twinkleMin = 0.3,
    twinkleMax = 1.0,
  }) {
    const geo = new THREE.BufferGeometry();

    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    const phase = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const p = randomInCylinder(radius, height);
      pos[i * 3 + 0] = center.x + p.x;
      pos[i * 3 + 1] = center.y + p.y;
      pos[i * 3 + 2] = center.z + p.z;

      const c = colorFn(i, count);
      col[i * 3 + 0] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;

      const v = speedFn(i, count);
      vel[i * 3 + 0] = v.x;
      vel[i * 3 + 1] = v.y;
      vel[i * 3 + 2] = v.z;

      phase[i] = rand() * Math.PI * 2;
    }

    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    geo.setAttribute("velocity", new THREE.BufferAttribute(vel, 3));
    geo.setAttribute("phase", new THREE.BufferAttribute(phase, 1));

    const mat = new THREE.PointsMaterial({
      size,
      transparent: true,
      opacity,
      vertexColors: true,
      blending,
      depthWrite,
      depthTest: true,
    });

    const points = new THREE.Points(geo, mat);

    // update
    const update = (dt, t) => {
      const posAttr = geo.getAttribute("position");
      const velAttr = geo.getAttribute("velocity");
      const phaseAttr = geo.getAttribute("phase");

      for (let i = 0; i < count; i++) {
        const ix = i * 3;

        // move
        posAttr.array[ix + 0] += velAttr.array[ix + 0] * dt;
        posAttr.array[ix + 1] += velAttr.array[ix + 1] * dt;
        posAttr.array[ix + 2] += velAttr.array[ix + 2] * dt;

        // keep inside volume (wrap)
        const x = posAttr.array[ix + 0] - center.x;
        const y = posAttr.array[ix + 1] - center.y;
        const z = posAttr.array[ix + 2] - center.z;

        const r2 = x * x + z * z;
        if (r2 > radius * radius || y < -height / 2 || y > height / 2) {
          const p = randomInCylinder(radius, height);
          posAttr.array[ix + 0] = center.x + p.x;
          posAttr.array[ix + 1] = center.y + p.y;
          posAttr.array[ix + 2] = center.z + p.z;
        }

        // optional subtle “float” wiggle
        posAttr.array[ix + 0] += Math.sin(t * 0.6 + phaseAttr.array[i]) * dt * 0.02;
        posAttr.array[ix + 2] += Math.cos(t * 0.6 + phaseAttr.array[i]) * dt * 0.02;
      }

      posAttr.needsUpdate = true;

      // twinkle (material opacity modulation)
      if (twinkle) {
        const k =
          twinkleMin +
          (twinkleMax - twinkleMin) * (0.5 + 0.5 * Math.sin(t * twinkleSpeed));
        mat.opacity = opacity * k;
      }
    };

    return { points, update };
  }

  // ---------- palettes ----------
  const cDust = new THREE.Color(dustColor);
  const cA = new THREE.Color(moteColorA);
  const cB = new THREE.Color(moteColorB);
  const cEmber = new THREE.Color(emberColor);

  // 1) Dust: muito leve, pouca luz, motion quase zero
  const dust = makePoints({
    count: dustCount,
    size: 0.012,
    opacity: 0.22,
    blending: THREE.NormalBlending,
    depthWrite: false,
    colorFn: () => cDust.clone().multiplyScalar(0.9 + rand() * 0.2),
    speedFn: () => new THREE.Vector3(
      (rand() - 0.5) * 0.03,
      (rand() - 0.5) * 0.02,
      (rand() - 0.5) * 0.03
    ),
  });

  // 2) Magic motes: poucos, brilhantes, twinkle, drift suave
  const motes = makePoints({
    count: moteCount,
    size: 0.03,
    opacity: 0.65,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    twinkle: true,
    twinkleSpeed: 2.4,
    twinkleMin: 0.35,
    twinkleMax: 1.0,
    colorFn: (i, n) => {
      // mistura gradual A->B
      const t = i / Math.max(1, n - 1);
      return cA.clone().lerp(cB, t).multiplyScalar(0.9 + rand() * 0.2);
    },
    speedFn: () => new THREE.Vector3(
      (rand() - 0.5) * 0.08,
      (rand() - 0.5) * 0.05,
      (rand() - 0.5) * 0.08
    ),
  });

  // 3) Embers: sobem, poucas, mais “candle”
  const embers = makePoints({
    count: emberCount,
    size: 0.02,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    twinkle: true,
    twinkleSpeed: 4.2,
    twinkleMin: 0.25,
    twinkleMax: 1.0,
    colorFn: () => cEmber.clone().multiplyScalar(0.85 + rand() * 0.3),
    speedFn: () => new THREE.Vector3(
      (rand() - 0.5) * 0.03,
      0.10 + rand() * 0.18,
      (rand() - 0.5) * 0.03
    ),
  });

  // group
  const group = new THREE.Group();
  group.name = "AlchemyParticles";
  group.add(dust.points, motes.points, embers.points);
  scene.add(group);

  let t = 0;
  return {
    group,
    update: (dt) => {
      t += dt;
      dust.update(dt, t);
      motes.update(dt, t);
      embers.update(dt, t);
    },
    setEnabled: (v) => (group.visible = v),
  };
}

// PRNG (determinístico)
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}