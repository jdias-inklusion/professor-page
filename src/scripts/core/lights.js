import * as THREE from "three";

export function addOlympusLights(scene) {
  // céu/ambiente (mais quente)
  const hemi = new THREE.HemisphereLight(
    0xcfe8ff,   // céu (azul suave)
    0xffe2b8,   // chão (quente)
    1.0
  );
  scene.add(hemi);

  // sol principal (quente)
  const sun = new THREE.DirectionalLight(0xfff1d6, 1.6);
  sun.position.set(12, 18, 8);
  sun.castShadow = false;
  scene.add(sun);

  // preenchimento suave (não deixa sombras mortas)
  const fill = new THREE.DirectionalLight(0xd7ecff, 0.55);
  fill.position.set(-14, 10, -10);
  scene.add(fill);

  // ambiente global (pouco, mas ajuda muito no “ar”)
  const amb = new THREE.AmbientLight(0xffffff, 0.12);
  scene.add(amb);

  return { hemi, sun, fill, amb };
}