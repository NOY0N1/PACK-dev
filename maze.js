import * as THREE from 'three';

// 1 = wall, 0 = open path, 2 = super pellet, 3 = pen wall, 4 = pen door (passable by ghosts only)
// 1=wall, 0=open, 2=super pellet, 3=pen wall, 4=pen door (ghosts only)
export const MAZE_LAYOUT = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,2,0,0,0,0,1,0,0,0,0,2,1],
  [1,0,1,1,0,0,1,0,0,1,1,0,1],
  [1,0,1,0,0,0,0,0,0,0,1,0,1],
  [1,0,0,0,0,0,4,0,0,0,0,0,1],  // pen door row — open corridor, door at col 6
  [0,0,0,0,0,3,3,3,0,0,0,0,0],  // tunnel row — pen walls at cols 5-7
  [1,1,1,0,0,3,3,3,0,0,1,1,1],  // pen interior (3 cells)
  [1,0,0,0,0,3,3,3,0,0,0,0,1],  // pen bottom wall
  [1,0,0,0,0,1,1,1,0,0,0,0,1],
  [1,0,1,0,0,0,0,0,0,0,1,0,1],
  [1,0,1,1,0,0,0,0,0,1,1,0,1],
  [1,2,0,0,0,0,0,0,0,0,0,2,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1],
];

export const ROWS = MAZE_LAYOUT.length;    // 13
export const COLS = MAZE_LAYOUT[0].length; // 13
export const CELL_SIZE = 1.0;
export const PACMAN_SPAWN = { col: 2, row: 11 }; // lower-left quadrant (open cell)
export const TUNNEL_ROW = 5;                      // row with left/right tunnel openings

// 3 ghosts inside pen (row 6, cols 5-7), 4th starts just outside above the door
export const GHOST_PEN_SPAWNS = [
  { col: 5, row: 6 },
  { col: 6, row: 6 },
  { col: 7, row: 6 },
  { col: 6, row: 4 }, // 4th ghost — already outside, no wait
];
export const GHOST_PEN_EXIT = { col: 6, row: 4 }; // cell above the door

// World X positions of the tunnel edges
export const TUNNEL_MIN_X = -7;
export const TUNNEL_MAX_X =  7;

// Top-left corner offset so maze is centered at origin
const OFFSET_X = -(COLS * CELL_SIZE) / 2 + CELL_SIZE / 2;
const OFFSET_Y =  (ROWS * CELL_SIZE) / 2 - CELL_SIZE / 2;

// Convert grid col/row to world position
export function gridToWorld(col, row) {
  return {
    x: OFFSET_X + col * CELL_SIZE,
    y: OFFSET_Y - row * CELL_SIZE,
  };
}

// Convert world position to grid col/row
export function worldToGrid(x, y) {
  return {
    col: Math.round((x - OFFSET_X) / CELL_SIZE),
    row: Math.round((OFFSET_Y - y) / CELL_SIZE),
  };
}

export function isWall(col, row, ghost = false) {
  if (row === TUNNEL_ROW && (col < 0 || col >= COLS)) return false;
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return true;
  const cell = MAZE_LAYOUT[row][col];
  if (cell === 1) return true;
  if (cell === 3) return true;          // pen wall — blocks everyone
  if (cell === 4) return !ghost;        // pen door — only ghosts pass
  return false;
}

const RADIUS = 0.35;

// Direction-aware wall checks — only probe the leading edge in each direction
export function collidesUp(x, y) {
  return isWall(...Object.values(worldToGrid(x - RADIUS, y + RADIUS))) ||
         isWall(...Object.values(worldToGrid(x + RADIUS, y + RADIUS)));
}
export function collidesDown(x, y) {
  return isWall(...Object.values(worldToGrid(x - RADIUS, y - RADIUS))) ||
         isWall(...Object.values(worldToGrid(x + RADIUS, y - RADIUS)));
}
export function collidesLeft(x, y) {
  return isWall(...Object.values(worldToGrid(x - RADIUS, y + RADIUS))) ||
         isWall(...Object.values(worldToGrid(x - RADIUS, y - RADIUS)));
}
export function collidesRight(x, y) {
  return isWall(...Object.values(worldToGrid(x + RADIUS, y + RADIUS))) ||
         isWall(...Object.values(worldToGrid(x + RADIUS, y - RADIUS)));
}

// Generic check used by ghosts
export function collidesWithWall(x, y) {
  return collidesUp(x, y) || collidesDown(x, y) ||
         collidesLeft(x, y) || collidesRight(x, y);
}

export function buildMaze(scene) {
  const wallMaterial = new THREE.MeshLambertMaterial({ color: 0x1a1aff });
  const penMaterial  = new THREE.MeshLambertMaterial({ color: 0x8888ff, transparent: true, opacity: 0.2 });
  const doorMaterial = new THREE.MeshLambertMaterial({ color: 0xffc0cb, transparent: true, opacity: 0.5 });
  const wallGeometry = new THREE.BoxGeometry(CELL_SIZE, CELL_SIZE, CELL_SIZE);
  const thinGeometry = new THREE.BoxGeometry(CELL_SIZE, CELL_SIZE * 0.15, CELL_SIZE);

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const cell = MAZE_LAYOUT[row][col];
      const { x, y } = gridToWorld(col, row);
      if (cell === 1) {
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);
        wall.position.set(x, y, 0);
        scene.add(wall);
      } else if (cell === 3) {
        const wall = new THREE.Mesh(wallGeometry, penMaterial);
        wall.position.set(x, y, 0);
        scene.add(wall);
      } else if (cell === 4) {
        // Thin pink door — visually marks the exit
        const door = new THREE.Mesh(thinGeometry, doorMaterial);
        door.position.set(x, y, 0);
        scene.add(door);
      }
    }
  }
}
