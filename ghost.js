import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { collidesWithWall } from './maze.js';

const loader = new GLTFLoader();

export class Ghost {
  constructor(ghostFile, index) {
    this.ghostFile = ghostFile;
    this.index = index;
    this.mesh = null;
    this.mixer = null;
    this.velocity = {
      x: (Math.random() - 0.5) * 0.05,
      y: (Math.random() - 0.5) * 0.05
    };
    this.changeDirectionTimer = Math.random() * 100;
    this.pupils = [];
  }

  load(scene) {
    return new Promise((resolve, reject) => {
      loader.load(
        `./ghosts/${this.ghostFile}`,
        (gltf) => {
          this.mesh = gltf.scene;
          this.mesh.position.set(this.index * 2 - 4, -2, 0);
          this.mesh.scale.set(0.4, 0.4, 0.4);
          this.mesh.rotation.set(0, Math.PI, 0);

          const pupilBone = this.mesh.getObjectByName('Pupil_Bone');
          this.pupils = pupilBone ? [pupilBone] : this.mesh.children[0]?.children ?? [];
          console.log(`${this.ghostFile} pupils:`, this.pupils.length, pupilBone ? '(Pupil_Bone found)' : '(fallback)');

          if (gltf.animations.length > 0) {
            this.mixer = new THREE.AnimationMixer(this.mesh);
            const action = this.mixer.clipAction(gltf.animations[0]);
            action.timeScale = 0.5;
            action.play();
          }

          scene.add(this.mesh);
          console.log(`${this.ghostFile} loaded`);
          resolve(this);
        },
        undefined,
        reject
      );
    });
  }

  update(delta, bounds) {
    this.changeDirectionTimer -= delta * 60;
    if (this.changeDirectionTimer <= 0) {
      this.velocity.x = (Math.random() - 0.5) * 0.05;
      this.velocity.y = (Math.random() - 0.5) * 0.05;
      this.changeDirectionTimer = Math.random() * 100 + 50;
    }

    const { x, y } = this.mesh.position;
    const nextX = x + this.velocity.x;
    const nextY = y + this.velocity.y;

    const hitX = collidesWithWall(nextX, y) || nextX <= bounds.minX || nextX >= bounds.maxX;
    const hitY = collidesWithWall(x, nextY) || nextY <= bounds.minY || nextY >= bounds.maxY;

    if (hitX) this.velocity.x *= -1;
    else this.mesh.position.x = nextX;

    if (hitY) this.velocity.y *= -1;
    else this.mesh.position.y = nextY;

    this._updatePupils();

    if (this.mixer) this.mixer.update(delta);
  }

  _updatePupils() {
    if (this.pupils.length === 0) return;

    const velocityMagnitude = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
    const maxAngle = 0.1;

    this.pupils.forEach((pupil) => {
      if (velocityMagnitude > 0.001) {
        const dirX = this.velocity.x / velocityMagnitude;
        const dirY = this.velocity.y / velocityMagnitude;
        pupil.rotation.y = dirX * maxAngle;
        pupil.rotation.x = dirY * maxAngle;
      } else {
        pupil.rotation.x = 0;
        pupil.rotation.y = 0;
      }
    });
  }

  get position() {
    return this.mesh.position;
  }
}
