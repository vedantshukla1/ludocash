const {
  COLORS_ORDER,
  COLOR_START,
  SAFE_SQUARES,
} = require('../config/constants');

const toAbsolute = (color, relativePos) => {
  const start = COLOR_START[color];
  return (start + relativePos) % 52;
};

const calculateNewPosition = (color, piece, dice) => {
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
    }
    return {
      newPos: newRel,
      newState: 'on-board',
      absolutePos: toAbsolute(color, newRel),
      homeColumn: false,
      reachedHome: false,
    };
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

const getMovablePieces = (gameState, color, dice) => {
  const colorEntry = gameState.pieces.find((p) => p.color === color);
  if (!colorEntry) return [];

  return colorEntry.pieces
    .filter((piece) => calculateNewPosition(color, piece, dice) !== null)
    .map((p) => p.id);
};

const hasAnyMove = (gameState, color, dice) =>
  getMovablePieces(gameState, color, dice).length > 0;

const createInitialGameState = (colors) => {
  const pieces = colors.map((color) => ({
    color,
    pieces: [0, 1, 2, 3].map((id) => ({
      id,
      state: 'base',
      position: -1,
      absolutePos: -1,
    })),
  }));

  return {
    pieces,
    currentTurn: colors[0],
    diceValue: null,
    diceRolled: false,
    consecutiveSixes: 0,
    turnOrder: [...colors],
  };
};

const findPiece = (gameState, color, pieceId) => {
  const entry = gameState.pieces.find((p) => p.color === color);
  if (!entry) return null;
  return entry.pieces.find((p) => p.id === pieceId);
};

const findKillTarget = (gameState, movingColor, absolutePos) => {
  if (absolutePos < 0 || SAFE_SQUARES.has(absolutePos)) return null;

  for (const entry of gameState.pieces) {
    if (entry.color === movingColor) continue;
    for (const piece of entry.pieces) {
      if (piece.state === 'on-board' && piece.absolutePos === absolutePos) {
        return { color: entry.color, piece };
      }
    }
  }
  return null;
};

const allPiecesHome = (gameState, color) => {
  const entry = gameState.pieces.find((p) => p.color === color);
  if (!entry) return false;
  return entry.pieces.every((p) => p.state === 'home');
};

const nextTurnColor = (gameState, currentColor) => {
  const idx = gameState.turnOrder.indexOf(currentColor);
  return gameState.turnOrder[(idx + 1) % gameState.turnOrder.length];
};

const rollDice = () => {
  const bytes = require('crypto').randomBytes(1);
  return (bytes[0] % 6) + 1;
};

module.exports = {
  calculateNewPosition,
  getMovablePieces,
  hasAnyMove,
  createInitialGameState,
  findPiece,
  findKillTarget,
  allPiecesHome,
  nextTurnColor,
  rollDice,
  toAbsolute,
};
