import * as THREE from 'three/webgpu';
import { uniform } from 'three/tsl';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { rust, concrete } from 'tsl-textures';

import { getProgress, getRustParams } from './progression.js';
import { initInfoPanel } from './info-panel.js';
import { initDebugPanel } from './debug-panel.js';

// --- Renderer ---
const renderer = new THREE.WebGPURenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(devicePixelRatio);
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
document.body.appendChild(renderer.domElement);
await renderer.init();

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color('white');

// --- Camera ---
const camera = new THREE.PerspectiveCamera(5, innerWidth / innerHeight, 0.1, 100);
camera.position.set(20, 10, 20);

// --- Lights ---
const dirLight = new THREE.DirectionalLight('white', 1.5);
scene.add(dirLight);
const ambLight = new THREE.AmbientLight('white', 2);
scene.add(ambLight);

// --- Geometry ---
let geometry = new THREE.IcosahedronGeometry(1, 20);
geometry = mergeVertices(geometry);
geometry.computeTangents();

// --- Progression ---
const progress = getProgress();
const rustP = getRustParams(progress);

// --- Uniforms for rust layer ---
export const uniforms = {
  scale:      uniform(rust.defaults.scale),
  iterations: uniform(rust.defaults.iterations),
  amount:     uniform(rustP.amount),  // This controls rust visibility
  opacity:    uniform(rust.defaults.opacity),
  noise:      uniform(rust.defaults.noise),
  noiseScale: uniform(rust.defaults.noiseScale),
  seed:       uniform(rust.defaults.seed),
  color:      uniform(rust.defaults.color),
  background: uniform(rust.defaults.background),
};

// --- Inner core: shiny metal with concrete texture (like rust.html line 37-45) ---
const coreMaterial = new THREE.MeshPhysicalNodeMaterial({
  color: new THREE.Color(1.2, 1.2, 1.2),
  normalNode: concrete({ ...concrete.defaults, scale: 6 }),
  roughness: 0.3,
  metalness: 0.6,
});

const core = new THREE.Mesh(geometry, coreMaterial);
scene.add(core);

// --- Outer rust layer: transparent rust texture ---
const rustDynamics = {
  scale:      uniforms.scale,
  iterations: uniforms.iterations,
  amount:     uniforms.amount,
  noise:      uniforms.noise,
  noiseScale: uniforms.noiseScale,
  color:      uniforms.color,
  background: uniforms.background,
  seed:       uniforms.seed,
};

const rustMaterial = new THREE.MeshPhysicalNodeMaterial({
  colorNode: rust(rustDynamics),
  transparent: true,
  opacity: 1,
  side: THREE.DoubleSide,
});

rustMaterial.opacityNode = rust.opacity({
  scale:      uniforms.scale,
  iterations: uniforms.iterations,
  amount:     uniforms.amount,
  opacity:    uniforms.opacity,
  seed:       uniforms.seed,
});

const shell = new THREE.Mesh(geometry, rustMaterial);
scene.add(shell);

// --- Controls ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.autoRotate = true;
controls.autoRotateSpeed = -0.5;
controls.enableDamping = true;
controls.enableZoom = false;
controls.enablePan = false;
controls.enableRotate = false;

// --- Resize ---
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// --- Animation ---
renderer.setAnimationLoop(() => {
  controls.update();
  dirLight.position.copy(camera.position);
  renderer.render(scene, camera);
});

// --- Update uniforms from progress ---
export function applyProgress(p) {
  const rp = getRustParams(p);
  uniforms.amount.value = rp.amount;  // amount controls rust progression
}

// --- Init UI ---
initInfoPanel(progress);
initDebugPanel(progress);
