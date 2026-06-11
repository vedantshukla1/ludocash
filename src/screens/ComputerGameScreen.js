import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  Alert, StatusBar, BackHandler, ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { playSound } from '../utils/sounds';
import {
  COLORS, GRADIENTS, SPACING, RADIUS, PLAYER_COLORS, SHADOWS,
} from '../utils/theme';
import {
  getMovablePieces, calculateNewPosition, isSafeSquare, COLORS_ORDER,
  toAbsolute, COLOR_START, getPathSteps,
} from '../utils/ludoEngine';
import LudoBoard from '../components/Board';
import DiceComponent from '../components/Dice';

const INITIAL_PIECES = (color) => [
  { id: 0, state: 'base', position: -1, absolutePos: -1 },
  { id: 1, state: 'base', position: -1, absolutePos: -1 },
  { id: 2, state: 'base', position: -1, absolutePos: -1 },
  { id: 3, state: 'base', position: -1, absolutePos: -1 },
];

const ComputerGameScreen = ({ route, navigation }) => {
  const { user } = useAuth();
  const { playersCount = 2 } = route.params || {};

  const activeColors = React.useMemo(() => {
    if (playersCount === 2) return ['red', 'green'];
    if (playersCount === 3) return ['red', 'blue', 'green'];
    return ['red', 'blue', 'green', 'yellow'];
  }, [playersCount]);

  const getNextTurnColor = (currentColor) => {
    const idx = activeColors.indexOf(currentColor);
    return activeColors[(idx + 1) % activeColors.length];
  };

  const [players] = useState(() => {
    const list = [
      { userId: user?._id || 'player', name: user?.name || 'Player', color: 'red' },
    ];
    if (playersCount === 2) {
      list.push({ userId: 'computer_green', name: 'Computer 🤖', color: 'green' });
    } else if (playersCount === 3) {
      list.push({ userId: 'computer_blue', name: 'Computer 1 🤖', color: 'blue' });
      list.push({ userId: 'computer_green', name: 'Computer 2 🤖', color: 'green' });
    } else {
      list.push({ userId: 'computer_blue', name: 'Computer 1 🤖', color: 'blue' });
      list.push({ userId: 'computer_green', name: 'Computer 2 🤖', color: 'green' });
      list.push({ userId: 'computer_yellow', name: 'Computer 3 🤖', color: 'yellow' });
    }
    return list;
  });

  const [gameState, setGameState] = useState(() => ({
    currentTurn: 'red',
    diceRolled: false,
    diceValue: null,
    pieces: activeColors.map((color) => ({
      color,
      pieces: INITIAL_PIECES(color),
    })),
  }));

  const gameStateRef = useRef(gameState);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const [rolling, setRolling] = useState(false);
  const [movablePieces, setMovablePieces] = useState([]);
  const [winner, setWinner] = useState(null);
  const [timeLeft, setTimeLeft] = useState(20);
  const [timeoutCounts, setTimeoutCounts] = useState({ red: 0, blue: 0, green: 0, yellow: 0 });

  const turnTimerRef = useRef(null);
  const playTimerRef = useRef(null);

  // ─── Turn Timer Countdown ─────────────────────────────────────────────────────
  useEffect(() => {
    setTimeLeft(20);

    if (playTimerRef.current) {
      clearInterval(playTimerRef.current);
      playTimerRef.current = null;
    }

    if (winner) return;

    playTimerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(playTimerRef.current);
          playTimerRef.current = null;
          handlePlayerTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (playTimerRef.current) {
        clearInterval(playTimerRef.current);
        playTimerRef.current = null;
      }
    };
  }, [gameState.currentTurn, winner]);

  // ─── Hardware Back Trigger ───────────────────────────────────────────────────
  useEffect(() => {
    const backAction = () => {
      Alert.alert('Quit Game', 'Are you sure you want to quit this practice game?', [
        { text: 'Stay', style: 'cancel' },
        { text: 'Quit', style: 'destructive', onPress: () => navigation.replace('Main') },
      ]);
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => {
      backHandler.remove();
      if (turnTimerRef.current) clearTimeout(turnTimerRef.current);
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, []);

  // ─── Trigger Computer Move ───────────────────────────────────────────────────
  useEffect(() => {
    if (gameState.currentTurn !== 'red' && !gameState.diceRolled && !winner) {
      if (turnTimerRef.current) clearTimeout(turnTimerRef.current);
      turnTimerRef.current = setTimeout(handleComputerTurn, 1500);
    } else {
      if (turnTimerRef.current) {
        clearTimeout(turnTimerRef.current);
        turnTimerRef.current = null;
      }
    }
  }, [gameState.currentTurn, gameState.diceRolled, winner]);

  // Check victory condition
  const checkVictory = (state) => {
    for (const entry of state.pieces) {
      const allHome = entry.pieces.every((p) => p.state === 'home');
      if (allHome) {
        setWinner(entry.color);
        playSound(entry.color === 'red' ? 'win' : 'lose');
        const winnerName = players.find((p) => p.color === entry.color)?.name || 'Player';
        Alert.alert(
          entry.color === 'red' ? 'Victory! 🎉' : 'Game Over 🤖',
          entry.color === 'red' ? 'You defeated the computer!' : `${winnerName} won this time.`,
          [{ text: 'Exit to Lobby', onPress: () => navigation.replace('Main') }]
        );
        return true;
      }
    }
    return false;
  };

  // Switch Turn
  const passTurn = (nextTurnColor) => {
    setGameState((prev) => ({
      ...prev,
      currentTurn: nextTurnColor,
      diceRolled: false,
      diceValue: null,
    }));
    setMovablePieces([]);
  };

  // Roll Dice (User)
  const rollDice = () => {
    if (gameStateRef.current.currentTurn !== 'red' || gameStateRef.current.diceRolled || rolling) return;
    setRolling(true);
    playSound('dice');

    setTimeout(() => {
      // Safety check: verify it is still red's turn when the roll resolves
      if (gameStateRef.current.currentTurn !== 'red') {
        setRolling(false);
        return;
      }
      const roll = Math.floor(Math.random() * 6) + 1;
      const validMoves = getMovablePieces(
        { pieces: gameStateRef.current.pieces },
        'red',
        roll
      );

      setRolling(false);
      setGameState((prev) => ({
        ...prev,
        diceValue: roll,
        diceRolled: true,
      }));

      if (validMoves.length === 0) {
        // No moves -> Pass turn
        setTimeout(() => passTurn(getNextTurnColor('red')), 1200);
      } else {
        setMovablePieces(validMoves);
      }
    }, 600);
  };

  // Move Piece (User)
  const handlePiecePress = (color, pieceId) => {
    if (gameStateRef.current.currentTurn !== 'red' || color !== 'red') return;
    if (!movablePieces.includes(pieceId)) return;

    movePiece('red', pieceId, gameStateRef.current.diceValue);
  };

  // Ludo Move Logic (shared)
  const movePiece = (color, pieceId, roll) => {
    setMovablePieces([]);

    const piece = gameStateRef.current.pieces
      .find((e) => e.color === color)
      .pieces.find((p) => p.id === pieceId);
    
    if (!piece) return;
    const steps = getPathSteps(color, piece, roll);
    if (steps.length === 0) return;

    const finalTarget = calculateNewPosition(color, piece, roll);
    if (!finalTarget) return;

    let stepIndex = 0;

    const runStep = () => {
      if (stepIndex >= steps.length) {
        // Animation complete! Execute final move logic
        let extraTurn = roll === 6;
        let didKill = false;

        setGameState((prev) => {
          const updatedPieces = prev.pieces.map((entry) => {
            if (entry.color !== color) return entry;
            return {
              ...entry,
              pieces: entry.pieces.map((p) => {
                if (p.id !== pieceId) return p;

                if (finalTarget.reachedHome) playSound('home');
                return {
                  ...p,
                  state: finalTarget.newState,
                  position: finalTarget.newPos,
                  absolutePos: finalTarget.absolutePos,
                };
              }),
            };
          });

          // Check for kills
          const movingPieceEntry = updatedPieces.find((e) => e.color === color);
          const movedPiece = movingPieceEntry.pieces.find((p) => p.id === pieceId);

          let finalPieces = updatedPieces;

          if (movedPiece.state === 'on-board' && !isSafeSquare(movedPiece.absolutePos)) {
            finalPieces = updatedPieces.map((entry) => {
              if (entry.color === color) return entry;
              return {
                ...entry,
                pieces: entry.pieces.map((oppPiece) => {
                  if (
                    oppPiece.state === 'on-board' &&
                    oppPiece.absolutePos === movedPiece.absolutePos
                  ) {
                    // Kill opponent piece!
                    didKill = true;
                    playSound('kill');
                    return { ...oppPiece, state: 'base', position: -1, absolutePos: -1 };
                  }
                  return oppPiece;
                }),
              };
            });
          }

          const newState = {
            ...prev,
            pieces: finalPieces,
            diceRolled: false,
            diceValue: null,
          };

          // Check win condition
          const won = checkVictory(newState);
          if (!won) {
            // Switch turn if no 6 rolled and no kill achieved
            const nextColor = (extraTurn || didKill) ? color : getNextTurnColor(color);
            setTimeout(() => passTurn(nextColor), 800);
          }

          return newState;
        });
        return;
      }

      const targetStep = steps[stepIndex];
      playSound('move');

      setGameState((prev) => {
        const pieces = prev.pieces.map((entry) => {
          if (entry.color !== color) return entry;
          return {
            ...entry,
            pieces: entry.pieces.map((p) => {
              if (p.id !== pieceId) return p;
              return {
                ...p,
                state: targetStep.state,
                position: targetStep.position,
                absolutePos: targetStep.absolutePos,
              };
            }),
          };
        });
        return { ...prev, pieces };
      });

      stepIndex++;
      setTimeout(runStep, 150);
    };

    runStep();
  };

  // Computer AI implementation
  const handleComputerTurn = () => {
    const botColor = gameStateRef.current.currentTurn;
    // Safety check: verify it is a computer's turn
    if (botColor === 'red' || winner) return;

    setRolling(true);
    playSound('dice');

    setTimeout(() => {
      // Safety check: verify it is still this bot's turn when the roll resolves
      if (gameStateRef.current.currentTurn !== botColor) {
        setRolling(false);
        return;
      }
      const roll = Math.floor(Math.random() * 6) + 1;
      setRolling(false);
      setGameState((prev) => ({ ...prev, diceValue: roll, diceRolled: true }));

      const validMoves = getMovablePieces(
        { pieces: gameStateRef.current.pieces },
        botColor,
        roll
      );

      if (validMoves.length === 0) {
        // Pass back to next player
        setTimeout(() => passTurn(getNextTurnColor(botColor)), 1200);
        return;
      }

      // Computer AI Choice Strategy
      let chosenPieceId = validMoves[0];

      // 1. Try to find a killing move
      const computerEntries = gameStateRef.current.pieces.find((e) => e.color === botColor);

      for (const pid of validMoves) {
        const piece = computerEntries.pieces.find((p) => p.id === pid);
        const target = calculateNewPosition(botColor, piece, roll);
        if (target && target.newState === 'on-board' && !isSafeSquare(target.absolutePos)) {
          let wouldKill = false;
          for (const otherColor of activeColors) {
            if (otherColor === botColor) continue;
            const otherEntries = gameStateRef.current.pieces.find((e) => e.color === otherColor);
            if (otherEntries && otherEntries.pieces.some(
              (up) => up.state === 'on-board' && up.absolutePos === target.absolutePos
            )) {
              wouldKill = true;
              break;
            }
          }
          if (wouldKill) {
            chosenPieceId = pid;
            break;
          }
        }
      }

      // 2. Try to spawn a piece out of base
      if (roll === 6 && chosenPieceId === validMoves[0]) {
        const basePiece = computerEntries.pieces.find(
          (p) => p.state === 'base' && validMoves.includes(p.id)
        );
        if (basePiece) chosenPieceId = basePiece.id;
      }

      // Perform move
      setTimeout(() => {
        // Safety check: verify it is still this bot's turn before moving
        if (gameStateRef.current.currentTurn !== botColor) return;
        movePiece(botColor, chosenPieceId, roll);
      }, 800);
    }, 600);
  };

  const handlePlayerTimeout = () => {
    const curColor = gameStateRef.current.currentTurn;
    
    setTimeoutCounts((prev) => {
      const nextCounts = { ...prev, [curColor]: prev[curColor] + 1 };
      
      if (nextCounts[curColor] >= 3) {
        if (curColor === 'red') {
          setWinner('computer_win');
          Alert.alert(
            'Game Over 🚫',
            'You missed 3 turns and lost the game.',
            [{ text: 'Exit to Lobby', onPress: () => navigation.replace('Main') }]
          );
        } else {
          Alert.alert('Disqualified 🚫', `${players.find(p => p.color === curColor)?.name || curColor} missed 3 turns and was disqualified.`);
          passTurn(getNextTurnColor(curColor));
        }
      } else {
        if (curColor === 'red') {
          autoRollAndMoveHuman();
        } else {
          passTurn(getNextTurnColor(curColor));
        }
      }
      return nextCounts;
    });
  };

  const autoRollAndMoveHuman = () => {
    setRolling(true);
    playSound('dice');

    setTimeout(() => {
      if (gameStateRef.current.currentTurn !== 'red') {
        setRolling(false);
        return;
      }
      const roll = Math.floor(Math.random() * 6) + 1;
      setRolling(false);
      setGameState((prev) => ({ ...prev, diceValue: roll, diceRolled: true }));

      const validMoves = getMovablePieces(
        { pieces: gameStateRef.current.pieces },
        'red',
        roll
      );

      if (validMoves.length === 0) {
        setTimeout(() => passTurn(getNextTurnColor('red')), 1200);
        return;
      }

      const chosenPieceId = validMoves[0];
      setTimeout(() => {
        if (gameStateRef.current.currentTurn !== 'red') return;
        movePiece('red', chosenPieceId, roll);
      }, 800);
    }, 600);
  };

  const isMyTurn = gameState.currentTurn === 'red';
  const timerColor = timeLeft <= 10 ? COLORS.error : timeLeft <= 20 ? COLORS.warning : COLORS.green;
  
  const redPlayer = players.find((p) => p.color === 'red');
  const bluePlayer = players.find((p) => p.color === 'blue');
  const greenPlayer = players.find((p) => p.color === 'green');
  const yellowPlayer = players.find((p) => p.color === 'yellow');

  const renderPlayerProfile = (player, color, diceComponent = null) => {
    if (!player) {
      return <View style={styles.emptyProfileBox} />;
    }

    const isActive = gameState.currentTurn === color;
    const isMe = color === 'red';
    const activeBg = color === 'red' ? 'rgba(211,47,47,0.15)' : color === 'blue' ? 'rgba(25,118,210,0.15)' : color === 'green' ? 'rgba(56,142,60,0.15)' : 'rgba(251,192,45,0.15)';
    
    // Choose profile border color
    let primaryBorder = 'transparent';
    if (color === 'red') primaryBorder = '#D32F2F';
    else if (color === 'blue') primaryBorder = '#1976D2';
    else if (color === 'green') primaryBorder = '#388E3C';
    else if (color === 'yellow') primaryBorder = '#FBC02D';

    const borderStyle = isActive ? { borderColor: primaryBorder, backgroundColor: activeBg } : {};

    return (
      <View style={[styles.playerProfile, borderStyle]}>
        <View style={styles.profileRow}>
          <View style={[styles.avatarMini, { backgroundColor: primaryBorder }]}>
            <Text style={styles.avatarTextMini}>
              {color === 'red' ? '🔴' : color === 'blue' ? '🔵' : color === 'green' ? '🟢' : '🟡'}
            </Text>
          </View>
          {diceComponent}
        </View>
        <Text style={styles.playerNameText} numberOfLines={1}>
          {isMe ? 'You' : player.name}
        </Text>
        <View style={styles.timeoutDotsRow}>
          {[0, 1, 2].map((idx) => {
            const isMissed = (timeoutCounts[color] || 0) > idx;
            return (
              <View
                key={idx}
                style={[
                  styles.timeoutDot,
                  isMissed ? styles.timeoutDotMissed : styles.timeoutDotActive,
                ]}
              />
            );
          })}
        </View>
      </View>
    );
  };

  const renderDiceSlot = (player, color, onPressHandler, isInteractive) => {
    const isActive = gameState.currentTurn === color;
    const hasPlayer = !!player;

    if (!hasPlayer) return null;

    return (
      <View style={styles.diceBox}>
        <View
          style={{ opacity: isActive ? 1 : 0 }}
          pointerEvents={isActive ? 'auto' : 'none'}
        >
          <DiceComponent
            value={isActive ? gameState.diceValue : null}
            rolling={isActive && rolling}
            onPress={onPressHandler}
            disabled={!isInteractive || gameState.diceRolled}
            size={36}
          />
        </View>
      </View>
    );
  };

  return (
    <LinearGradient colors={GRADIENTS.background} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => {
          Alert.alert('Quit Game', 'Quit this practice match?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Quit', style: 'destructive', onPress: () => navigation.replace('Main') }
          ]);
        }}>
          <Text style={styles.backBtn}>← Lobby</Text>
        </TouchableOpacity>
        
        <View style={styles.turnInfo}>
          <View style={[styles.turnDot, { backgroundColor: PLAYER_COLORS[gameState.currentTurn]?.primary || COLORS.white }]} />
          <Text style={styles.turnText}>
            {gameState.currentTurn === 'red' ? 'Your Turn' : `${players.find(p => p.color === gameState.currentTurn)?.name || 'Computer'}'s Turn`}
          </Text>
        </View>

        <View style={[styles.timerChip, { borderColor: timerColor }]}>
          <Text style={[styles.timerText, { color: timerColor }]}>{timeLeft}s</Text>
        </View>
      </View>

      <View style={styles.gameContainer}>
        {/* Top Player Row: Red (Left) and Blue (Right) */}
        <View style={styles.topPlayerRow}>
          {renderPlayerProfile(redPlayer, 'red', renderDiceSlot(redPlayer, 'red', rollDice, true))}
          {renderPlayerProfile(bluePlayer, 'blue', renderDiceSlot(bluePlayer, 'blue', () => {}, false))}
        </View>

        {/* Ludo Board */}
        <View style={styles.boardContainer}>
          <LudoBoard
            gameState={gameState}
            players={players}
            myColor="red"
            movablePieces={movablePieces}
            onPiecePress={handlePiecePress}
          />
        </View>

        {/* Bottom Player Row: Yellow (Left) and Green (Right) */}
        <View style={styles.bottomPlayerRow}>
          {renderPlayerProfile(yellowPlayer, 'yellow', renderDiceSlot(yellowPlayer, 'yellow', () => {}, false))}
          {renderPlayerProfile(greenPlayer, 'green', renderDiceSlot(greenPlayer, 'green', () => {}, false))}
        </View>
      </View>
    </LinearGradient>
  );
};

// Simple helper to avoid scope warnings
const practiceBadgeStyle = () => styles.practiceBadge;

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    paddingTop: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.25)',
    backgroundColor: 'rgba(11, 27, 61, 0.9)',
  },
  turnInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  turnDot: { width: 10, height: 10, borderRadius: 5 },
  turnText: { color: COLORS.white, fontWeight: '700', fontSize: 10 },
  timerChip: {
    width: 48,
    height: 32,
    borderRadius: RADIUS.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: { fontWeight: '900', fontSize: 11 },
  timeoutDotsRow: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeoutDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 0.8,
  },
  timeoutDotActive: {
    borderColor: 'rgba(255,255,255,0.4)',
    backgroundColor: 'transparent',
  },
  timeoutDotMissed: {
    borderColor: '#D50000',
    backgroundColor: '#D50000',
  },
  backBtn: { color: COLORS.gold, fontSize: 12, fontWeight: '700' },
  headerTitle: { color: COLORS.white, fontSize: 14, fontWeight: '800' },
  practiceBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.45)',
  },
  practiceText: { color: COLORS.gold, fontWeight: '900', fontSize: 9 },
  gameContainer: {
    flex: 1,
    padding: SPACING.md,
    justifyContent: 'center',
  },
  topPlayerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  bottomPlayerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  playerProfile: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1.5,
    borderColor: 'transparent',
    minWidth: 100,
    minHeight: 82,
  },
  emptyProfileBox: {
    minWidth: 100,
    minHeight: 82,
    backgroundColor: 'transparent',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  avatarMini: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  avatarTextMini: {
    color: COLORS.white,
    fontWeight: '900',
    fontSize: 12,
  },
  playerNameText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 11,
  },
  diceBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1.0,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boardContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xs,
  },
});

export default ComputerGameScreen;

