import GUI from "lil-gui";
import * as THREE from "three";

let _fps = {
  value: 0,
  _frames: 0,
  _lastTime: performance.now(),
};

export function updateFPS() {
  _fps._frames++;
  const now = performance.now();
  const delta = now - _fps._lastTime;

  if (delta >= 500) {
    // atualiza 2x por segundo (mais estável)
    _fps.value = Math.round((_fps._frames * 1000) / delta);
    _fps._frames = 0;
    _fps._lastTime = now;
  }
}

export function getFPS() {
  return _fps;
}

export function setupGUI({
  renderer,
  scene,
  lights = {},
  particles,
  post,
  perf,
}) {
  const gui = new GUI({ title: "Debug" });

  // ---------------- Renderer ----------------
  const fR = gui.addFolder("Renderer");
  fR.close();
  const paramsR = {
    exposure: renderer.toneMappingExposure ?? 1.0,
    transparent: renderer.getClearAlpha() === 0,
  };

  fR.add(paramsR, "exposure", 0.2, 2.5, 0.01).onChange((v) => {
    renderer.toneMappingExposure = v;
  });

  fR.add(paramsR, "transparent").onChange((v) => {
    renderer.setClearAlpha(v ? 0 : 1);
    if (!v) renderer.setClearColor(0x000000, 1);
  });

  // ---------------- Fog ----------------
  const fFog = gui.addFolder("Fog");
  fFog.close();
  const fogParams = {
    enabled: !!scene.fog,
    color: scene.fog ? `#${scene.fog.color.getHexString()}` : "#0b0a12",
    near: scene.fog?.near ?? 2,
    far: scene.fog?.far ?? 30,
  };

  const applyFog = () => {
    if (!fogParams.enabled) {
      scene.fog = null;
      return;
    }
    scene.fog = new THREE.Fog(fogParams.color, fogParams.near, fogParams.far);
  };

  fFog.add(fogParams, "enabled").onChange(applyFog);
  fFog.addColor(fogParams, "color").onChange(applyFog);
  fFog.add(fogParams, "near", 0, 3000, 0.1).onChange(applyFog);
  fFog.add(fogParams, "far", 1, 8000, 0.5).onChange(applyFog);

  // ---------------- Lights ----------------
  const fL = gui.addFolder("Lights");
  fL.close();

  // helper para não rebentar quando não existe a luz
  function addLightFolder(
    folder,
    label,
    light,
    {
      intensityMin = 0,
      intensityMax = 10,
      posRange = 50,
      showColor = true,
    } = {}
  ) {
    if (!light) return;

    const p = {
      visible: light.visible ?? true,
      intensity: light.intensity ?? 1,
      color: light.color ? `#${light.color.getHexString()}` : "#ffffff",
      x: light.position?.x ?? 0,
      y: light.position?.y ?? 0,
      z: light.position?.z ?? 0,
    };

    const ff = folder.addFolder(label);
    ff.add(p, "visible").onChange((v) => (light.visible = v));

    if (light.intensity !== undefined) {
      ff.add(p, "intensity", intensityMin, intensityMax, 0.01).onChange(
        (v) => (light.intensity = v)
      );
    }

    if (showColor && light.color) {
      ff.addColor(p, "color").onChange((v) => light.color.set(v));
    }

    // algumas luzes (Hemisphere) têm groundColor
    if (light.groundColor) {
      const pg = { ground: `#${light.groundColor.getHexString()}` };
      ff.addColor(pg, "ground")
        .name("groundColor")
        .onChange((v) => light.groundColor.set(v));
    }

    if (light.position) {
      ff.add(p, "x", -posRange, posRange, 0.1).onChange(
        (v) => (light.position.x = v)
      );
      ff.add(p, "y", -posRange, posRange, 0.1).onChange(
        (v) => (light.position.y = v)
      );
      ff.add(p, "z", -posRange, posRange, 0.1).onChange(
        (v) => (light.position.z = v)
      );
    }
  }

  // suporta os dois mundos: Olympus e Alchemy
  addLightFolder(fL, "Hemisphere", lights.hemi, {
    intensityMax: 3,
    posRange: 10,
  });
  addLightFolder(fL, "Sun (Directional)", lights.sun, {
    intensityMax: 5,
    posRange: 60,
  });
  addLightFolder(fL, "Fill (Directional)", lights.fill, {
    intensityMax: 3,
    posRange: 60,
  });
  addLightFolder(fL, "Ambient", lights.amb, { intensityMax: 2, posRange: 1 });

  // Alchemy (se existirem)
  addLightFolder(fL, "Moon (Directional)", lights.moon, {
    intensityMax: 5,
    posRange: 60,
  });
  addLightFolder(fL, "Ambient (Alchemy)", lights.ambient, {
    intensityMax: 2,
    posRange: 1,
  });
  addLightFolder(fL, "Candle A", lights.candleA, {
    intensityMax: 30,
    posRange: 20,
  });
  addLightFolder(fL, "Candle B", lights.candleB, {
    intensityMax: 30,
    posRange: 20,
  });
  addLightFolder(fL, "Magic", lights.magic, { intensityMax: 25, posRange: 20 });
  addLightFolder(fL, "Arcane", lights.arcane, {
    intensityMax: 15,
    posRange: 20,
  });

  // fallback: se quiseres, mostra automaticamente qualquer luz extra
  const known = new Set([
    "hemi",
    "sun",
    "fill",
    "amb",
    "moon",
    "ambient",
    "candleA",
    "candleB",
    "magic",
    "arcane",
  ]);
  for (const [k, v] of Object.entries(lights)) {
    if (known.has(k)) continue;
    if (v && (v.isLight || v.isObject3D))
      addLightFolder(fL, k, v, { intensityMax: 20 });
  }

  // no fim de setupGUI(...)
  // ---------------- Particles ----------------
  if (particles) {
    const fP = gui.addFolder("Particles");
    fP.close();
    const pp = particles.getParams?.() ?? {};

    // switches
    if (pp.enabled !== undefined)
      fP.add(pp, "enabled").onChange(() => particles.setParams(pp));

    // layer toggles
    if (pp.showDust !== undefined)
      fP.add(pp, "showDust").onChange(() => particles.setParams(pp));
    if (pp.showSparkles !== undefined)
      fP.add(pp, "showSparkles").onChange(() => particles.setParams(pp));
    if (pp.showMist !== undefined)
      fP.add(pp, "showMist").onChange(() => particles.setParams(pp));
    if (pp.showEmbers !== undefined)
      fP.add(pp, "showEmbers").onChange(() => particles.setParams(pp));
    if (pp.showFlames !== undefined)
      fP.add(pp, "showFlames").onChange(() => particles.setParams(pp));

    // opacities
    fP.add(pp, "dustOpacity", 0, 0.4, 0.01).onChange(() =>
      particles.setParams(pp)
    );
    fP.add(pp, "sparklesOpacity", 0, 1.0, 0.01).onChange(() =>
      particles.setParams(pp)
    );
    fP.add(pp, "mistOpacity", 0, 0.25, 0.01).onChange(() =>
      particles.setParams(pp)
    );
    fP.add(pp, "embersOpacity", 0, 1.0, 0.01).onChange(() =>
      particles.setParams(pp)
    );
    fP.add(pp, "flamesOpacity", 0, 1.0, 0.01).onChange(() =>
      particles.setParams(pp)
    );

    // sizes
    fP.add(pp, "dustSize", 0.004, 0.04, 0.001).onChange(() =>
      particles.setParams(pp)
    );
    fP.add(pp, "sparklesSize", 0.006, 0.06, 0.001).onChange(() =>
      particles.setParams(pp)
    );
    fP.add(pp, "mistSize", 0.02, 0.25, 0.005).onChange(() =>
      particles.setParams(pp)
    );
    fP.add(pp, "embersSize", 0.006, 0.06, 0.001).onChange(() =>
      particles.setParams(pp)
    );
    fP.add(pp, "flamesScale", 0.1, 0.8, 0.01).onChange(() =>
      particles.setParams(pp)
    );

    // speeds
    fP.add(pp, "dustSpeed", 0.0, 0.25, 0.005).onChange(() =>
      particles.setParams(pp)
    );
    fP.add(pp, "sparklesSpeed", 0.0, 0.35, 0.005).onChange(() =>
      particles.setParams(pp)
    );
    fP.add(pp, "mistSpeed", 0.0, 0.15, 0.005).onChange(() =>
      particles.setParams(pp)
    );
    fP.add(pp, "embersSpeed", 0.0, 0.6, 0.01).onChange(() =>
      particles.setParams(pp)
    );

    // flames flicker
    fP.add(pp, "flamesFlicker", 0.0, 2.0, 0.05).onChange(() =>
      particles.setParams(pp)
    );
  }

  // ---------------- Post (Bloom / Grade / Vignette) ----------------
  if (
    post?.params &&
    post?.bloomPass &&
    post?.gradePass &&
    post?.vignettePass
  ) {
    const fPost = gui.addFolder("Post");

    // Bloom
    fPost.add(post.params.bloom, "enabled");
    fPost.add(post.params.bloom, "strength", 0, 1.5, 0.01);
    fPost.add(post.params.bloom, "radius", 0, 1.0, 0.01);
    fPost.add(post.params.bloom, "threshold", 0, 1.0, 0.01);

    // Grade (se já mudaste para gain/gamma)
    fPost.add(post.params.grade, "enabled");
    fPost.add(post.params.grade, "gain", 0.8, 1.6, 0.01);
    fPost.add(post.params.grade, "gamma", 0.7, 1.2, 0.01);
    fPost.add(post.params.grade, "lift", -0.05, 0.08, 0.001);

    // Vignette
    fPost.add(post.params.vignette, "enabled");
    fPost.add(post.params.vignette, "offset", 0.7, 1.6, 0.01);
    fPost.add(post.params.vignette, "darkness", 0, 1.5, 0.01);

    // DOF
    fPost.add(post.params.dof, "enabled");
    fPost.add(post.params.dof, "focus", 0.1, 50, 0.1);
    fPost.add(post.params.dof, "aperture", 0.0, 0.002, 0.00001);
    fPost.add(post.params.dof, "maxblur", 0.0, 0.02, 0.0001);
  }

  // ---------------- Performance ----------------
  const fP = gui.addFolder("Performance");
  const p = {
    fps: 0,
    calls: 0,
    triangles: 0,
    points: 0,
    textures: 0,
    geometries: 0,
  };

  const cFps = fP.add(p, "fps").listen();
  const cCalls = fP.add(p, "calls").listen();
  const cTris = fP.add(p, "triangles").listen();
  const cPts = fP.add(p, "points").listen();
  const cTex = fP.add(p, "textures").listen();
  const cGeo = fP.add(p, "geometries").listen();

  // Atualiza 4x por segundo (leve)
  const updatePerfUI = () => {
    if (!perf) return;
    p.fps = perf.info.fps;
    p.calls = perf.info.calls;
    p.triangles = perf.info.triangles;
    p.points = perf.info.points;
    p.textures = perf.info.textures;
    p.geometries = perf.info.geometries;
  };
  setInterval(updatePerfUI, 250);

  return gui;
}
