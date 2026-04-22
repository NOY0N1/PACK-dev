import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { collidesUp, collidesDown, collidesLeft, collidesRight } from './maze.js';

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
            const action = this.mixer.clipAction(gltf.animations[0]);
            action.timeScale = 0.5;
            action.play();
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

  update(delta, keys, moveSpeed, bounds) {
    if (this.mixer) this.mixer.update(delta);

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

      const alignedOnX = Math.abs(x % 1) < moveSpeed * 2; // close enough to a column center
      const alignedOnY = Math.abs(y % 1) < moveSpeed * 2; // close enough to a row center

      if ((turningToVertical && isHorizontal && alignedOnX) ||
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

    this.mesh.position.x = Math.max(bounds.minX, Math.min(bounds.maxX, this.mesh.position.x));
    this.mesh.position.y = Math.max(bounds.minY, Math.min(bounds.maxY, this.mesh.position.y));
  }

  get position() {
    return this.mesh.position;
  }
}
