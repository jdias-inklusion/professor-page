// scripts/features/cameraRig.js
import * as THREE from "three";

/**
 * CameraRig cinematográfico para OrbitControls (diorama mode).
 * Objetivo: ZERO "luta" com OrbitControls.
 *
 * - O rig só controla camera.position quando está "ativo" (rigControlsPosition=true)
 * - Ao primeiro input do utilizador (OrbitControls start), o rig DESLIGA o controlo da posição
 *   e deixa o OrbitControls controlar para sempre (até tu reativares manualmente).
 */
export function createCameraRig({
  camera,
  controls,
  domElement = null,

  // feel
  smooth = 0.08,
  driftEnabled = true,
  driftStrength = 0.06,
  driftSpeed = 0.25,
  pushInEnabled = false,
  pushInSpeed = 0.12,
  pushInAmount = 0.35,

  // limites
  minDistance = 1.2,
  maxDistance = 18,

  // framing
  padding = 1.25,
  heroAngle = { azimuthDeg: 35, polarDeg: 65 },

  // após interação, pausa efeitos (se reativares o rig)
  postInteractHold = 0.45,
} = {}) {
  const v3 = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const box = new THREE.Box3();
  const sphere = new THREE.Sphere();

  let time = 0;

  const desiredTarget = new THREE.Vector3();
  const desiredPos = new THREE.Vector3();

  // target base (fixo)
  const baseTarget = new THREE.Vector3();

  // drift apenas na câmara
  const driftOffset = new THREE.Vector3();

  // distância base (sem push)
  let userDistance = 6;
  let lastPush = 0;

  let userInteracting = false;
  let holdTimer = 0;

  // ✅ chave: se false, o rig NÃO mexe na posição da câmara
  let rigControlsPosition = false;

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  // OrbitControls start/end
  controls.addEventListener("start", () => {
    userInteracting = true;
    rigControlsPosition = false; // ✅ desliga o rig assim que o user mexe
    holdTimer = postInteractHold;
  });
  controls.addEventListener("end", () => {
    userInteracting = false;
    holdTimer = postInteractHold;
  });

  function setTargetInstant(vec) {
    controls.target.copy(vec);
    baseTarget.copy(vec);
    desiredTarget.copy(vec);
  }

  function setCameraInstant(pos) {
    camera.position.copy(pos);
  }

  function placeCameraFromSpherical(target, distance, azimuthDeg, polarDeg) {
    const az = THREE.MathUtils.degToRad(azimuthDeg);
    const pol = THREE.MathUtils.degToRad(polarDeg);
    return new THREE.Vector3()
      .setFromSpherical(new THREE.Spherical(distance, pol, az))
      .add(target);
  }

  function frameObject(
    object3D,
    {
      paddingOverride = padding,
      azimuthDeg = heroAngle.azimuthDeg,
      polarDeg = heroAngle.polarDeg,
      instant = false,
    } = {}
  ) {
    if (!object3D) return;

    box.setFromObject(object3D);
    if (!isFinite(box.min.x) || !isFinite(box.max.x)) return;

    box.getBoundingSphere(sphere);

    const center = sphere.center.clone();
    const radius = sphere.radius;

    // distância que cabe no frustum
    const fov = THREE.MathUtils.degToRad(camera.fov);
    const fitHeight = (radius * paddingOverride) / Math.sin(fov / 2);
    const fitWidth = fitHeight / camera.aspect;

    userDistance = Math.max(fitHeight, fitWidth, minDistance);
    userDistance = clamp(userDistance, minDistance, maxDistance);
    lastPush = 0;

    desiredTarget.copy(center);
    baseTarget.copy(center);

    desiredPos.copy(
      placeCameraFromSpherical(center, userDistance, azimuthDeg, polarDeg)
    );

    controls.minDistance = minDistance;
    controls.maxDistance = Math.max(maxDistance, userDistance * 1.5);

    // ✅ quando fazes frameObject, o rig passa a controlar a posição
    rigControlsPosition = true;
    holdTimer = postInteractHold;

    if (instant) {
      setTargetInstant(desiredTarget);
      setCameraInstant(desiredPos);
      controls.update();
    }
  }

  function update(dt) {
    time += dt;
    if (holdTimer > 0) holdTimer = Math.max(0, holdTimer - dt);

    // Atualiza distância base enquanto o user interage (para guardar o zoom)
    if (userInteracting) {
      const currentDist = camera.position.distanceTo(controls.target);
      userDistance = clamp(currentDist + lastPush, minDistance, maxDistance);
      lastPush = 0;
      return;
    }

    // target desejado é estável (não drift)
    desiredTarget.copy(baseTarget);

    // drift apenas na câmara (só quando o rig estiver ativo)
    if (driftEnabled && rigControlsPosition && holdTimer === 0) {
      driftOffset
        .set(
          Math.sin(time * driftSpeed * 1.0),
          Math.sin(time * driftSpeed * 1.37 + 1.2) * 0.55,
          Math.sin(time * driftSpeed * 0.83 + 2.1)
        )
        .multiplyScalar(driftStrength);
    } else {
      driftOffset.set(0, 0, 0);
    }

    // push-in (só quando o rig estiver ativo)
    let push = 0;
    if (pushInEnabled && rigControlsPosition && holdTimer === 0) {
      push = (Math.sin(time * pushInSpeed) * 0.5 + 0.5) * pushInAmount;
    }
    lastPush = push;

    // ✅ se o rig não está ativo, não mexe na posição da câmara
    if (!rigControlsPosition) return;

    const effectiveDist = clamp(userDistance - push, minDistance, maxDistance);

    // mantém ângulo atual camera->target
    v3.subVectors(camera.position, controls.target);
    const sph = new THREE.Spherical().setFromVector3(v3);

    if (!isFinite(sph.radius) || sph.radius === 0) {
      desiredPos.copy(
        placeCameraFromSpherical(
          baseTarget,
          effectiveDist,
          heroAngle.azimuthDeg,
          heroAngle.polarDeg
        )
      );
    } else {
      sph.radius = effectiveDist;
      desiredPos.copy(
        new THREE.Vector3().setFromSpherical(sph).add(baseTarget)
      );
    }

    desiredPos.add(driftOffset);

    // suavização (apenas na posição, target fica estável)
    const t = 1 - Math.pow(1 - smooth, dt * 60);
    camera.position.lerp(desiredPos, t);
  }

  return {
    frameObject,
    update,

    // Opcional: reativar manualmente o "modo cinema" (ex: após idle)
    enable() {
      rigControlsPosition = true;
      holdTimer = postInteractHold;
    },
    disable() {
      rigControlsPosition = false;
    },

    get state() {
      return {
        smooth,
        driftEnabled,
        driftStrength,
        driftSpeed,
        pushInEnabled,
        pushInSpeed,
        pushInAmount,
        minDistance,
        maxDistance,
        postInteractHold,
        rigControlsPosition,
      };
    },
    set state(patch) {
      if (!patch) return;
      if (patch.smooth !== undefined) smooth = patch.smooth;
      if (patch.driftEnabled !== undefined) driftEnabled = patch.driftEnabled;
      if (patch.driftStrength !== undefined)
        driftStrength = patch.driftStrength;
      if (patch.driftSpeed !== undefined) driftSpeed = patch.driftSpeed;
      if (patch.pushInEnabled !== undefined)
        pushInEnabled = patch.pushInEnabled;
      if (patch.pushInSpeed !== undefined) pushInSpeed = patch.pushInSpeed;
      if (patch.pushInAmount !== undefined) pushInAmount = patch.pushInAmount;
      if (patch.minDistance !== undefined) minDistance = patch.minDistance;
      if (patch.maxDistance !== undefined) maxDistance = patch.maxDistance;
      if (patch.postInteractHold !== undefined)
        postInteractHold = patch.postInteractHold;
      if (patch.rigControlsPosition !== undefined)
        rigControlsPosition = patch.rigControlsPosition;

      controls.minDistance = minDistance;
      controls.maxDistance = maxDistance;
    },
  };
}
