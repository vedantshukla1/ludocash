/**
 * LudoCash — Client-side Ludo Engine
 * Mirrors the server-side logic for local UI rendering.
 * The server is the source of truth; this is used only for
 * highlighting valid moves and animating pieces.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

export const COLORS_ORDER = ['red', 'blue', 'green', 'yellow'];

/** Main path entry square for each color (0-based absolute index on 52-square path) */
export const COLOR_START = { red: 0, blue: 13, green: 26, yellow: 39 };

/** Safe squares — no kills allowed */
export const SAFE_SQUARES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

/** Star squares (subset of safe, rendered with ⭐) */
export const STAR_SQUARES = new Set([8, 21, 34, 47]);

/** Number of squares in the home column */
export const HOME_COLUMN_LENGTH = 6;

/**
 * 15×15 grid coordinate for each of the 52 main path squares.
 * Grid is 0-indexed [row][col].
 * Standard Ludo board layout.
 */
export const MAIN_PATH_COORDS = [
  // Red start zone — top row of left arm going right
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],    // 0–4 (red start is [6,1])
  [5, 6],                                      // 5 (turn up)
  [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],    // 6–10
  [0, 7],                                      // 11 (crossover)
  [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], // 12–17 (blue start is [1,8])
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14], // 18–23
  [7, 14],                                     // 24 (crossover)
  [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9], // 25–30 (green start is [8,13])
  [9, 8],                                      // 31 (turn down)
  [10, 8], [11, 8], [12, 8], [13, 8], [14, 8], // 32–36
  [14, 7],                                     // 37 (crossover)
  [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6], // 38–43 (yellow start is [13,6])
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0], // 44–49
  [7, 0],                                      // 50 (crossover)
  [6, 0],                                      // 51
];

/**
 * Home column grid coordinates for each color (6 squares).
 * Index 0 = entry of home column, index 5 = final home square.
 */
export const HOME_COLUMN_COORDS = {
  red:    [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]],
  blue:   [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]],
  green:  [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]],
  yellow: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]],
};

/**
 * Starting base positions (4 circles per color in home base quadrant).
 * These are the 4 "spawn circles" inside each colored home base.
 */
export const BASE_POSITIONS = {
  red:    [[1, 1], [1, 3], [3, 1], [3, 3]],
  blue:   [[1, 11], [1, 13], [3, 11], [3, 13]],
  green:  [[11, 11], [11, 13], [13, 11], [13, 13]],
  yellow: [[11, 1], [11, 3], [13, 1], [13, 3]],
};

/** Center home triangle grid positions (decorative) */
export const CENTER_COORDS = [7, 7]; // center of 15x15 grid

// ─── State helpers ────────────────────────────────────────────────────────────

/**
 * Convert a color's relative path position to absolute (0-51)
 */
export const toAbsolute = (color, relativePos) => {
  const start = COLOR_START[color];
  return (start + relativePos) % 52;
};

/**
 * Get the grid [row, col] for a piece given its state and position
 */
export const getPieceGridCoord = (color, state, position, pieceIndex) => {
  if (state === 'base') {
    return BASE_POSITIONS[color][pieceIndex] || [0, 0];
  }
  if (state === 'home') {
    return [7, 7]; // center
  }
  if (state === 'home-column') {
    return HOME_COLUMN_COORDS[color][position] || [7, 7];
  }
  // on-board: absolutePos maps to MAIN_PATH_COORDS
  const coords = MAIN_PATH_COORDS[position % 52];
  return coords || [0, 0];
};

/**
 * Calculate new position for a piece after rolling dice.
 * Returns null if move is not valid.
 */
export const calculateNewPosition = (color, piece, dice) => {
  if (piece.state === 'home') return null;

  if (piece.state === 'base') {
    if (dice !== 6) return null;
    return {
      newPos: 0,
      newState: 'on-board',
      absolutePos: COLOR_START[color],
      homeColumn: false,
      reachedHome: false,
    };
  }

  if (piece.state === 'on-board') {
    const newRel = piece.position + dice;
    if (newRel > 51) {
      const homeColPos = newRel - 52;
      if (homeColPos > 5) return null;
      return {
        newPos: homeColPos,
        newState: homeColPos === 5 ? 'home' : 'home-column',
        absolutePos: -1,
        homeColumn: true,
        reachedHome: homeColPos === 5,
      };
    } else {
      return {
        newPos: newRel,
        newState: 'on-board',
        absolutePos: toAbsolute(color, newRel),
        homeColumn: false,
        reachedHome: false,
      };
    }
  }

  if (piece.state === 'home-column') {
    const newColPos = piece.position + dice;
    if (newColPos > 5) return null;
    return {
      newPos: newColPos,
      newState: newColPos === 5 ? 'home' : 'home-column',
      absolutePos: -1,
      homeColumn: true,
      reachedHome: newColPos === 5,
    };
  }

  return null;
};

/**
 * Get IDs of movable pieces for a given color and dice value
 */
export const getMovablePieces = (gameState, color, dice) => {
  if (!gameState || !gameState.pieces) return [];
  const colorEntry = gameState.pieces.find((p) => p.color === color);
  if (!colorEntry) return [];

  return colorEntry.pieces
    .filter((piece) => calculateNewPosition(color, piece, dice) !== null)
    .map((p) => p.id);
};

/**
 * Check if a position is safe (no kills)
 */
export const isSafeSquare = (absolutePos) => SAFE_SQUARES.has(absolutePos);
export const isStarSquare = (absolutePos) => STAR_SQUARES.has(absolutePos);

/**
 * Check if the current player has any valid moves
 */
export const hasAnyMove = (gameState, color, dice) => {
  return getMovablePieces(gameState, color, dice).length > 0;
};

/**
 * Get the grid coordinate for a given absolute main path position
 */
export const getMainPathCoord = (absolutePos) => {
  return MAIN_PATH_COORDS[absolutePos % 52] || [0, 0];
};

/**
 * Build a flat "path" of grid coords from a color's relative position 0→51
 * Used to animate piece movement step by step.
 */
export const buildAnimationPath = (color, fromRelPos, toRelPos, fromState) => {
  const path = [];

  if (fromState === 'base') {
    // Direct to start square
    path.push(getMainPathCoord(COLOR_START[color]));
    return path;
  }

  if (fromState === 'on-board') {
    for (let rel = fromRelPos + 1; rel <= Math.min(toRelPos, 51); rel++) {
      path.push(getMainPathCoord(toAbsolute(color, rel)));
    }
    // If entering home column
    if (toRelPos > 51) {
      const homeSteps = toRelPos - 52;
      for (let i = 0; i <= homeSteps; i++) {
        path.push(HOME_COLUMN_COORDS[color][i] || [7, 7]);
      }
    }
  }

  if (fromState === 'home-column') {
    for (let i = fromRelPos + 1; i <= toRelPos; i++) {
      path.push(HOME_COLUMN_COORDS[color][i] || [7, 7]);
    }
  }

  return path;
};

/**
 * Calculates step-by-step intermediate coordinates for walking animation
 */
export const getPathSteps = (color, piece, roll) => {
  const steps = [];
  
  if (piece.state === 'base') {
    if (roll === 6) {
      steps.push({
        state: 'on-board',
        position: 0,
        absolutePos: COLOR_START[color],
      });
    }
    return steps;
  }
  
  if (piece.state === 'on-board') {
    const start = piece.position;
    for (let k = 1; k <= roll; k++) {
      const pos = start + k;
      if (pos <= 51) {
        steps.push({
          state: 'on-board',
          position: pos,
          absolutePos: toAbsolute(color, pos),
        });
      } else {
        const hcPos = pos - 52;
        if (hcPos < 5) {
          steps.push({
            state: 'home-column',
            position: hcPos,
            absolutePos: -1,
          });
        } else if (hcPos === 5) {
          steps.push({
            state: 'home',
            position: 5,
            absolutePos: -1,
          });
        }
      }
    }
    return steps;
  }
  
  if (piece.state === 'home-column') {
    const start = piece.position;
    for (let k = 1; k <= roll; k++) {
      const pos = start + k;
      if (pos < 5) {
        steps.push({
          state: 'home-column',
          position: pos,
          absolutePos: -1,
        });
      } else if (pos === 5) {
        steps.push({
          state: 'home',
          position: 5,
          absolutePos: -1,
        });
      }
    }
    return steps;
  }
  
  return steps;
};

/**
 * Format ₹ currency string
 */
export const formatCurrency = (amount) => {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount}`;
};

export default {
  COLORS_ORDER,
  COLOR_START,
  SAFE_SQUARES,
  STAR_SQUARES,
  MAIN_PATH_COORDS,
  HOME_COLUMN_COORDS,
  BASE_POSITIONS,
  toAbsolute,
  getPieceGridCoord,
  calculateNewPosition,
  getMovablePieces,
  isSafeSquare,
  isStarSquare,
  hasAnyMove,
  getMainPathCoord,
  buildAnimationPath,
  getPathSteps,
  formatCurrency,
};
