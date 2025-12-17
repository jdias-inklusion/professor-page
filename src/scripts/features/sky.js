// scripts/features/sky.js
import * as THREE from "three";
import { Sky } from "three/examples/jsm/objects/Sky.js";

export function addOlympusSky(scene, renderer, opts = {}) {
  const state = {
    turbidity: 2.0,
    rayleigh: 2.0,
    mieCoefficient: 0.005,
    mieDirectionalG: 0.85,
    elevation: 28,
    azimuth: 140,
    exposure: 1.25,
    ...opts,
  };

  const sky = new Sky();
  sky.scale.setScalar(10000);
  scene.add(sky);

  const uniforms = sky.material.uniforms;
  const sun = new THREE.Vector3();

  function update() {
    uniforms.turbidity.value = state.turbidity;
    uniforms.rayleigh.value = state.rayleigh;
    uniforms.mieCoefficient.value = state.mieCoefficient;
    uniforms.mieDirectionalG.value = state.mieDirectionalG;

    const phi = THREE.MathUtils.degToRad(90 - state.elevation);
    const theta = THREE.MathUtils.degToRad(state.azimuth);
    sun.setFromSphericalCoords(1, phi, theta);
    uniforms.sunPosition.value.copy(sun);

    renderer.toneMappingExposure = state.exposure;
  }

  update();

  return { sky, sun, state, update };
}
