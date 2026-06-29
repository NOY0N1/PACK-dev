import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { isWall, worldToGrid, gridToWorld, GHOST_PEN_SPAWNS, GHOST_PEN_EXIT } from './maze.js';

// Waypoint loops each ghost follows during scatter.
// Every segment between consecutive waypoints is a straight, wall-free corridor.
const SCATTER_LOOPS = {
  Pinky: [ // top-left — clockwise rectangle via row4 (avoids inner walls at cols 2-3 rows 2-3)
    { col: 1, row: 1 },
    { col: 1, row: 4 },
    { col: 4, row: 4 },
    { col: 4, row: 1 },
  ],
  Blinky: [ // top-right — clockwise rectangle via row4 (avoids inner walls at cols 9-10 rows 2-3, col10 row3)
    { col: 11, row: 1 },
    { col: 11, row: 4 },
    { col:  8, row: 4 },
    { col:  8, row: 1 },
  ],
  Clyde: [ // bottom-left — rectangle via row8 (avoids inner walls at col2 rows 9-10, cols 2-3 row10)
    { col: 1, row: 11 },
    { col: 1, row:  8 },
    { col: 4, row:  8 },
    { col: 4, row: 11 },
  ],
  Inky: [ // bottom-right — rectangle via row8 (avoids inner walls at col10 rows 9-10, cols 9-10 row10)
    { col: 11, row: 11 },
    { col: 11, row:  8 },
    { col:  8, row:  8 },
    { col:  8, row: 11 },
  ],
};

const loader = new GLTFLoader();

const SCARED_DURATION = 8;
const FLASH_THRESHOLD = 3;   // seconds left when flashing starts
const FLASH_INTERVAL  = 0.2; // seconds between blue/white toggle

export class Ghost {
  constructor(ghostFile, name, index) {
    this.ghostFile = ghostFile;
    this.name = name;
    this.index = index;
    this.mesh = null;
    this.normalMesh = null;
    this.scaredMesh = null;
    this.mixer = null;
    this.scene = null;
    this.scared = false;
    this.scaredTimer = 0;
    this.flashTimer = 0;
    this.flashBlue = true;
    this.spawnCell = GHOST_PEN_SPAWNS[index % GHOST_PEN_SPAWNS.length];
    this.inPen = index < 3;      // only first 3 start in pen; 4th starts outside
    this.exitTimer = (index * 3) + 5;  // stagger release: 0s, 3s, 6s
    this.velocity = { x: 0.03, y: 0 };
    this.changeDirectionTimer = Math.random() * 100;
    this.pupils = [];
    this.exiting = false;
    this.eyesMesh = null;
    this.eyesActive = false;
    this.scatter = false;
    this.scatterLoop = SCATTER_LOOPS[name] ?? [{ col: 1, row: 1 }];
    this.scatterWaypointIndex = 0;
  }

  load(scene) {
    this.scene = scene;
    return new Promise((resolve, reject) => {
      loader.load(
        `./ghosts/${this.ghostFile}`,
        (gltf) => {
          this.normalMesh = gltf.scene;
          const spawnWorld = gridToWorld(this.spawnCell.col, this.spawnCell.row);
          this.normalMesh.position.set(spawnWorld.x, spawnWorld.y, 0);
          this.normalMesh.scale.set(0.4, 0.4, 0.4);
          this.normalMesh.rotation.set(0, Math.PI, 0);

          const pupilBone = this.normalMesh.getObjectByName('Pupil_Bone');
          this.pupils = pupilBone ? [pupilBone] : this.normalMesh.children[0]?.children ?? [];

          if (gltf.animations.length > 0) {
            this.mixer = new THREE.AnimationMixer(this.normalMesh);
            const action = this.mixer.clipAction(gltf.animations[0]);
            action.timeScale = 0.5;
            action.play();
          }

          this.mesh = this.normalMesh;
          scene.add(this.mesh);

          // Preload scared model
          loader.load('./ghosts/Scared.glb', (scaredGltf) => {
            this.scaredMesh = scaredGltf.scene;
            this.scaredMesh.scale.set(0.4, 0.4, 0.4);
            this.scaredMesh.rotation.set(0, Math.PI, 0);
            this.scaredMesh.visible = false;
            this.scaredMesh.traverse((child) => {
              if (child.isMesh) {
                child.material = child.material.clone();
                child.material.color.set(0x0000ff);
              }
            });
            scene.add(this.scaredMesh);

            if (scaredGltf.animations.length > 0) {
              this.scaredMixer = new THREE.AnimationMixer(this.scaredMesh);
              this.scaredMixer.clipAction(scaredGltf.animations[0]).play();
            }
          });

          // Preload eyes model
          loader.load('./ghosts/Eyes.glb', (eyesGltf) => {
            this.eyesMesh = eyesGltf.scene;
            this.eyesMesh.scale.set(0.4, 0.4, 0.4);
            this.eyesMesh.rotation.set(0, Math.PI, 0);
            this.eyesMesh.visible = false;
            scene.add(this.eyesMesh);
          });

          console.log(`${this.ghostFile} loaded`);
          resolve(this);
        },
        undefined,
        reject
      );
    });
  }

  scare() {
    if (!this.scaredMesh) return;
    //if (this.inPen) return; // Don't scare if still in pen
    this.scared = true;
    this.scaredTimer = SCARED_DURATION;
    this.flashTimer = FLASH_INTERVAL;
    this.flashBlue = true;
    this.scaredMesh.traverse((child) => {
      if (child.isMesh) child.material.color.set(0x0000ff);
    });
    this.normalMesh.visible = false;
    this.scaredMesh.visible = true;
    this.scaredMesh.position.copy(this.normalMesh.position);
    this.mesh = this.scaredMesh;
  }

  startScatter() {
    this.scatter = true;
    this.scatterWaypointIndex = 0;
  }

  stopScatter() {
    this.scatter = false;
  }

  _unScare() {
    this.scared = false;
    this.scaredMesh.visible = false;
    this.normalMesh.visible = true;
    this.mesh = this.normalMesh;
  }

  respawn() {
    this._unScare();
    this.normalMesh.visible = false;
    if (this.eyesMesh) {
      this.eyesMesh.position.copy(this.normalMesh.position);
      this.eyesMesh.visible = true;
      this.eyesActive = true;
    } else {
      this._finishRespawn();
    }
  }

  _finishRespawn() {
    const spawnWorld = gridToWorld(this.spawnCell.col, this.spawnCell.row);
    this.normalMesh.position.set(spawnWorld.x, spawnWorld.y, 0);
    this.normalMesh.visible = true;
    this.inPen = true;
    this.exitTimer = 3;
    this.velocity = { x: 0.03, y: 0 };
  }

  update(delta, bounds, target = null) {
    // Count down scared timer
    if (this.scared) {
      this.scaredTimer -= delta;
      if (this.scaredTimer <= 0) {
        this._unScare();
      } else if (this.scaredTimer <= FLASH_THRESHOLD) {
        this.flashTimer -= delta;
        if (this.flashTimer <= 0) {
          this.flashTimer = FLASH_INTERVAL;
          this.flashBlue = !this.flashBlue;
          const color = this.flashBlue ? 0x0000ff : 0xffffff;
          this.scaredMesh.traverse((child) => {
            if (child.isMesh) child.material.color.set(color);
          });
        }
      }
    }

    const { x, y } = this.normalMesh.position;

    if (this.inPen) {
      // Count down before exiting
      this.exitTimer -= delta;
      if (this.exitTimer <= 0) {
        // Move toward pen exit (above door)
        this.exiting = true;  
        const exit = gridToWorld(GHOST_PEN_EXIT.col, GHOST_PEN_EXIT.row);
        const dx = exit.x - x;
        const dy = exit.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 0.1) {
          this.inPen = false;
          this.exiting = false;
          this.velocity = { x: 0, y: -0.05 };
        } else {
          const speed = 0.04;
          this.normalMesh.position.x += (dx / dist) * speed;
          this.normalMesh.position.y += (dy / dist) * speed;
        }
      } else {
        // Normal roaming
  this.changeDirectionTimer -= delta * 60;
  if (this.changeDirectionTimer <= 0) {
    this.velocity.x = (Math.random() - 0.5) * 0.05;
    this.velocity.y = (Math.random() - 0.5) * 0.05;
    this.changeDirectionTimer = Math.random() * 100 + 50;
  }

  const nextX = x + this.velocity.x;
  const nextY = y + this.velocity.y;
  const { col: cx,  row: cy  } = worldToGrid(nextX, y);
  const { col: cx2, row: cy2 } = worldToGrid(x, nextY);
  const hitX = isWall(cx,  cy,  true) || nextX <= bounds.minX || nextX >= bounds.maxX;
  const hitY = isWall(cx2, cy2, true) || nextY <= bounds.minY || nextY >= bounds.maxY;

  if (hitX) this.velocity.x *= -1;
  else this.normalMesh.position.x = nextX;

  if (hitY) this.velocity.y *= -1;
  else this.normalMesh.position.y = nextY;

  // Prevent drifting back into pen
  const { col, row } = worldToGrid(this.normalMesh.position.x, this.normalMesh.position.y);
  if (this.isPenCell(col, row)) {
    this.normalMesh.position.y -= 0.1; // nudge upward out of pen
  }
      }
    } else {
      // Scatter: follow waypoint loop one axis at a time through open corridors
      if (this.scatter && !this.scared) {
        const wp = this.scatterLoop[this.scatterWaypointIndex];
        const wpWorld = gridToWorld(wp.col, wp.row);
        const dx = wpWorld.x - x;
        const dy = wpWorld.y - y;
        const speed = 0.04;
        if (Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05) {
          this.scatterWaypointIndex = (this.scatterWaypointIndex + 1) % this.scatterLoop.length;
          this.velocity.x = 0;
          this.velocity.y = 0;
        } else if (Math.abs(dx) > Math.abs(dy)) {
          this.velocity.x = Math.sign(dx) * speed;
          this.velocity.y = 0;
        } else {
          this.velocity.x = 0;
          this.velocity.y = Math.sign(dy) * speed;
        }
      // Chase target or roam randomly
      } else if (target && !this.scared) {
        let chaseX, chaseY;
        if (this.name === 'Pinky' && target.position) {
          // Pinky: aim 4 tiles ahead of Pacman's current direction
          const LOOKAHEAD = 4;
          const dirOffsets = { up: [0, LOOKAHEAD], down: [0, -LOOKAHEAD], left: [-LOOKAHEAD, 0], right: [LOOKAHEAD, 0] };
          const [ox, oy] = (target.direction && dirOffsets[target.direction]) || [0, 0];
          chaseX = target.position.x + ox;
          chaseY = target.position.y + oy;
        } else if (this.name === 'Inky' && target.position && target.blinkyPosition) {
          // Inky: pivot is 2 tiles ahead of Pacman, then double the vector from Blinky to that pivot
          const LOOKAHEAD = 2;
          const dirOffsets = { up: [0, LOOKAHEAD], down: [0, -LOOKAHEAD], left: [-LOOKAHEAD, 0], right: [LOOKAHEAD, 0] };
          const [ox, oy] = (target.direction && dirOffsets[target.direction]) || [0, 0];
          const pivotX = target.position.x + ox;
          const pivotY = target.position.y + oy;
          chaseX = pivotX + (pivotX - target.blinkyPosition.x);
          chaseY = pivotY + (pivotY - target.blinkyPosition.y);
        } else {
          chaseX = (target.position ?? target).x;
          chaseY = (target.position ?? target).y;
        }
        const dx = chaseX - x;
        const dy = chaseY - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0.001) {
          const speed = 0.04;
          this.velocity.x = (dx / dist) * speed;
          this.velocity.y = (dy / dist) * speed;
        }
      } else {
        this.changeDirectionTimer -= delta * 60;
        if (this.changeDirectionTimer <= 0) {
          this.velocity.x = (Math.random() - 0.5) * 0.05;
          this.velocity.y = (Math.random() - 0.5) * 0.05;
          this.changeDirectionTimer = Math.random() * 100 + 50;
        }
      }

      const nextX = x + this.velocity.x;
      const nextY = y + this.velocity.y;
      const { col: cx,  row: cy  } = worldToGrid(nextX, y);
      const { col: cx2, row: cy2 } = worldToGrid(x, nextY);
      const hitX = isWall(cx,  cy,  true) || nextX <= bounds.minX || nextX >= bounds.maxX;
      const hitY = isWall(cx2, cy2, true) || nextY <= bounds.minY || nextY >= bounds.maxY;

      if (hitX) this.velocity.x *= -1;
      else this.normalMesh.position.x = nextX;

      if (hitY) this.velocity.y *= -1;
      else this.normalMesh.position.y = nextY;
    }

    // Keep scared mesh in sync with normal mesh position
    if (this.scaredMesh) this.scaredMesh.position.copy(this.normalMesh.position);

    // Eyes travel back to spawn
    if (this.eyesActive && this.eyesMesh) {
      const target = gridToWorld(this.spawnCell.col, this.spawnCell.row);
      const ex = this.eyesMesh.position.x;
      const ey = this.eyesMesh.position.y;
      const dx = target.x - ex;
      const dy = target.y - ey;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 0.1) {
        this.eyesMesh.visible = false;
        this.eyesActive = false;
        this._finishRespawn();
      } else {
        const speed = 0.08;
        this.eyesMesh.position.x += (dx / dist) * speed;
        this.eyesMesh.position.y += (dy / dist) * speed;
      }
    }

    this._updatePupils();

    if (this.mixer) this.mixer.update(delta);
    if (this.scared && this.scaredMixer) this.scaredMixer.update(delta);
  }

  isPenCell(col, row) {
  return GHOST_PEN_SPAWNS.some(cell => cell.col === col && cell.row === row);
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
    return this.normalMesh.position;
  }
}
