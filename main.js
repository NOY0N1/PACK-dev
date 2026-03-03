import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// -------------------- Scene & Camera --------------------
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 1, 8);
camera.lookAt(0, 0, 0);
let points = 0; // Initialize points

// -------------------- Renderer --------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.style.margin = 0;       // Remove page margin
document.body.style.overflow = 'hidden'; // Remove scrollbars
document.body.appendChild(renderer.domElement);

const scoreElement = document.createElement('div');
scoreElement.style.position = 'absolute';
scoreElement.style.top = '10px';
scoreElement.style.left = '10px';
scoreElement.style.color = 'white';
scoreElement.style.fontSize = '24px';
scoreElement.style.fontFamily = 'Arial, sans-serif';  
scoreElement.innerHTML = `Points: ${points}`;
document.body.appendChild(scoreElement);


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
let pacman; // Store reference to Pac-Man
let dots = []; // Store references to multiple dots

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
    // Create 10 dots
    for (let i = 0; i < 8; i++) {
      const dot = gltf.scene.clone();

      // Position & scale
      dot.position.set(i * 1.5 - 5.25, 2, 0); // Spread dots horizontally, slightly above Pac-Man
      dot.scale.set(0.5, 0.5, 0.5);
      dot.rotation.set(0, Math.PI / 2, 0);

      scene.add(dot);
      dots.push(dot);

      // Guard against missing animations
      if (gltf.animations.length > 0) {
        const dotMixer = new THREE.AnimationMixer(dot);
        const action = dotMixer.clipAction(gltf.animations[0]);
        action.play();
      }
    }

    console.log('10 dots loaded');
  },
  undefined,
  (error) => console.error('Error loading dot:', error)
);

loader.load(
  './Packman.glb',            // Your model path
  (gltf) => {
    pacman = gltf.scene;

    // Position & scale
    pacman.position.set(0, 0, 0);
    pacman.scale.set(1, 1, 1); // Adjust if too small or large
    pacman.rotation.set(0, Math.PI / 2, 0); // Facing left

    scene.add(pacman);

    console.log('Pac-Man loaded:', gltf.scene);
    console.log('Animations:', gltf.animations);

    // Guard against missing animations
    if (gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(pacman);
      const action = mixer.clipAction(gltf.animations[0]);
      action.play();
    }
  },
  undefined,
  (error) => console.error('Error loading Pac-Man:', error)
);


// -------------------- Animate Loop --------------------
const moveSpeed = 0.1;
const bounds = {minX: -6, maxX: 6, minY: -3, maxY: 3}; // Define movement boundaries

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);

  // Movement controls
  if (pacman) {
    if (keys.ArrowUp || keys.w) {
      pacman.rotation.set(-Math.PI / 2, 0, -Math.PI / 2);
      pacman.position.y += moveSpeed;
    }
    if (keys.ArrowDown || keys.s) {
      pacman.rotation.set(Math.PI / 2, 0, Math.PI / 2);
      pacman.position.y -= moveSpeed;
    }
    if (keys.ArrowLeft || keys.a) {
      pacman.rotation.set(0, -Math.PI / 2, 0);
      pacman.position.x -= moveSpeed;
    }
    if (keys.ArrowRight || keys.d) {
      pacman.rotation.set(0, Math.PI / 2, 0);
      pacman.position.x += moveSpeed;
    }

    // Keep Pac-Man within bounds
    pacman.position.x = Math.max(bounds.minX, Math.min(bounds.maxX, pacman.position.x));
    pacman.position.y = Math.max(bounds.minY, Math.min(bounds.maxY, pacman.position.y));
  }



  
  for (let i=dots.length-1;i>=0;i--){
    const dot = dots[i];
    const distance = pacman.position.distanceTo(dot.position);
    if (distance < 1){
      scene.remove(dot);
      points += 10;
      dots.splice(i, 1);
      console.log('Dot eaten! Points:', points);   
      scoreElement.innerHTML = `Points: ${points}`;   
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