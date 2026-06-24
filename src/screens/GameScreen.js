import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  Alert, StatusBar, Dimensions, BackHandler,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { getSocket, emit, on, off } from '../services/socket';
import { playSound, toggleMusic, toggleSfx, isMusicEnabled, isSfxEnabled } from '../utils/sounds';
import {
  COLORS, GRADIENTS, SPACING, RADIUS, PLAYER_COLORS, BOARD, SCREEN,
} from '../utils/theme';
import {
  getMovablePieces, isSafeSquare, isStarSquare,
  MAIN_PATH_COORDS, HOME_COLUMN_COORDS, BASE_POSITIONS,
  COLOR_START, toAbsolute, getPathSteps,
} from '../utils/ludoEngine';
import LudoBoard from '../components/Board';
import DiceComponent from '../components/Dice';

const EMOJIS = ['😂', '😤', '🔥', '👏', '😱'];
const TURN_DURATION = 20;

const deduceRollValue = (startPiece, targetState, targetPos) => {
  if (startPiece.state === 'base' && targetState === 'on-board') return 6;
  if (startPiece.state === 'on-board') {
    if (targetState === 'on-board') return targetPos - startPiece.position;
    if (targetState === 'home-column') return (51 - startPiece.position) + targetPos + 1;
    if (targetState === 'home') return (51 - startPiece.position) + 5 + 1;
  }
  if (startPiece.state === 'home-column') {
    if (targetState === 'home-column') return targetPos - startPiece.position;
    if (targetState === 'home') return 5 - startPiece.position;
  }
  return 0;
};

const GameScreen = ({ route, navigation }) => {
  const { gameData } = route.params;
  const { user } = useAuth();

  const [gameState, setGameState] = useState(gameData.gameState);
  const [players, setPlayers] = useState(gameData.players);
  const [myColor, setMyColor] = useState(null);
  const [diceValue, setDiceValue] = useState(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [movablePieces, setMovablePieces] = useState([]);
  const [diceRolled, setDiceRolled] = useState(false);
  const [rollingDice, setRollingDice] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TURN_DURATION);
  const [opponentLeft, setOpponentLeft] = useState(null);
  const [emojiReactions, setEmojiReactions] = useState([]);
  const [lastKill, setLastKill] = useState(null);
  const [pieceAtHome, setPieceAtHome] = useState(null);
  const [disconnected, setDisconnected] = useState(false);
  const [timeoutCounts, setTimeoutCounts] = useState({ red: 0, blue: 0, green: 0, yellow: 0 });
  const [disqualifiedColors, setDisqualifiedColors] = useState([]);
  const [matchCountdown, setMatchCountdown] = useState(gameData.isWaitingToStart ? (gameData.countdownVal || 20) : 0);
  const [musicOn, setMusicOn] = useState(isMusicEnabled());
  const [sfxOn, setSfxOn] = useState(isSfxEnabled());

  const handleToggleMusic = () => setMusicOn(toggleMusic());
  const handleToggleSfx = () => setSfxOn(toggleSfx());

  const timerRef = useRef(null);
  const emojiTimeouts = useRef([]);
  const mountedRef = useRef(true);

  // ─── Mount / Unmount ─────────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    const myPlayer = gameData.players.find((p) => p.userId?.toString() === user?._id?.toString());
    if (myPlayer) setMyColor(myPlayer.color);

    setupSocketListeners();
    if (!gameData.isWaitingToStart) {
      startTurnTimer();
    }

    // Block back button during game
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      Alert.alert('Leave Game?', 'Leaving will forfeit the game.', [
        { text: 'Stay', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: () => navigation.replace('Main') },
      ]);
      return true;
    });

    return () => {
      mountedRef.current = false;
      backHandler.remove();
      clearTimer();
      removeSocketListeners();
    };
  }, []);

  // ─── Local Match Countdown Fallback ─────────────────────────────────────────
  useEffect(() => {
    let interval;
    if (matchCountdown > 0) {
      interval = setInterval(() => {
        setMatchCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            startTurnTimer();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [matchCountdown > 0, startTurnTimer]);

  // ─── Turn tracking ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!myColor || !gameState) return;
    const mine = gameState.currentTurn === myColor;
    setIsMyTurn(mine);
    setDiceRolled(gameState.diceRolled || false);
    if (gameState.diceRolled && gameState.diceValue) {
      setDiceValue(gameState.diceValue);
      setMovablePieces(getMovablePieces(gameState, myColor, gameState.diceValue));
    }
  }, [gameState, myColor]);

  // ─── Timer ───────────────────────────────────────────────────────────────────
  const startTurnTimer = useCallback(() => {
    clearTimer();
    setTimeLeft(TURN_DURATION);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearTimer(); return 0; }
        if (t === 6) playSound('countdown');
        return t - 1;
      });
    }, 1000);
  }, []);

  const clearTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  // ─── Socket listeners ─────────────────────────────────────────────────────────
  const setupSocketListeners = () => {
    const socket = getSocket();
    if (!socket) return;

    socket.on('dice_result', ({ color, dice, movablePieces: mp, autoRolled }) => {
      if (!mountedRef.current) return;
      setDiceValue(dice);
      setDiceRolled(true);
      setRollingDice(false);
      setMovablePieces(mp || []);
      playSound('dice');
      setGameState((prev) => ({ ...prev, diceValue: dice, diceRolled: true }));
    });

    socket.on('piece_moved', ({ color, pieceId, newState, newPosition, toPos, autoMove }) => {
      if (!mountedRef.current) return;

      setGameState((prev) => {
        if (!prev) return prev;
        const pieceEntry = prev.pieces.find((entry) => entry.color === color);
        const startPiece = pieceEntry?.pieces.find((p) => p.id === pieceId);

        if (!startPiece) return prev;

        const roll = deduceRollValue(startPiece, newState, newPosition);
        const steps = getPathSteps(color, startPiece, roll);

        if (steps.length === 0) {
          // Fallback if no steps: set target immediately
          const pieces = prev.pieces.map((entry) => {
            if (entry.color !== color) return entry;
            return {
              ...entry,
              pieces: entry.pieces.map((p) =>
                p.id === pieceId
                  ? { ...p, state: newState, position: newPosition, absolutePos: toPos }
                  : p
              )
            };
          });
          return { ...prev, pieces };
        }

        // Animate step-by-step
        let stepIndex = 0;
        const runStep = () => {
          if (!mountedRef.current) return;
          if (stepIndex >= steps.length) {
            // Animation finished. Set final state exactly to make sure it matches server
            setGameState((state) => {
              if (!state) return state;
              const pieces = state.pieces.map((entry) => {
                if (entry.color !== color) return entry;
                return {
                  ...entry,
                  pieces: entry.pieces.map((p) =>
                    p.id === pieceId
                      ? { ...p, state: newState, position: newPosition, absolutePos: toPos }
                      : p
                  )
                };
              });
              return { ...state, pieces };
            });
            return;
          }

          const targetStep = steps[stepIndex];
          playSound('move');

          setGameState((state) => {
            if (!state) return state;
            const pieces = state.pieces.map((entry) => {
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
                })
              };
            });
            return { ...state, pieces };
          });

          stepIndex++;
          setTimeout(runStep, 150);
        };

        // Start path animation
        setTimeout(runStep, 0);

        return prev; // Return prev immediately so the first state update handles the loop asynchronously
      });
    });

    socket.on('piece_killed', ({ killerColor, killedColor, killedPieceId }) => {
      if (!mountedRef.current) return;
      playSound('kill');
      setLastKill({ killer: killerColor, victim: killedColor });
      setTimeout(() => setLastKill(null), 2500);
      setGameState((prev) => {
        if (!prev) return prev;
        const pieces = prev.pieces.map((entry) => {
          if (entry.color !== killedColor) return entry;
          return {
            ...entry,
            pieces: entry.pieces.map((p) =>
              p.id === killedPieceId
                ? { ...p, state: 'base', position: -1, absolutePos: -1 }
                : p,
            ),
          };
        });
        return { ...prev, pieces };
      });
    });

    socket.on('piece_home', ({ color, pieceId }) => {
      if (!mountedRef.current) return;
      playSound('home');
      setPieceAtHome({ color, pieceId });
      setTimeout(() => setPieceAtHome(null), 2000);
    });

    socket.on('turn_change', ({ currentTurn, extraTurn, reason }) => {
      if (!mountedRef.current) return;
      setGameState((prev) => ({
        ...prev,
        currentTurn,
        diceRolled: false,
        diceValue: null,
      }));
      setDiceValue(null);
      setDiceRolled(false);
      setMovablePieces([]);
      setRollingDice(false);
      startTurnTimer();
    });

    socket.on('game_over', (result) => {
      if (!mountedRef.current) return;
      clearTimer();
      const isWinner = result.winner.userId?.toString() === user?._id?.toString();
      playSound(isWinner ? 'win' : 'lose');
      navigation.replace('Result', { result, gameData });
    });

    socket.on('receive_emoji', ({ userId, emoji }) => {
      if (!mountedRef.current) return;
      const id = Date.now();
      setEmojiReactions((prev) => [...prev.slice(-4), { id, emoji, userId }]);
      const t = setTimeout(() => {
        setEmojiReactions((prev) => prev.filter((e) => e.id !== id));
      }, 3000);
      emojiTimeouts.current.push(t);
    });

    socket.on('opponent_left', ({ userId, color, name }) => {
      if (!mountedRef.current) return;
      setOpponentLeft({ name, color });
    });

    socket.on('opponent_reconnected', ({ userId, color }) => {
      if (!mountedRef.current) return;
      setOpponentLeft(null);
    });

    socket.on('turn_timeout', ({ color, timeoutCount }) => {
      if (!mountedRef.current) return;
      setTimeoutCounts((prev) => ({ ...prev, [color]: timeoutCount }));
    });

    socket.on('player_disqualified', ({ color }) => {
      if (!mountedRef.current) return;
      setDisqualifiedColors((prev) => [...prev, color]);
      const name = color === 'red' ? 'You' : players.find((p) => p.color === color)?.name || color;
      Alert.alert('Disqualified 🚫', `${name} missed 3 turns and was disqualified.`);
    });

    socket.on('disconnect', () => {
      if (!mountedRef.current) return;
      setDisconnected(true);
    });

    socket.on('connect', () => {
      if (!mountedRef.current) return;
      setDisconnected(false);
      // Attempt to rejoin
      emit('reconnect_game', { gameId: gameData.gameId });
    });

    socket.on('match_countdown', ({ seconds }) => {
      if (!mountedRef.current) return;
      setMatchCountdown(seconds);
    });

    socket.on('match_started', () => {
      if (!mountedRef.current) return;
      setMatchCountdown(0);
      startTurnTimer();
    });

    socket.on('dice_roll_start', ({ color }) => {
      if (!mountedRef.current) return;
      playSound('dice');
      Vibration.vibrate(50);
      setRollingDice(true);
    });

    socket.on('game_state_update', ({ gameId, gameState: updatedState, players: updatedPlayers }) => {
      if (!mountedRef.current) return;
      setGameState(updatedState);
      if (updatedPlayers) setPlayers(updatedPlayers);
      setRollingDice(false);
    });

    socket.on('error_event', ({ message }) => {
      if (!mountedRef.current) return;
      setRollingDice(false);
      Alert.alert('Game Error', message);
    });
  };

  const removeSocketListeners = () => {
    const socket = getSocket();
    if (!socket) return;
    ['dice_result', 'piece_moved', 'piece_killed', 'piece_home', 'turn_change',
      'game_over', 'receive_emoji', 'opponent_left', 'opponent_reconnected',
      'turn_timeout', 'player_disqualified', 'match_countdown', 'match_started',
      'dice_roll_start', 'game_state_update', 'error_event'].forEach(
      (evt) => socket.off(evt),
    );
    emojiTimeouts.current.forEach(clearTimeout);
  };

  // ─── Handlers ─────────────────────────────────────────────────────────────────
  const handleRollDice = () => {
    if (!isMyTurn || diceRolled || rollingDice) return;
    setRollingDice(true);
    emit('roll_dice', { gameId: gameData.gameId });
  };

  const handlePiecePress = (color, pieceId) => {
    if (!isMyTurn || !diceRolled || color !== myColor) return;
    if (!movablePieces.includes(pieceId)) return;
    emit('move_piece', { gameId: gameData.gameId, pieceId });
    setMovablePieces([]);
  };

  const handleEmoji = (emoji) => {
    emit('send_emoji', { gameId: gameData.gameId, emoji });
  };

  // ─── Render helpers ────────────────────────────────────────────────────────────
  const currentPlayer = players.find((p) => p.color === gameState?.currentTurn);
  const timerColor = timeLeft <= 10 ? COLORS.error : timeLeft <= 20 ? COLORS.warning : COLORS.green;

  const redPlayer = players.find((p) => p.color === 'red');
  const bluePlayer = players.find((p) => p.color === 'blue');
  const greenPlayer = players.find((p) => p.color === 'green');
  const yellowPlayer = players.find((p) => p.color === 'yellow');

  const renderPlayerProfile = (player, color, diceComponent = null) => {
    if (!player) {
      return (
        <View style={[styles.playerProfile, styles.profileInactive]}>
          <View style={styles.profileRow}>
            <View style={[styles.avatarMini, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
              <Text style={styles.avatarTextMini}>+</Text>
            </View>
            <View style={styles.diceBox} />
          </View>
          <Text style={[styles.playerNameText, { color: COLORS.textMuted }]}>Waiting...</Text>
        </View>
      );
    }

    const isDisqualified = disqualifiedColors.includes(color);
    const isActive = gameState?.currentTurn === color && !isDisqualified;
    const isMe = player.userId?.toString() === user?._id?.toString();
    const activeBg = color === 'red' ? 'rgba(211,47,47,0.15)' : color === 'blue' ? 'rgba(25,118,210,0.15)' : color === 'green' ? 'rgba(56,142,60,0.15)' : 'rgba(251,192,45,0.15)';
    const borderStyle = isActive ? { borderColor: PLAYER_COLORS[color]?.primary, backgroundColor: activeBg } : {};
    const opacityStyle = isDisqualified ? { opacity: 0.35 } : {};

    return (
      <View style={[styles.playerProfile, borderStyle, opacityStyle]}>
        <View style={styles.profileRow}>
          <View style={[styles.avatarMini, { backgroundColor: PLAYER_COLORS[color]?.primary }]}>
            <Text style={styles.avatarTextMini}>
              {isDisqualified ? '🚫' : (color === 'red' ? '🔴' : color === 'blue' ? '🔵' : color === 'green' ? '🟢' : '🟡')}
            </Text>
          </View>
          {!isDisqualified && diceComponent}
        </View>
        <Text style={[styles.playerNameText, isDisqualified && { textDecorationLine: 'line-through', color: COLORS.textMuted }]} numberOfLines={1}>
          {isMe ? 'You' : player.name.split(' ')[0]}
        </Text>
        {!isDisqualified && (
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
        )}
      </View>
    );
  };

  const renderDiceSlot = (player, color) => {
    const isActive = gameState?.currentTurn === color;
    const hasPlayer = !!player;

    if (!hasPlayer) return null;

    return (
      <View style={styles.diceBox}>
        <View 
          style={{ opacity: isActive ? 1 : 0 }}
          pointerEvents={isActive ? 'auto' : 'none'}
        >
          <DiceComponent
            value={isActive ? diceValue : null}
            rolling={isActive && rollingDice}
            onPress={handleRollDice}
            disabled={myColor !== color || diceRolled}
            size={36}
          />
        </View>
      </View>
    );
  };

  return (
    <LinearGradient colors={GRADIENTS.background} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Top bar: prize pool + timer */}
      <View style={styles.topBar}>
        <View style={styles.prizeChip}>
          <Text style={styles.prizeEmoji}>🏆</Text>
          <Text style={styles.prizeText}>₹{gameData.prizePool}</Text>
        </View>

        <View style={styles.turnInfo}>
          <View style={[styles.turnDot, { backgroundColor: PLAYER_COLORS[gameState?.currentTurn]?.primary || COLORS.white }]} />
          <Text style={styles.turnText}>
            {isMyTurn ? 'Your Turn' : `${currentPlayer?.name || '?'}'s Turn`}
          </Text>
        </View>

        <View style={styles.topRightControls}>
          <View style={[styles.timerChip, { borderColor: timerColor }]}>
            <Text style={[styles.timerText, { color: timerColor }]}>{timeLeft}s</Text>
          </View>
          <TouchableOpacity onPress={handleToggleMusic} style={styles.soundToggleBtn}>
            <Text style={styles.soundToggleText}>{musicOn ? '🎵' : '🔇'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleToggleSfx} style={styles.soundToggleBtn}>
            <Text style={styles.soundToggleText}>{sfxOn ? '🔊' : '🔈'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Kill / home notification banners */}
      {lastKill && (
        <View style={styles.killBanner}>
          <Text style={styles.killBannerText}>
            💀 {lastKill.killer}'s piece killed {lastKill.victim}!
          </Text>
        </View>
      )}
      {pieceAtHome && (
        <View style={styles.homeBanner}>
          <Text style={styles.homeBannerText}>
            🏠 {pieceAtHome.color} piece reached HOME! 🎉
          </Text>
        </View>
      )}
      {opponentLeft && (
        <View style={styles.disconnectBanner}>
          <Text style={styles.disconnectBannerText}>
            ⚠️ {opponentLeft.name} disconnected — waiting 60s...
          </Text>
        </View>
      )}
      {disconnected && (
        <View style={styles.disconnectBanner}>
          <Text style={styles.disconnectBannerText}>⚠️ Reconnecting...</Text>
        </View>
      )}

      <View style={styles.gameContainer}>
        {/* Top Player Row: Red (Left) and Blue (Right) */}
        <View style={styles.topPlayerRow}>
          {renderPlayerProfile(redPlayer, 'red', renderDiceSlot(redPlayer, 'red'))}
          {renderPlayerProfile(bluePlayer, 'blue', renderDiceSlot(bluePlayer, 'blue'))}
        </View>

        {/* Ludo Board */}
        <View style={styles.boardContainer}>
          <LudoBoard
            gameState={gameState}
            players={players}
            myColor={myColor}
            movablePieces={movablePieces}
            onPiecePress={handlePiecePress}
          />
        </View>

        {/* Bottom Player Row: Yellow (Left) and Green (Right) */}
        <View style={styles.bottomPlayerRow}>
          {renderPlayerProfile(yellowPlayer, 'yellow', renderDiceSlot(yellowPlayer, 'yellow'))}
          {renderPlayerProfile(greenPlayer, 'green', renderDiceSlot(greenPlayer, 'green'))}
        </View>
      </View>

      {/* Bottom controls / Emojis */}
      <View style={styles.bottomControls}>
        <View style={styles.emojiBar}>
          {EMOJIS.map((e) => (
            <TouchableOpacity key={e} style={styles.emojiBtn} onPress={() => handleEmoji(e)}>
              <Text style={styles.emoji}>{e}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Emoji reactions overlay */}
        <View style={styles.emojiReactions} pointerEvents="none">
          {emojiReactions.map((r) => (
            <EmojiReaction key={r.id} emoji={r.emoji} />
          ))}
        </View>
      </View>

      {matchCountdown > 0 && (
        <View style={styles.countdownOverlay} pointerEvents="auto">
          <LinearGradient colors={['rgba(11, 27, 61, 0.95)', 'rgba(28, 61, 125, 0.95)']} style={styles.countdownContent}>
            <Text style={styles.countdownTitle}>🎯 MATCH FOUND!</Text>
            <Text style={styles.countdownSubtitle}>Get ready to play</Text>
            <View style={styles.countdownCircle}>
              <Text style={styles.countdownNumber}>{matchCountdown}</Text>
            </View>
            <Text style={styles.countdownFooter}>Starting match...</Text>
          </LinearGradient>
        </View>
      )}
    </LinearGradient>
  );
};

// Floating emoji animation component
const EmojiReaction = ({ emoji }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 1800, useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.Text
      style={[
        styles.floatingEmoji,
        {
          opacity: anim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -80] }) },
          ],
        },
      ]}
    >
      {emoji}
    </Animated.Text>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    paddingTop: SPACING.md + 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 255, 163, 0.15)',
    backgroundColor: 'rgba(12, 22, 17, 0.6)',
  },
  prizeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 255, 163, 0.12)',
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 163, 0.3)',
  },
  prizeEmoji: { fontSize: 11 },
  prizeText: { color: COLORS.gold, fontWeight: '900', fontSize: 11 },
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
  topRightControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  soundToggleBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soundToggleText: { fontSize: 14 },
  killBanner: {
    backgroundColor: 'rgba(255,68,68,0.85)',
    padding: SPACING.sm,
    alignItems: 'center',
  },
  killBannerText: { color: COLORS.white, fontWeight: '700', fontSize: 10 },
  homeBanner: {
    backgroundColor: 'rgba(68,221,136,0.85)',
    padding: SPACING.sm,
    alignItems: 'center',
  },
  homeBannerText: { color: COLORS.background, fontWeight: '700', fontSize: 10 },
  disconnectBanner: {
    backgroundColor: 'rgba(255,165,0,0.85)',
    padding: SPACING.sm,
    alignItems: 'center',
  },
  disconnectBannerText: { color: COLORS.background, fontWeight: '700', fontSize: 10 },
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
  profileInactive: {
    opacity: 0.4,
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
  bottomControls: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    alignItems: 'center',
  },
  emojiBar: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  emojiBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 16 },
  emojiReactions: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    width: 50,
  },
  floatingEmoji: { fontSize: 24, textAlign: 'center', marginBottom: 4 },
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
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    zIndex: 9999,
  },
  countdownContent: {
    paddingHorizontal: 32,
    paddingVertical: 40,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 215, 0, 0.4)',
    alignItems: 'center',
    width: '80%',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  countdownTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFD700',
    letterSpacing: 1,
    marginBottom: 6,
  },
  countdownSubtitle: {
    fontSize: 12,
    color: '#E0E0E0',
    marginBottom: 24,
    fontWeight: '500',
  },
  countdownCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    marginBottom: 24,
  },
  countdownNumber: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFD700',
  },
  countdownFooter: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8A9DBE',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});

export default GameScreen;
