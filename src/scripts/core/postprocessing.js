// scripts/core/postprocessing.js
import * as THREE from "three";

import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";

/* -------------------------
   Shaders leves (grade + vignette)
------------------------- */

const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    offset: { value: 1.15 },
    darkness: { value: 0.9 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float offset;
    uniform float darkness;
    varying vec2 vUv;

    void main() {
      vec4 col = texture2D(tDiffuse, vUv);
      vec2 uv = (vUv - 0.5) * offset;
      float vig = smoothstep(0.8, 0.2, dot(uv, uv));
      col.rgb *= mix(1.0 - darkness, 1.0, vig);
      gl_FragColor = col;
    }
  `,
};

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    gain: { value: 1.12 },
    gamma: { value: 0.92 },
    lift: { value: 0.0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float gain;
    uniform float gamma;
    uniform float lift;
    varying vec2 vUv;

    void main() {
      vec4 col = texture2D(tDiffuse, vUv);

      col.rgb *= gain;
      col.rgb = pow(max(col.rgb, vec3(0.0)), vec3(gamma));
      col.rgb += vec3(lift);

      gl_FragColor = col;
    }
  `,
};

export function createPostprocessing({
  renderer,
  scene,
  camera,
  size = { width: window.innerWidth, height: window.innerHeight },

  bloom = { enabled: true, strength: 0.55, radius: 0.25, threshold: 0.18 },
  vignette = { enabled: true, offset: 1.12, darkness: 0.85 },
  grade = { enabled: true, contrast: 1.08, lift: 0.02 },
  dof = { enabled: false, focus: 10, aperture: 0.00025, maxblur: 0.006 },
} = {}) {
  // ✅ GARANTIA: isto tem de ser um WebGLRenderer
  if (!renderer || typeof renderer.getPixelRatio !== "function") {
    throw new Error(
      "[postprocessing] 'renderer' não é um THREE.WebGLRenderer. Estás a passar o objeto errado."
    );
  }

  const composer = new EffectComposer(renderer);
  composer.setSize(size.width, size.height);
  composer.setPixelRatio(renderer.getPixelRatio());

  // Render pass base
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  // Bloom
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(size.width, size.height),
    bloom.strength ?? 0.55,
    bloom.radius ?? 0.25,
    bloom.threshold ?? 0.18
  );
  bloomPass.enabled = !!bloom.enabled;
  composer.addPass(bloomPass);

  // Grade
  const gradePass = new ShaderPass(GradeShader);
  gradePass.enabled = !!grade.enabled;
  gradePass.uniforms.gain.value = grade.gain ?? 1.12;
  gradePass.uniforms.gamma.value = grade.gamma ?? 0.92;
  gradePass.uniforms.lift.value = grade.lift ?? 0.0;
  composer.addPass(gradePass);

  // Vignette
  const vignettePass = new ShaderPass(VignetteShader);
  vignettePass.enabled = !!vignette.enabled;
  vignettePass.uniforms.offset.value = vignette.offset ?? 1.12;
  vignettePass.uniforms.darkness.value = vignette.darkness ?? 0.85;
  composer.addPass(vignettePass);

  // DOF (opcional, pesado — deixamos OFF por defeito)
  const bokehPass = new BokehPass(scene, camera, {
    focus: dof.focus ?? 10,
    aperture: dof.aperture ?? 0.00025,
    maxblur: dof.maxblur ?? 0.006,
  });
  bokehPass.enabled = !!dof.enabled;
  composer.addPass(bokehPass);

  function setSize(width, height) {
    composer.setSize(width, height);
    bloomPass.setSize?.(width, height);
  }

  // API para GUI
  const params = {
    bloom: {
      enabled: bloomPass.enabled,
      strength: bloomPass.strength,
      radius: bloomPass.radius,
      threshold: bloomPass.threshold,
    },
    grade: {
      enabled: gradePass.enabled,
      gain: gradePass.uniforms.gain.value,
      gamma: gradePass.uniforms.gamma.value,
      lift: gradePass.uniforms.lift.value,
    },
    vignette: {
      enabled: vignettePass.enabled,
      offset: vignettePass.uniforms.offset.value,
      darkness: vignettePass.uniforms.darkness.value,
    },
    dof: {
      enabled: bokehPass.enabled,
      focus: bokehPass.materialBokeh?.uniforms?.focus?.value ?? dof.focus ?? 10,
      aperture:
        bokehPass.materialBokeh?.uniforms?.aperture?.value ??
        dof.aperture ??
        0.00025,
      maxblur:
        bokehPass.materialBokeh?.uniforms?.maxblur?.value ??
        dof.maxblur ??
        0.006,
    },
  };

  function syncFromParams() {
    bloomPass.enabled = !!params.bloom.enabled;
    bloomPass.strength = params.bloom.strength;
    bloomPass.radius = params.bloom.radius;
    bloomPass.threshold = params.bloom.threshold;

    gradePass.enabled = !!params.grade.enabled;
    gradePass.uniforms.gain.value = params.grade.gain;
    gradePass.uniforms.gamma.value = params.grade.gamma;
    gradePass.uniforms.lift.value = params.grade.lift;

    vignettePass.enabled = !!params.vignette.enabled;
    vignettePass.uniforms.offset.value = params.vignette.offset;
    vignettePass.uniforms.darkness.value = params.vignette.darkness;

    bokehPass.enabled = !!params.dof.enabled;
    if (bokehPass.materialBokeh?.uniforms) {
      bokehPass.materialBokeh.uniforms.focus.value = params.dof.focus;
      bokehPass.materialBokeh.uniforms.aperture.value = params.dof.aperture;
      bokehPass.materialBokeh.uniforms.maxblur.value = params.dof.maxblur;
    }
  }

  function render(dt) {
    syncFromParams();
    composer.render();
  }

  return {
    composer,
    render,
    setSize,
    params, // para GUI mexer nos valores
    bloomPass,
    gradePass,
    vignettePass,
    bokehPass,
  };
}
