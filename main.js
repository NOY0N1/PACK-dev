import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Ghost } from './ghost.js';
import { Pacman } from './pacman.js';
import { buildMaze, MAZE_LAYOUT, ROWS, COLS, PACMAN_SPAWN, gridToWorld } from './maze.js';

// -------------------- Scene & Camera --------------------
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 0, 16);
camera.lookAt(0, 0, 0);
let points = 0;

// -------------------- Renderer --------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.style.margin = 0;
document.body.style.overflow = 'hidden';
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

// -------------------- Maze --------------------
buildMaze(scene);

// -------------------- Game State --------------------
const clock = new THREE.Clock();
const moveSpeed = 0.05;
const bounds = { minX: -6, maxX: 6, minY: -6, maxY: 6 };
let isPaused = false;
let dots = [];

const keys = {
  ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
  w: false, a: false, s: false, d: false
};

window.addEventListener('keydown', (e) => { if (e.key in keys) keys[e.key] = true; });
window.addEventListener('keyup',   (e) => { if (e.key in keys) keys[e.key] = false; });

// -------------------- Load Dots --------------------

let superPellets = [];
let flickerTimer = 0;
const FLICKER_INTERVAL = 0.2; // seconds between on/off

const loader = new GLTFLoader();
loader.load('./dot.glb', (gltf) => {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if ((MAZE_LAYOUT[row][col] === 0 || MAZE_LAYOUT[row][col] === 2) &&
          !(col === PACMAN_SPAWN.col && row === PACMAN_SPAWN.row)) {
        const dot = gltf.scene.clone();
        const { x, y } = gridToWorld(col, row);
        dot.position.set(x, y, 0);
        if (MAZE_LAYOUT[row][col] === 0) {
          dot.scale.set(0.15, 0.15, 0.15);
        }
        else {
          dot.scale.set(0.5, 0.5, 0.5);
          superPellets.push(dot);
        }
        
        scene.add(dot);
        dots.push(dot);
      } 
    }
  }
  console.log(`${dots.length} dots placed`);
}, undefined, (e) => console.error('Error loading dot:', e));

// -------------------- Load Ghosts & Pacman --------------------
const ghostFiles = ['Pinky.glb', 'Inky.glb', 'Clyde.glb', 'Blinky.glb'];
const ghosts = ghostFiles.map((file, i) => new Ghost(file, file.replace('.glb', ''), i));
ghosts.forEach((ghost) => ghost.load(scene));

const pacman = new Pacman();
pacman.load(scene);

// -------------------- Animate Loop --------------------
function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  // Flicker super pellets
  flickerTimer += delta;
  if (flickerTimer >= FLICKER_INTERVAL) {
    flickerTimer = 0;
    superPellets.forEach((p) => { p.visible = !p.visible; });
  }

  if (!isPaused) {
    const blinky = ghosts.find(g => g.name === 'Blinky');
    ghosts.forEach((ghost) => {
      if (ghost.mesh) {
        let target = pacman.mesh ? pacman.position : null;
        if (ghost.name === 'Pinky' && pacman.mesh) {
          target = { position: pacman.position, direction: pacman.direction };
        } else if (ghost.name === 'Inky' && pacman.mesh && blinky?.mesh) {
          target = { position: pacman.position, direction: pacman.direction, blinkyPosition: blinky.position };
        }
        ghost.update(delta, bounds, target);
      }
    });

    if (pacman.mesh) {
      pacman.update(delta, keys, moveSpeed);

      // Dot collision
      for (let i = dots.length - 1; i >= 0; i--) {
        if (pacman.position.distanceTo(dots[i].position) < 0.5) {
          const isSuper = superPellets.includes(dots[i]);
          scene.remove(dots[i]);
          if (isSuper) {
            superPellets.splice(superPellets.indexOf(dots[i]), 1);
            ghosts.forEach((g) => g.scare());
          }
          dots.splice(i, 1);
          points += isSuper ? 50 : 10;
          scoreElement.innerHTML = `Points: ${points}`;
        }
      }

      // Ghost collision
      for (const ghost of ghosts) {
        if (ghost.normalMesh && !ghost.eyesActive && pacman.position.distanceTo(ghost.position) < 0.5) {
          if (ghost.scared) {
            ghost.respawn();
            points += 200;
            scoreElement.innerHTML = `Points: ${points}`;
          } else {
            isPaused = true;
            scoreElement.innerHTML = `Game Over! Final Score: ${points}`;
            break;
          }
        }
      }
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
