// scripts/features/loaders.js
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { recenterObject3D } from "../core/utils.js";

const draco = new DRACOLoader();
// Para Vite: mete os decoders aqui (vamos criar esta pasta já a seguir)
draco.setDecoderPath("/draco/");

export async function loadGLB({ url, scene, recenter = true, onProgress }) {
  const loader = new GLTFLoader();
  loader.setDRACOLoader(draco);

  const gltf = await loader.loadAsync(url, (ev) => {
    if (!onProgress || !ev.total) return;
    onProgress(ev.loaded / ev.total);
  });

  const root = gltf.scene;

  root.traverse((o) => {
    if (!o.isMesh) return;
    o.frustumCulled = true;
  });

  scene.add(root);

  if (recenter) recenterObject3D(root);

  return root;
}
