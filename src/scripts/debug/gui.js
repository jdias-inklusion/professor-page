import GUI from "lil-gui";
import * as THREE from "three";

export function setupGUI({ renderer, scene, lights, clouds, cloudsCtrl }) {
  const gui = new GUI({ title: "Olympus Debug" });

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
    if (!v) renderer.setClearColor(0xddebff, 1);
  });

  // ---------------- Fog ----------------
  const fFog = gui.addFolder("Fog");
  const fogParams = {
    enabled: !!scene.fog,
    color: scene.fog ? `#${scene.fog.color.getHexString()}` : "#d6e6ff",
    near: scene.fog?.near ?? 220,
    far: scene.fog?.far ?? 1400,
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
  fFog.add(fogParams, "near", 0, 3000, 1).onChange(applyFog);
  fFog.add(fogParams, "far", 10, 8000, 1).onChange(applyFog);

  // ---------------- Lights ----------------
  const fL = gui.addFolder("Lights");
  const pL = {
    hemiIntensity: lights.hemi.intensity,
    hemiSky: `#${lights.hemi.color.getHexString()}`,
    hemiGround: `#${lights.hemi.groundColor.getHexString()}`,
    sunIntensity: lights.sun.intensity,
    sunX: lights.sun.position.x,
    sunY: lights.sun.position.y,
    sunZ: lights.sun.position.z,
    fillIntensity: lights.fill.intensity,
    ambientIntensity: lights.amb.intensity,
  };

  fL.add(pL, "hemiIntensity", 0, 3, 0.01).onChange(
    (v) => (lights.hemi.intensity = v)
  );
  fL.addColor(pL, "hemiSky").onChange((v) => lights.hemi.color.set(v));
  fL.addColor(pL, "hemiGround").onChange((v) => lights.hemi.groundColor.set(v));

  fL.add(pL, "sunIntensity", 0, 5, 0.01).onChange(
    (v) => (lights.sun.intensity = v)
  );
  fL.add(pL, "sunX", -50, 50, 0.1).onChange((v) => (lights.sun.position.x = v));
  fL.add(pL, "sunY", -50, 50, 0.1).onChange((v) => (lights.sun.position.y = v));
  fL.add(pL, "sunZ", -50, 50, 0.1).onChange((v) => (lights.sun.position.z = v));

  fL.add(pL, "fillIntensity", 0, 3, 0.01).onChange(
    (v) => (lights.fill.intensity = v)
  );
  fL.add(pL, "ambientIntensity", 0, 1, 0.01).onChange(
    (v) => (lights.amb.intensity = v)
  );

  // ---------------- Clouds ----------------
  const fC = gui.addFolder("Clouds");

  if (cloudsLayer?.group && cloudsLayer?.state && cloudsLayer?.set) {
    const pC = {
      enabled: cloudsLayer.group.visible,
      y: cloudsLayer.state.y,
      size: cloudsLayer.state.size,
      opacity: cloudsLayer.state.opacity,
      scale: cloudsLayer.state.scale,
      softness: cloudsLayer.state.softness,
      layers: cloudsLayer.state.layers,
      speed: cloudsLayer.state.speed,
      color: `#${new THREE.Color(cloudsLayer.state.color).getHexString()}`,
    };

    fC.add(pC, "enabled").onChange((v) => (cloudsLayer.group.visible = v));
    fC.add(pC, "y", -300, 300, 0.1).onChange((v) => cloudsLayer.set({ y: v }));

    fC.add(pC, "opacity", 0, 1, 0.01).onChange((v) =>
      cloudsLayer.set({ opacity: v })
    );
    fC.add(pC, "scale", 0.5, 6, 0.01).onChange((v) =>
      cloudsLayer.set({ scale: v })
    );
    fC.add(pC, "softness", 0.01, 0.4, 0.01).onChange((v) =>
      cloudsLayer.set({ softness: v })
    );
    fC.add(pC, "speed", 0, 2, 0.01).onChange((v) =>
      cloudsLayer.set({ speed: v })
    );

    fC.add(pC, "layers", 1, 6, 1).onChange((v) =>
      cloudsLayer.set({ layers: v })
    );
    fC.add(pC, "size", 500, 8000, 10).onChange((v) =>
      cloudsLayer.set({ size: v })
    );

    fC.addColor(pC, "color").onChange((v) => cloudsLayer.set({ color: v }));
  } else {
    fC.add({ note: "clouds ainda não criadas" }, "note");
  }

  return gui;
}
