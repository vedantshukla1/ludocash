import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { BOARD, COLORS, PLAYER_COLORS } from '../utils/theme';
import {
  MAIN_PATH_COORDS, HOME_COLUMN_COORDS, BASE_POSITIONS,
  SAFE_SQUARES, STAR_SQUARES, COLOR_START,
} from '../utils/ludoEngine';
import Piece3D from './Piece3D';

const CELL = BOARD.cellSize;
const SIZE = BOARD.size;

// Authentic Ludo Colors
const CLASSIC_COLORS = {
  red: '#E53935',
  blue: '#1E88E5',
  green: '#43A047',
  yellow: '#FFB300',
  boardBg: '#F5F2EB', // Cream paper texture background
  border: '#D5CDBE',  // Cardboard style separator lines
  safe: '#EAE6DB',    // Distinct safe square background
};

// Home base quadrant positions [row, col]
const HOME_BASES = {
  red:    { row: 0, col: 0 },
  blue:   { row: 0, col: 9 },
  green:  { row: 9, col: 9 },
  yellow: { row: 9, col: 0 },
};

const LudoBoard = ({ gameState, players, myColor, movablePieces, onPiecePress }) => {
  // Build a lookup: absolutePos → list of {color, pieceId}
  const piecePositions = useMemo(() => {
    const map = {};
    if (!gameState?.pieces) return map;
    for (const colorEntry of gameState.pieces) {
      for (const piece of colorEntry.pieces) {
        if (piece.state === 'on-board') {
          const key = `main_${piece.absolutePos}`;
          if (!map[key]) map[key] = [];
          map[key].push({ color: colorEntry.color, pieceId: piece.id });
        } else if (piece.state === 'home-column') {
          const key = `hc_${colorEntry.color}_${piece.position}`;
          if (!map[key]) map[key] = [];
          map[key].push({ color: colorEntry.color, pieceId: piece.id });
        } else if (piece.state === 'base') {
          const key = `base_${colorEntry.color}_${piece.id}`;
          map[key] = [{ color: colorEntry.color, pieceId: piece.id }];
        } else if (piece.state === 'home') {
          const key = `home_${colorEntry.color}_${piece.id}`;
          map[key] = [{ color: colorEntry.color, pieceId: piece.id }];
        }
      }
    }
    return map;
  }, [gameState]);

  const isMovable = (color, pieceId) => {
    return color === myColor && movablePieces.includes(pieceId);
  };

  const renderCell = (row, col) => {
    const key = `${row}_${col}`;
    const absPos = MAIN_PATH_COORDS.findIndex(([r, c]) => r === row && c === col);

    let isPathCell = absPos !== -1;
    let isSafe = absPos !== -1 && SAFE_SQUARES.has(absPos);
    let isStar = absPos !== -1 && STAR_SQUARES.has(absPos);

    let bgColor = CLASSIC_COLORS.boardBg;

    if (isPathCell) {
      bgColor = '#FFFFFF'; // Path cells are solid white
    }

    // Color the starting cells for each color
    for (const [color, start] of Object.entries(COLOR_START)) {
      if (row === MAIN_PATH_COORDS[start]?.[0] && col === MAIN_PATH_COORDS[start]?.[1]) {
        bgColor = CLASSIC_COLORS[color];
        break;
      }
    }

    // Home column coloring
    for (const [color, coords] of Object.entries(HOME_COLUMN_COORDS)) {
      for (const [r, c] of coords) {
        if (r === row && c === col) {
          bgColor = CLASSIC_COLORS[color];
          isPathCell = true;
          break;
        }
      }
    }

    // Safe squares that are not the starting cells get a distinct texture/color
    if (isSafe && bgColor === '#FFFFFF') {
      bgColor = CLASSIC_COLORS.safe;
    }

    // Don't render cells inside the 3x3 center or the 6x6 base quadrants to keep DOM light and clean
    const isCenter3x3 = row >= 6 && row <= 8 && col >= 6 && col <= 8;
    const isRedBase = row < 6 && col < 6;
    const isBlueBase = row < 6 && col > 8;
    const isGreenBase = row > 8 && col > 8;
    const isYellowBase = row > 8 && col < 6;

    if (isCenter3x3 || isRedBase || isBlueBase || isGreenBase || isYellowBase) {
      bgColor = 'transparent';
    }

    const piecesHere = piecePositions[`main_${absPos}`] || [];

    return (
      <View
        key={key}
        style={[
          styles.cell,
          { backgroundColor: bgColor, borderColor: CLASSIC_COLORS.border },
          isSafe && styles.safeCell,
        ]}
      >
        {isStar && <Text style={styles.star}>⭐</Text>}
      </View>
    );
  };

  return (
    <View style={styles.boardWrapper}>
      {/* 15×15 grid */}
      <View style={styles.board}>
        {Array.from({ length: 15 }, (_, row) => (
          <View key={row} style={styles.row}>
            {Array.from({ length: 15 }, (_, col) => renderCell(row, col))}
          </View>
        ))}

        {/* Center Home Triangles (Classic diagonal partition) */}
        <View style={styles.centerHomeContainer}>
          <View style={styles.trianglesPattern} />
          <View style={styles.centerStarBox}>
            <Text style={styles.centerStar}>⭐</Text>
          </View>
        </View>

        {/* Overlay base circles for each color */}
        {Object.entries(HOME_BASES).map(([color, config]) => (
          <View
            key={color}
            style={[
              styles.homeBaseOverlay,
              {
                top: config.row * CELL,
                left: config.col * CELL,
                width: CELL * 6,
                height: CELL * 6,
                backgroundColor: CLASSIC_COLORS[color],
                borderColor: CLASSIC_COLORS.border,
              },
            ]}
          >
            {/* White/cream centered panel */}
            <View
              style={{
                position: 'absolute',
                top: CELL * 0.8,
                left: CELL * 0.8,
                width: CELL * 4.4,
                height: CELL * 4.4,
                backgroundColor: '#FFFDF0',
                borderRadius: 8,
                borderWidth: 1.5,
                borderColor: 'rgba(0,0,0,0.12)',
              }}
            />

            {/* 4 spawn circles */}
            {BASE_POSITIONS[color].map(([r, c], i) => {
              // Perfect symmetric relative coordinates for centering in 6x6 base
              const spawnOffsets = [
                { top: 1.3, left: 1.3 },
                { top: 1.3, left: 3.5 },
                { top: 3.5, left: 1.3 },
                { top: 3.5, left: 3.5 },
              ];
              const relRow = spawnOffsets[i].top;
              const relCol = spawnOffsets[i].left;
              const piecesAtBase = piecePositions[`base_${color}_${i}`] || [];
              const circleSize = CELL * 1.2;
              return (
                <View
                  key={i}
                  style={[
                    styles.spawnCircle,
                    {
                      top: relRow * CELL,
                      left: relCol * CELL,
                      width: circleSize,
                      height: circleSize,
                      borderRadius: circleSize / 2,
                      borderColor: CLASSIC_COLORS[color],
                      borderWidth: 2.5,
                      backgroundColor: '#FFFDF0',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.2,
                      shadowRadius: 2.5,
                      elevation: 3,
                    },
                  ]}
                >
                  <View
                    style={{
                      width: CELL * 0.38,
                      height: CELL * 0.38,
                      borderRadius: (CELL * 0.38) / 2,
                      backgroundColor: CLASSIC_COLORS[color],
                      opacity: 0.3,
                    }}
                  />
                </View>
              );
            })}
          </View>
        ))}

        {/* Render all pieces in a flat overlay above stars, grids, and boundaries */}
        {Object.keys(piecePositions).map((posKey) => {
          const pieces = piecePositions[posKey] || [];
          if (pieces.length === 0) return null;

          // Resolve absolute (r, c) coordinate for this position key
          let r = 0, c = 0;
          let isBase = false;

          if (posKey.startsWith('main_')) {
            const absPos = parseInt(posKey.split('_')[1], 10);
            const coords = MAIN_PATH_COORDS[absPos];
            if (!coords) return null;
            r = coords[0];
            c = coords[1];
          } else if (posKey.startsWith('hc_')) {
            const parts = posKey.split('_');
            const color = parts[1];
            const hcIdx = parseInt(parts[2], 10);
            const coords = HOME_COLUMN_COORDS[color]?.[hcIdx];
            if (!coords) return null;
            r = coords[0];
            c = coords[1];
          } else if (posKey.startsWith('base_')) {
            const parts = posKey.split('_');
            const color = parts[1];
            const pId = parseInt(parts[2], 10);
            const baseConfig = HOME_BASES[color];
            const spawnOffsets = [
              { top: 1.3, left: 1.3 },
              { top: 1.3, left: 3.5 },
              { top: 3.5, left: 1.3 },
              { top: 3.5, left: 3.5 },
            ];
            const offset = spawnOffsets[pId];
            r = baseConfig.row + offset.top;
            c = baseConfig.col + offset.left;
            isBase = true;
          } else if (posKey.startsWith('home_')) {
            // Home triangle pieces
            const parts = posKey.split('_');
            const color = parts[1];
            const pId = parseInt(parts[2], 10);
            const centerConfig = {
              red: { r: 7.1, c: 6.2 },
              blue: { r: 6.2, c: 7.1 },
              green: { r: 7.1, c: 8.0 },
              yellow: { r: 8.0, c: 7.1 },
            };
            const config = centerConfig[color];
            const idOffsets = [
              { dr: 0, dc: 0 },
              { dr: 0.16, dc: 0.16 },
              { dr: -0.16, dc: -0.16 },
              { dr: 0.16, dc: -0.16 },
            ];
            const offset = idOffsets[pId] || { dr: 0, dc: 0 };
            r = config.r + offset.dr;
            c = config.c + offset.dc;
          }

          // Render the pieces at this coordinate
          if (pieces.length === 1) {
            const p = pieces[0];
            const size = isBase ? CELL * 0.72 : CELL * 0.68;
            const centeredOffset = isBase ? (CELL * 1.2 - size) / 2 : (CELL - size) / 2;
            const topOffset = isBase ? centeredOffset - CELL * 0.06 : centeredOffset - CELL * 0.04;
            return (
              <Piece3D
                key={`${p.color}_${p.pieceId}`}
                color={p.color}
                pieceId={p.pieceId}
                selected={isMovable(p.color, p.pieceId)}
                onPress={() => onPiecePress(p.color, p.pieceId)}
                size={size}
                style={{
                  position: 'absolute',
                  top: r * CELL + topOffset,
                  left: c * CELL + centeredOffset,
                  zIndex: 200,
                }}
              />
            );
          } else {
            // Stack multiple pieces in the same cell
            return pieces.map((p, idx) => {
              const offset = idx * CELL * 0.12;
              const size = CELL * 0.48;
              const cellWidth = isBase ? CELL * 1.2 : CELL;
              const centeredOffset = (cellWidth - size) / 2;
              return (
                <Piece3D
                  key={`${p.color}_${p.pieceId}`}
                  color={p.color}
                  pieceId={p.pieceId}
                  selected={isMovable(p.color, p.pieceId)}
                  onPress={() => onPiecePress(p.color, p.pieceId)}
                  size={size}
                  style={{
                    position: 'absolute',
                    top: r * CELL + centeredOffset + offset - (isBase ? CELL * 0.06 : CELL * 0.04),
                    left: c * CELL + centeredOffset + offset,
                    zIndex: 200 + idx,
                  }}
                />
              );
            });
          }
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  boardWrapper: {
    width: SIZE + 12,
    height: SIZE + 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 6,
    borderColor: '#8D6E63', // Premium wooden finish border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 15,
    elevation: 12,
  },
  board: {
    width: SIZE,
    height: SIZE,
    backgroundColor: CLASSIC_COLORS.boardBg,
    position: 'relative',
  },
  row: { flexDirection: 'row', height: CELL },
  cell: {
    width: CELL,
    height: CELL,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  safeCell: {
    borderColor: 'rgba(0,0,0,0.1)',
  },
  star: { fontSize: CELL * 0.5, lineHeight: CELL * 0.52 },
  homeBaseOverlay: {
    position: 'absolute',
    borderRadius: 2,
    borderWidth: 2,
  },
  spawnCircle: {
    position: 'absolute',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerHomeContainer: {
    position: 'absolute',
    top: 6 * CELL,
    left: 6 * CELL,
    width: CELL * 3,
    height: CELL * 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: CLASSIC_COLORS.border,
  },
  trianglesPattern: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: CELL * 1.43,
    borderRightWidth: CELL * 1.43,
    borderTopWidth: CELL * 1.43,
    borderBottomWidth: CELL * 1.43,
    borderLeftColor: CLASSIC_COLORS.red,
    borderTopColor: CLASSIC_COLORS.blue,
    borderRightColor: CLASSIC_COLORS.green,
    borderBottomColor: CLASSIC_COLORS.yellow,
  },
  centerStarBox: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerStar: {
    fontSize: CELL * 0.7,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
});

export default LudoBoard;
