import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { recenterObject3D } from '../core/utils.js';

export async function loadGLB({ url, scene, recenter = true, onProgress }) {
  const loader = new GLTFLoader();

  const gltf = await loader.loadAsync(
    url,
    (ev) => {
      if (!onProgress) return;
      if (!ev.total) return;
      onProgress(ev.loaded / ev.total);
    }
  );

  const root = gltf.scene;

  // Pequenas otimizações default
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.frustumCulled = true;
  });

  scene.add(root);

  if (recenter) recenterObject3D(root);

  return root;
}