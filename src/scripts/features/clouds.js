// scripts/features/clouds.js
import * as THREE from "three";

const vert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const frag = /* glsl */ `
precision highp float;
varying vec2 vUv;

uniform float uTime;
uniform float uOpacity;
uniform float uScale;
uniform vec3  uColor;
uniform float uSoftness;

float hash(vec2 p){
  p = fract(p*vec2(123.34, 456.21));
  p += dot(p, p+34.45);
  return fract(p.x*p.y);
}

float noise(vec2 p){
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f*f*(3.0 - 2.0*f);
  return mix(a, b, u.x) + (c - a)*u.y*(1.0-u.x) + (d - b)*u.x*u.y;
}

float fbm(vec2 p){
  float v = 0.0;
  float a = 0.55;
  for(int i=0;i<5;i++){
    v += a * noise(p);
    p *= 2.02;
    a *= 0.5;
  }
  return v;
}

void main(){
  vec2 uv = vUv * 2.0 - 1.0;
  vec2 p = (uv * uScale) + vec2(uTime*0.02, -uTime*0.015);
  float n = fbm(p);

  float r = length(uv);
  float vignette = smoothstep(0.9, 0.2, r); // desaparece mais cedo nas bordas

  float cloud = smoothstep(0.45 - uSoftness, 0.65 + uSoftness, n) * vignette;
  float a = cloud * uOpacity;

  gl_FragColor = vec4(uColor, a);
}
`;

export function applyOlympusFog(
  scene,
  { color = 0xddebff, near = 40, far = 350 } = {}
) {
  scene.fog = new THREE.Fog(color, near, far);
  return scene.fog;
}

export function addUnderCloudLayer(scene, opts = {}) {
  const state = {
    y: -10,
    size: 5000,
    opacity: 0.22,
    scale: 1.8,
    softness: 0.1,
    color: 0xf6fbff,
    layers: 2,
    speed: 0.08,
    ...opts,
  };

  const group = new THREE.Group();
  const geom = new THREE.PlaneGeometry(state.size, state.size, 1, 1);

  const meshes = [];

  function makeLayer(i) {
    const mat = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      depthWrite: false,
      depthTest: false, // não mexe com o modelo
      blending: THREE.NormalBlending, // evita “queimar”
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: state.opacity * (i === 0 ? 1.0 : 0.75) },
        uScale: { value: (1.0 / state.scale) * (i === 0 ? 1.0 : 1.35) },
        uColor: { value: new THREE.Color(state.color) },
        uSoftness: { value: state.softness },
      },
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = state.y - i * 1.2;
    mesh.renderOrder = -10;
    return mesh;
  }

  function build() {
    // limpa anteriores
    for (const m of meshes) {
      group.remove(m);
      m.geometry.dispose();
      m.material.dispose();
    }
    meshes.length = 0;

    // geometry nova com size atual
    const newGeom = new THREE.PlaneGeometry(state.size, state.size, 1, 1);

    for (let i = 0; i < state.layers; i++) {
      const m = makeLayer(i);
      m.geometry.dispose();
      m.geometry = newGeom;
      group.add(m);
      meshes.push(m);
    }
  }

  function applyUniforms() {
    for (let i = 0; i < meshes.length; i++) {
      const m = meshes[i];
      m.position.y = state.y - i * 1.2;

      m.material.uniforms.uOpacity.value =
        state.opacity * (i === 0 ? 1.0 : 0.75);
      m.material.uniforms.uScale.value =
        (1.0 / state.scale) * (i === 0 ? 1.0 : 1.35);
      m.material.uniforms.uSoftness.value = state.softness;
      m.material.uniforms.uColor.value.set(state.color);
    }
  }

  build();
  applyUniforms();
  scene.add(group);

  return {
    group,
    setParams({ opacity, scale, softness, speed, color } = {}) {
      if (speed !== undefined) {
        this._speed = speed;
        state.speed = speed;
      }
      for (const m of meshes) {
        const u = m.material.uniforms;
        if (opacity !== undefined) u.uOpacity.value = opacity * (m === meshes[0] ? 1.0 : 0.75);
        if (scale !== undefined)
          u.uScale.value = (1.0 / scale) * (m === meshes[0] ? 1.0 : 1.35);
        if (softness !== undefined) u.uSoftness.value = softness;
        if (color !== undefined) u.uColor.value.set(color);
      }
    },
    _speed: state.speed,
    meshes,
    state,
    set(patch = {}) {
      const prevLayers = state.layers;
      const prevSize = state.size;

      Object.assign(state, patch);

      // se size ou layers mudarem → rebuild
      if (state.layers !== prevLayers || state.size !== prevSize) {
        build();
      }
      applyUniforms();
    },
    update(dt) {
      for (const m of meshes) {
        m.material.uniforms.uTime.value += dt * this._speed;
      }
    },
  };
}
