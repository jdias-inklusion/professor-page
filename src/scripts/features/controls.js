import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";

export function setupControls(
  camera,
  domElement,
  { worldRoot, height = 1.7 } = {}
) {
  const controls = new PointerLockControls(camera, domElement);

  // Click → lock
  domElement.addEventListener("click", () => controls.lock());

  // WASD
  const keys = { w: false, a: false, s: false, d: false, shift: false };

  window.addEventListener("keydown", (e) => {
    if (e.code === "KeyW") keys.w = true;
    if (e.code === "KeyA") keys.a = true;
    if (e.code === "KeyS") keys.s = true;
    if (e.code === "KeyD") keys.d = true;
    if (e.code === "ShiftLeft" || e.code === "ShiftRight") keys.shift = true;
  });

  window.addEventListener("keyup", (e) => {
    if (e.code === "KeyW") keys.w = false;
    if (e.code === "KeyA") keys.a = false;
    if (e.code === "KeyS") keys.s = false;
    if (e.code === "KeyD") keys.d = false;
    if (e.code === "ShiftLeft" || e.code === "ShiftRight") keys.shift = false;
  });

  // Movimento
  const WALK_SPEED = 5.0;
  const RUN_SPEED = 9.0;

  // “Física”
  const GRAVITY = 22.0; // mais alto = cai mais rápido
  const SNAP_DIST = 3.0; // distância para “agarrar” o chão
  let vY = 0; // velocidade vertical
  let grounded = false;

  // Raycast para baixo
  const raycaster = new THREE.Raycaster();
  const down = new THREE.Vector3(0, -1, 0);

  // helper: posição “dos pés” (câmara menos altura)
  const feetPos = new THREE.Vector3();

  function groundHeightAtFeet() {
    if (!worldRoot) return null;

    feetPos.copy(camera.position);
    feetPos.y -= height; // pés

    raycaster.set(feetPos, down);
    raycaster.far = 50; // alcance do raycast

    const hits = raycaster.intersectObject(worldRoot, true);
    if (hits.length === 0) {
      // DEBUG
      console.log("NO HIT", feetPos.toArray(), worldRoot);
      return null;
    }
    console.log("HIT:", hits[0].object.name, hits[0].point.y);
    return hits[0].point.y;
  }

  controls.update = (dt) => {
    if (!controls.isLocked) return;

    // 1) Movimento horizontal
    const speed = keys.shift ? RUN_SPEED : WALK_SPEED;

    if (keys.w) controls.moveForward(speed * dt);
    if (keys.s) controls.moveForward(-speed * dt);
    if (keys.a) controls.moveRight(-speed * dt);
    if (keys.d) controls.moveRight(speed * dt);

    // 2) Gravidade
    vY -= GRAVITY * dt;
    camera.position.y += vY * dt;

    // 3) Snap ao chão (raycast)
    const groundY = groundHeightAtFeet();
    if (groundY !== null) {
      const desiredCamY = groundY + height;
      const distToGround = camera.position.y - desiredCamY;

      // se estiver “perto” do chão e a descer -> cola
      if (distToGround <= SNAP_DIST && vY <= 0) {
        camera.position.y = desiredCamY;
        vY = 0;
        grounded = true;
      } else {
        grounded = false;
      }
    } else {
      grounded = false;
    }
  };

  // útil para teleports
  controls.teleportTo = (pos) => {
    camera.position.copy(pos);
    vY = 0;
  };

  controls.setWorldRoot = (root) => {
    worldRoot = root;
  };

  return controls;
}
