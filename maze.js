import * as THREE from 'three';

// 1 = wall, 0 = open path
export const MAZE_LAYOUT = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,2,0,0,0,0,1,0,0,0,0,2,1],
  [1,0,1,1,0,0,1,0,0,1,1,0,1],
  [1,0,1,0,0,0,0,0,0,0,1,0,1],
  [1,0,0,0,0,1,0,1,0,0,0,0,1],
  [1,1,1,0,1,1,0,1,1,0,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,0,1,1,0,1,1,0,1,1,1],
  [1,0,0,0,0,1,0,1,0,0,0,0,1],
  [1,0,1,0,0,0,0,0,0,0,1,0,1],
  [1,0,1,1,0,0,1,0,0,1,1,0,1],
  [1,0,0,0,0,0,1,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1],
];

export const ROWS = MAZE_LAYOUT.length;    // 13
export const COLS = MAZE_LAYOUT[0].length; // 13
export const CELL_SIZE = 1.0;
export const PACMAN_SPAWN = { col: 6, row: 6 }; // center cell, world (0,0)

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

export function isWall(col, row) {
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return true;
  return MAZE_LAYOUT[row][col] === 1;
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
  const wallMaterial = new THREE.MeshLambertMaterial({ color: 0xfffff });
  const wallGeometry = new THREE.BoxGeometry(CELL_SIZE, CELL_SIZE, CELL_SIZE);

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (MAZE_LAYOUT[row][col] === 1) {
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);
        const { x, y } = gridToWorld(col, row);
        wall.position.set(x, y, 0);
        scene.add(wall);
      }
    }
  }
}
