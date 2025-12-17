import * as THREE from 'three';
import { easeInOutQuad } from '../core/utils.js';

// Define aqui os teus hotspots (posições em unidades do mundo)
const HOTSPOTS = [
  {
    id: 'publicacoes',
    label: 'Publicações',
    title: 'Publicações',
    body: 'Lista de artigos, capítulos e conferências.',
    pos: [10, 10, -5],
    radius: 1.3,
  },
  {
    id: 'projetos',
    label: 'Projetos',
    title: 'Projetos',
    body: 'Projetos de investigação, XR, IoT, web, colaborações.',
    pos: [-8, 7, 12],
    radius: 1.5,
  },
  {
    id: 'aulas',
    label: 'Aulas',
    title: 'Aulas',
    body: 'Unidades curriculares, materiais, recursos e links.',
    pos: [0, 7, 22],
    radius: 1.6,
  },
];

export function setupHotspots({ scene, camera, renderer, ui, controls }) {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const colliders = [];

  let enabled = false;
  let hovered = null;

  // criar colliders invisíveis + um “pin” simples (opcional)
  for (const h of HOTSPOTS) {
    const collider = new THREE.Mesh(
      new THREE.SphereGeometry(h.radius, 16, 16),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
    );
    collider.position.set(...h.pos);
    collider.userData.hotspot = h;
    scene.add(collider);
    colliders.push(collider);

    // pin visível simples (podes trocar por sprite/ícone depois)
    const pin = new THREE.Mesh(
      new THREE.SphereGeometry(h.radius * 0.25, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    pin.position.copy(collider.position).add(new THREE.Vector3(0, h.radius * 0.9, 0));
    pin.userData.__pinFor = h.id;
    scene.add(pin);
  }

  function updateMouse(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
  }

  function pick() {
    raycaster.setFromCamera(mouse, camera);
    return raycaster.intersectObjects(colliders, false);
  }

  function setCursor(v) {
    renderer.domElement.style.cursor = v ? 'pointer' : '';
  }

  function onPointerMove(e) {
    if (!enabled) return;
    updateMouse(e);

    const hits = pick();
    if (!hits.length) {
      hovered = null;
      setCursor(false);
      ui.hideTooltip();
      return;
    }

    hovered = hits[0].object;
    setCursor(true);

    const h = hovered.userData.hotspot;
    ui.showTooltip(h.label, hovered.position, camera);
  }

  function onClick(e) {
    if (!enabled) return;
    updateMouse(e);

    const hits = pick();
    if (!hits.length) return;

    const h = hits[0].object.userData.hotspot;
    ui.openPanel(h.title, h.body);

    // opcional: animar câmara até ao hotspot
    flyToHotspot(h.pos, controls, camera);
  }

  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('click', onClick);

  function enable(v) {
    enabled = v;
    if (!v) {
      hovered = null;
      setCursor(false);
      ui.hideTooltip();
    }
  }

  return { enable };
}

function flyToHotspot(posArr, controls, camera) {
  const target = new THREE.Vector3(...posArr);

  const startCam = camera.position.clone();
  const startTarget = controls.target.clone();

  // manter direção relativa da câmara e aproximar
  const dir = startCam.clone().sub(startTarget).normalize();
  const endTarget = target.clone();
  const endCam = endTarget.clone().add(dir.multiplyScalar(35)).add(new THREE.Vector3(0, 15, 0));

  const t0 = performance.now();
  const dur = 650;

  function step(t) {
    const k = Math.min((t - t0) / dur, 1);
    const e = easeInOutQuad(k);

    camera.position.lerpVectors(startCam, endCam, e);
    controls.target.lerpVectors(startTarget, endTarget, e);
    controls.update();

    if (k < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}