import * as THREE from "three";

export function addAlchemyLights(scene) {
  // Ambiente muito baixo (para não matar o contraste)
  const ambient = new THREE.AmbientLight(0x1b1730, 0.18);
  scene.add(ambient);

  // Luz “lua” fria pela janela (rim/recorte)
  const moon = new THREE.DirectionalLight(0x9fc5ff, 2.2);
  moon.position.set(6, 10, -8);
  scene.add(moon);

  // Preenchimento suave (frio, muito fraco)
  const fill = new THREE.HemisphereLight(0x2a3a66, 0x20150f, 0.28);
  scene.add(fill);

  // “Cristal” / poção (luz colorida mística)
  const magic = new THREE.PointLight(0x7cffd6, 8, 7, 2.0);
  magic.position.set(0.2, 1.2, -1.6);
  scene.add(magic);

  // Opcional: pequena luz magenta para “arcano”
  const arcane = new THREE.PointLight(0xb48cff, 4, 6, 2.0);
  arcane.position.set(-0.6, 2.0, 1.6);
  scene.add(arcane);

  const hemi = new THREE.HemisphereLight(0x2a2f66, 0x120b1f, 0.25);
  scene.add(hemi);

  return { ambient, moon, fill, magic, arcane, hemi };
}
