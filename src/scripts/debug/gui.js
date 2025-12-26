import GUI from "lil-gui";
import * as THREE from "three";

export function setupGUI({
  renderer,
  scene,
  lights = {},
  particles,
  clouds,
  cloudsCtrl,
}) {
  const gui = new GUI({ title: "Debug" });

  // permite receber clouds por qualquer nome
  const cloudsLayer = clouds ?? cloudsCtrl;

  // ---------------- Renderer ----------------
  const fR = gui.addFolder("Renderer");
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

  // ---------------- Particles ----------------
  const fP = gui.addFolder("Particles");

  if (particles?.setParams && particles?.getParams) {
    const p0 = particles.getParams();

    const pP = {
      enabled: p0.enabled,

      dustOpacity: p0.dustOpacity,
      sparklesOpacity: p0.sparklesOpacity,
      mistOpacity: p0.mistOpacity,
      embersOpacity: p0.embersOpacity,

      dustSize: p0.dustSize,
      sparklesSize: p0.sparklesSize,
      mistSize: p0.mistSize,
      embersSize: p0.embersSize,

      dustSpeed: p0.dustSpeed,
      moteSpeed: p0.moteSpeed,
      mistSpeed: p0.mistSpeed,
      emberSpeed: p0.emberSpeed,
    };

    fP.add(pP, "enabled").onChange((v) => particles.setParams({ enabled: v }));

    const fPO = fP.addFolder("Opacity");
    fPO
      .add(pP, "dustOpacity", 0, 0.6, 0.01)
      .onChange((v) => particles.setParams({ dustOpacity: v }));
    fPO
      .add(pP, "sparklesOpacity", 0, 1, 0.01)
      .onChange((v) => particles.setParams({ sparklesOpacity: v }));
    fPO
      .add(pP, "mistOpacity", 0, 0.4, 0.01)
      .onChange((v) => particles.setParams({ mistOpacity: v }));
    fPO
      .add(pP, "embersOpacity", 0, 1, 0.01)
      .onChange((v) => particles.setParams({ embersOpacity: v }));

    const fPS = fP.addFolder("Size");
    fPS
      .add(pP, "dustSize", 0.002, 0.08, 0.001)
      .onChange((v) => particles.setParams({ dustSize: v }));
    fPS
      .add(pP, "sparklesSize", 0.002, 0.1, 0.001)
      .onChange((v) => particles.setParams({ sparklesSize: v }));
    fPS
      .add(pP, "mistSize", 0.02, 0.4, 0.005)
      .onChange((v) => particles.setParams({ mistSize: v }));
    fPS
      .add(pP, "embersSize", 0.002, 0.08, 0.001)
      .onChange((v) => particles.setParams({ embersSize: v }));

    const fPV = fP.addFolder("Speed");
    fPV
      .add(pP, "dustSpeed", 0, 0.4, 0.005)
      .onChange((v) => particles.setParams({ dustSpeed: v }));
    fPV
      .add(pP, "moteSpeed", 0, 0.6, 0.005)
      .onChange((v) => particles.setParams({ moteSpeed: v }));
    fPV
      .add(pP, "mistSpeed", 0, 0.2, 0.002)
      .onChange((v) => particles.setParams({ mistSpeed: v }));
    fPV
      .add(pP, "emberSpeed", 0, 1.0, 0.01)
      .onChange((v) => particles.setParams({ emberSpeed: v }));

    fP.add(
      {
        boost: () => {
          particles.setParams({
            dustOpacity: 0.18,
            sparklesOpacity: 0.75,
            mistOpacity: 0.12,
            embersOpacity: 0.85,
            dustSize: 0.02,
            sparklesSize: 0.03,
            mistSize: 0.14,
            embersSize: 0.02,
          });
        },
      },
      "boost"
    ).name("Boost (visible)");
  } else {
    fP.add({ note: "particles ainda não expõem setParams/getParams" }, "note");
  }

  return gui;
}
