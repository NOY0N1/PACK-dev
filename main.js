import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// -------------------- Scene & Camera --------------------
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  75, 
  window.innerWidth / window.innerHeight, 
  0.1, 
  1000
);
camera.position.set(0, 1, 5);
camera.lookAt(0, 0, 0);

// -------------------- Renderer --------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.style.margin = 0;       // Remove page margin
document.body.style.overflow = 'hidden'; // Remove scrollbars
document.body.appendChild(renderer.domElement);

// -------------------- Lights --------------------
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);

// -------------------- Debug Cube --------------------
/*const cubeGeometry = new THREE.BoxGeometry();
const cubeMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
scene.add(cube);*/

// -------------------- GLTF Loader --------------------
const loader = new GLTFLoader();
const clock = new THREE.Clock();
let mixer;
let model; // Store reference to the model

// -------------------- Keyboard Controls --------------------
const keys = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false,
  w: false,
  a: false,
  s: false,
  d: false
};

window.addEventListener('keydown', (e) => {
  if (keys.hasOwnProperty(e.key)) {
    keys[e.key] = true;
  }
});

window.addEventListener('keyup', (e) => {
  if (keys.hasOwnProperty(e.key)) {
    keys[e.key] = false;
  }
});

loader.load(
  './dot.glb',            // Your model path
  (gltf) => {
    model = gltf.scene;

    // Position & scale
    model.position.set(0, 0, 0);
    model.scale.set(0.5, 0.5, 0.5); // Adjust if too small or large
    model.rotation.set(0, Math.PI / 2, 0); // Facing left

    scene.add(model);

    console.log('Model loaded:', gltf.scene);
    console.log('Animations:', gltf.animations);

    // Guard against missing animations
    if (gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(model);
      const action = mixer.clipAction(gltf.animations[0]);
      action.play();
    }
  },
  undefined,
  (error) => console.error('Error loading model:', error)
);

loader.load(
  './Packman.glb',            // Your model path
  (gltf) => {
    model = gltf.scene;

    // Position & scale
    model.position.set(0, 0, 0);
    model.scale.set(1, 1, 1); // Adjust if too small or large
    model.rotation.set(0, Math.PI / 2, 0); // Facing left

    scene.add(model);

    console.log('Model loaded:', gltf.scene);
    console.log('Animations:', gltf.animations);

    // Guard against missing animations
    if (gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(model);
      const action = mixer.clipAction(gltf.animations[0]);
      action.play();
    }
  },
  undefined,
  (error) => console.error('Error loading model:', error)
);



// -------------------- Animate Loop --------------------
const moveSpeed = 0.1;

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);

  // Movement controls
  if (model) {
    if (keys.ArrowUp || keys.w) {
      model.rotation.set(-Math.PI / 2, 0, -Math.PI / 2);
      model.position.y += moveSpeed;
    }
    if (keys.ArrowDown || keys.s) {
      model.rotation.set(Math.PI / 2, 0, Math.PI / 2);
      model.position.y -= moveSpeed;
    }
    if (keys.ArrowLeft || keys.a) {
      model.rotation.set(0, -Math.PI / 2, 0);
      model.position.x -= moveSpeed;
    }
    if (keys.ArrowRight || keys.d) {
            model.rotation.set(0, Math.PI / 2, 0);

      model.position.x += moveSpeed;
    }
  }

  renderer.render(scene, camera);
}

animate();

// -------------------- Handle Window Resize --------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
});