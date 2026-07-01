import React, { useMemo, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, Animated } from 'react-native';
import { BOARD, COLORS, PLAYER_COLORS } from '../utils/theme';
import {
  MAIN_PATH_COORDS, HOME_COLUMN_COORDS, BASE_POSITIONS,
  SAFE_SQUARES, STAR_SQUARES, COLOR_START,
} from '../utils/ludoEngine';
import Piece3D from './Piece3D';
import { playSound } from '../utils/sounds';

// Vibrant Zupee-style Ludo Colors
const CLASSIC_COLORS = {
  red: '#F44336',    // Bright Red
  blue: '#2196F3',   // Bright Blue
  green: '#4CAF50',  // Bright Green
  yellow: '#FFEB3B', // Bright Yellow
  boardBg: '#Fdfdfd', // Clean white background
  border: '#E0E0E0',  // Soft separator lines
  safe: '#F5F5F5',    // Distinct safe square background
};

// Home base quadrant positions [row, col]
const HOME_BASES = {
  red:    { row: 0, col: 0 },
  blue:   { row: 0, col: 9 },
  green:  { row: 9, col: 9 },
  yellow: { row: 9, col: 0 },
};

const AnimatedPieceWrapper = ({ top, left, zIndex, children }) => {
  const animTop = useRef(new Animated.Value(top)).current;
  const animLeft = useRef(new Animated.Value(left)).current;
  const animScale = useRef(new Animated.Value(1)).current;
  const isFirstMount = useRef(true);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    
    // Smooth hopping animation (physical 3D jump)
    Animated.parallel([
      Animated.timing(animTop, { toValue: top, useNativeDriver: false, duration: 100 }),
      Animated.timing(animLeft, { toValue: left, useNativeDriver: false, duration: 100 }),
      Animated.sequence([
        Animated.timing(animScale, { toValue: 1.3, useNativeDriver: false, duration: 50 }),
        Animated.timing(animScale, { toValue: 1, useNativeDriver: false, duration: 50 }),
      ])
    ]).start();
  }, [top, left]);

  return (
    <Animated.View 
      pointerEvents="box-none"
      style={{ 
        position: 'absolute', 
        top: animTop, 
        left: animLeft, 
        zIndex,
        transform: [{ scale: animScale }]
      }}
    >
      {children}
    </Animated.View>
  );
};

const StaticGrid = React.memo(() => {
  const renderCell = (row, col) => {
    const key = `${row}_${col}`;
    const absPos = MAIN_PATH_COORDS.findIndex(([r, c]) => r === row && c === col);

    let isPathCell = absPos !== -1;
    let isSafe = absPos !== -1 && SAFE_SQUARES.has(absPos);
    let isStar = absPos !== -1 && STAR_SQUARES.has(absPos);

    let bgColor = CLASSIC_COLORS.boardBg;

    if (isPathCell) {
      bgColor = '#FFFFFF';
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

    // Safe squares get a distinct tint
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
        {isSafe && !isStar && bgColor === CLASSIC_COLORS.safe && (
          <View style={styles.shieldIcon}>
            <Text style={{ fontSize: BOARD.cellSize * 0.4 }}>🛡️</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <>
      {Array.from({ length: 15 }, (_, row) => (
        <View key={row} style={styles.row}>
          {Array.from({ length: 15 }, (_, col) => renderCell(row, col))}
        </View>
      ))}
    </>
  );
});

const StaticBases = React.memo(() => (
  <>
    {Object.entries(HOME_BASES).map(([color, config]) => (
      <View
        key={color}
        style={[
          styles.homeBaseOverlay,
          {
            top: config.row * BOARD.cellSize,
            left: config.col * BOARD.cellSize,
            width: BOARD.cellSize * 6,
            height: BOARD.cellSize * 6,
            backgroundColor: CLASSIC_COLORS[color],
          },
        ]}
      >
        {/* 4 bright spawn circles directly on the solid base */}
        {BASE_POSITIONS[color].map(([r, c], i) => {
          // Centered positions inside the 6x6 square
          const spawnOffsets = [
            { top: 1.2, left: 1.2 },
            { top: 1.2, left: 3.6 },
            { top: 3.6, left: 1.2 },
            { top: 3.6, left: 3.6 },
          ];
          const relRow = spawnOffsets[i].top;
          const relCol = spawnOffsets[i].left;
          const circleSize = BOARD.cellSize * 1.2;
          return (
            <View
              key={i}
              style={[
                styles.spawnCircle,
                {
                  top: relRow * BOARD.cellSize,
                  left: relCol * BOARD.cellSize,
                  width: circleSize,
                  height: circleSize,
                  borderRadius: circleSize / 2,
                },
              ]}
            >
              <View
                style={{
                  width: BOARD.cellSize * 0.5,
                  height: BOARD.cellSize * 0.5,
                  borderRadius: (BOARD.cellSize * 0.5) / 2,
                  backgroundColor: CLASSIC_COLORS[color],
                  opacity: 0.15,
                }}
              />
            </View>
          );
        })}
      </View>
    ))}
  </>
));

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
    if (!movablePieces || movablePieces.color !== color) return false;
    const ids = (movablePieces.pieces || []).map(Number);
    return ids.includes(Number(pieceId));
  };

  return (
    <View style={styles.boardWrapper}>
      {/* 15×15 grid */}
      <View style={styles.board}>
        <StaticGrid />

        {/* Center Home Triangles (Classic diagonal partition) */}
        <View style={styles.centerHomeContainer}>
          <View style={styles.trianglesPattern} />
          <View style={styles.centerStarBox}>
            <Text style={styles.centerStar}>👑</Text>
          </View>
        </View>

        {/* Solid Color Base Quadrants (Zupee Style) */}
        <StaticBases />

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
              { top: 1.2, left: 1.2 },
              { top: 1.2, left: 3.6 },
              { top: 3.6, left: 1.2 },
              { top: 3.6, left: 3.6 },
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
            const size = isBase ? BOARD.cellSize * 0.72 : BOARD.cellSize * 0.68;
            const centeredOffset = isBase ? (BOARD.cellSize * 1.2 - size) / 2 : (BOARD.cellSize - size) / 2;
            const topOffset = isBase ? centeredOffset - BOARD.cellSize * 0.06 : centeredOffset - BOARD.cellSize * 0.04;
            
            return (
              <React.Fragment key={posKey}>
                <AnimatedPieceWrapper 
                  top={r * BOARD.cellSize + topOffset - 20} 
                  left={c * BOARD.cellSize + centeredOffset - 20} 
                  zIndex={200}
                >
                  <Piece3D
                    color={p.color}
                    pieceId={p.pieceId}
                    selected={isMovable(p.color, p.pieceId)}
                    onPress={() => onPiecePress(p.color, p.pieceId)}
                    size={size}
                  />
                </AnimatedPieceWrapper>
              </React.Fragment>
            );
          } else {
            // Stack multiple pieces in the same cell
            return (
              <React.Fragment key={posKey}>
                {pieces.map((p, idx) => {
                  const offset = idx * BOARD.cellSize * 0.12;
                  const size = BOARD.cellSize * 0.48;
                  const cellWidth = isBase ? BOARD.cellSize * 1.2 : BOARD.cellSize;
                  const centeredOffset = (cellWidth - size) / 2;
                  return (
                    <AnimatedPieceWrapper 
                      key={`${p.color}_${p.pieceId}`}
                      top={r * BOARD.cellSize + centeredOffset + offset - (isBase ? BOARD.cellSize * 0.06 : BOARD.cellSize * 0.04) - 20}
                      left={c * BOARD.cellSize + centeredOffset + offset - 20}
                      zIndex={200 + idx}
                    >
                      <Piece3D
                        color={p.color}
                        pieceId={p.pieceId}
                        selected={isMovable(p.color, p.pieceId)}
                        onPress={() => onPiecePress(p.color, p.pieceId)}
                        size={size}
                      />
                    </AnimatedPieceWrapper>
                  );
                })}
              </React.Fragment>
            );
          }
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  boardWrapper: {
    width: BOARD.size + 12,
    height: BOARD.size + 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 6,
    borderColor: '#4E342E', // Dark premium wooden border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 12,
  },
  board: {
    width: BOARD.size,
    height: BOARD.size,
    backgroundColor: CLASSIC_COLORS.boardBg,
    position: 'relative',
  },
  row: { flexDirection: 'row', height: BOARD.cellSize },
  cell: {
    width: BOARD.cellSize,
    height: BOARD.cellSize,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeCell: {
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.15)',
  },
  shieldIcon: {
    position: 'absolute',
    opacity: 0.6,
  },
  star: { fontSize: BOARD.cellSize * 0.5, lineHeight: BOARD.cellSize * 0.52 },
  homeBaseOverlay: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.2)', // Sleek border for bases
  },
  spawnCircle: {
    position: 'absolute',
    backgroundColor: '#FFFFFF', // Bright white spawn platform
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  centerHomeContainer: {
    position: 'absolute',
    top: 6 * BOARD.cellSize,
    left: 6 * BOARD.cellSize,
    width: BOARD.cellSize * 3,
    height: BOARD.cellSize * 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: CLASSIC_COLORS.border,
  },
  trianglesPattern: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: BOARD.cellSize * 1.43,
    borderRightWidth: BOARD.cellSize * 1.43,
    borderTopWidth: BOARD.cellSize * 1.43,
    borderBottomWidth: BOARD.cellSize * 1.43,
    borderLeftColor: CLASSIC_COLORS.red,
    borderTopColor: CLASSIC_COLORS.blue,
    borderRightColor: CLASSIC_COLORS.green,
    borderBottomColor: CLASSIC_COLORS.yellow,
  },
  centerStarBox: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    width: BOARD.cellSize * 1.2,
    height: BOARD.cellSize * 1.2,
    borderRadius: BOARD.cellSize * 0.6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  centerStar: {
    fontSize: BOARD.cellSize * 0.7,
  },
});

export default LudoBoard;
