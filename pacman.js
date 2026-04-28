import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { collidesUp, collidesDown, collidesLeft, collidesRight, TUNNEL_MIN_X, TUNNEL_MAX_X } from './maze.js';

const loader = new GLTFLoader();

export class Pacman {
  constructor() {
    this.mesh = null;
    this.mixer = null;
    this.direction = null; // 'up' | 'down' | 'left' | 'right'
    this.queuedDirection = null; // buffered input, applied when axis allows
  }

  load(scene) {
    return new Promise((resolve, reject) => {
      loader.load(
        './Packman.glb',
        (gltf) => {
          this.mesh = gltf.scene;
          this.mesh.position.set(0, 0, 0);
          this.mesh.scale.set(0.5, 0.5, 0.5);
          this.mesh.rotation.set(0, Math.PI / 2, 0);

          if (gltf.animations.length > 0) {
            this.mixer = new THREE.AnimationMixer(this.mesh);
            this.action = this.mixer.clipAction(gltf.animations[0]);
            this.action.timeScale = 2.5;
            this.action.play();
            this.action.paused = true; // start paused until moving
          }

          scene.add(this.mesh);
          console.log('Pac-Man loaded');
          resolve(this);
        },
        undefined,
        reject
      );
    });
  }

  update(delta, keys, moveSpeed) {
    // Buffer the latest input as queued direction
    if (keys.ArrowUp    || keys.w) this.queuedDirection = 'up';
    if (keys.ArrowDown  || keys.s) this.queuedDirection = 'down';
    if (keys.ArrowLeft  || keys.a) this.queuedDirection = 'left';
    if (keys.ArrowRight || keys.d) this.queuedDirection = 'right';

    const { x, y } = this.mesh.position;
    const isHorizontal = this.direction === 'left' || this.direction === 'right';
    const isVertical   = this.direction === 'up'   || this.direction === 'down';

    // Only allow a queued turn when Pacman is aligned on the perpendicular axis
    if (this.queuedDirection) {
      const turningToVertical   = this.queuedDirection === 'up'   || this.queuedDirection === 'down';
      const turningToHorizontal = this.queuedDirection === 'left' || this.queuedDirection === 'right';

      const alignedOnX = Math.abs(x % 1) < moveSpeed * 2;
      const alignedOnY = Math.abs(y % 1) < moveSpeed * 2;

      const sameAxis = (turningToVertical && isVertical) || (turningToHorizontal && isHorizontal);
      if (sameAxis ||
          (turningToVertical && isHorizontal && alignedOnX) ||
          (turningToHorizontal && isVertical && alignedOnY) ||
          this.direction === null) {
        this.direction = this.queuedDirection;
        this.queuedDirection = null;
      }
    }

    // Move in current direction, stop if wall ahead
    if (this.direction === 'up') {
      this.mesh.rotation.set(-Math.PI / 2, 0, -Math.PI / 2);
      if (!collidesUp(x, y + moveSpeed)) this.mesh.position.y += moveSpeed;
      else this.direction = null;
    } else if (this.direction === 'down') {
      this.mesh.rotation.set(Math.PI / 2, 0, Math.PI / 2);
      if (!collidesDown(x, y - moveSpeed)) this.mesh.position.y -= moveSpeed;
      else this.direction = null;
    } else if (this.direction === 'left') {
      this.mesh.rotation.set(0, -Math.PI / 2, 0);
      if (!collidesLeft(x - moveSpeed, y)) this.mesh.position.x -= moveSpeed;
      else this.direction = null;
    } else if (this.direction === 'right') {
      this.mesh.rotation.set(0, Math.PI / 2, 0);
      if (!collidesRight(x + moveSpeed, y)) this.mesh.position.x += moveSpeed;
      else this.direction = null;
    }

    // Horizontal tunnel wrapping only
    if (this.mesh.position.x < TUNNEL_MIN_X) this.mesh.position.x = TUNNEL_MAX_X;
    if (this.mesh.position.x > TUNNEL_MAX_X) this.mesh.position.x = TUNNEL_MIN_X;

    // Play animation only while moving
    if (this.action) {
      this.action.paused = this.direction === null;
      if (!this.action.paused) this.mixer.update(delta);
    }
  }

  get position() {
    return this.mesh.position;
  }
}
