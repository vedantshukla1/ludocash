import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Alert, StatusBar, Dimensions, BackHandler, Image, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import CustomAlert from '../components/CustomAlert';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { getSocket, emit, on, off } from '../services/socket';
import { playSound, playVibration, toggleMusic, toggleSfx, isMusicEnabled, isSfxEnabled } from '../utils/sounds';
import { COLORS, GRADIENTS, SPACING, RADIUS, PLAYER_COLORS, BOARD, SCREEN } from '../utils/theme';
import { getMovablePieces, isSafeSquare, isStarSquare, MAIN_PATH_COORDS, HOME_COLUMN_COORDS, BASE_POSITIONS, COLOR_START, toAbsolute, getPathSteps } from '../utils/ludoEngine';
import LudoBoard from '../components/Board';
import Dice3D from '../components/Dice3D';
const EMOJIS = ['😂', '😤', '🔥', '👏', '😱'];
const TURN_DURATION = 20;
const deduceRollValue = (startPiece, targetState, targetPos) => {
  if (startPiece.state === 'base' && targetState === 'on-board') return 6;
  if (startPiece.state === 'on-board') {
    if (targetState === 'on-board') {
      let diff = targetPos - startPiece.position;
      if (diff < 0) diff += 52;
      return diff;
    }
    if (targetState === 'home-column') return 51 - startPiece.position + targetPos + 1;
    if (targetState === 'home') return 51 - startPiece.position + 5 + 1;
  }
  if (startPiece.state === 'home-column') {
    if (targetState === 'home-column') return targetPos - startPiece.position;
    if (targetState === 'home') return 5 - startPiece.position;
  }
  return 0;
};
const GameScreen = ({
  route,
  navigation
}) => {
  const {
    gameData
  } = route.params;
  const {
    user
  } = useAuth();
  const [gameState, setGameState] = useState(gameData.gameState);
  const gameStateRef = useRef(gameData.gameState);
  const [players, setPlayers] = useState(gameData.players);
  const [myColor, setMyColor] = useState(null);
  const myColorRef = useRef(null);
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
  const [timeoutCounts, setTimeoutCounts] = useState({
    red: 0,
    blue: 0,
    green: 0,
    yellow: 0
  });
  const [disqualifiedColors, setDisqualifiedColors] = useState([]);
  const [matchCountdown, setMatchCountdown] = useState(gameData.isWaitingToStart ? gameData.countdownVal || 20 : 0);
  const [musicOn, setMusicOn] = useState(isMusicEnabled());
  const [sfxOn, setSfxOn] = useState(isSfxEnabled());
  const handleToggleMusic = () => {
    playSound('button_click');
    setMusicOn(toggleMusic());
  };
  const handleToggleSfx = () => {
    // If they are turning SFX *on*, play the click so they hear it!
    // If turning off, the toggle runs first, so we don't hear it (which is correct for turning off).
    const isNowOn = toggleSfx();
    setSfxOn(isNowOn);
    if (isNowOn) playSound('button_click');else playVibration(15); // Light tap to confirm it turned off
  };
  const timerRef = useRef(null);
  const emojiTimeouts = useRef([]);
  const mountedRef = useRef(true);
  const pendingMovablePieces = useRef([]);
  const pendingKillsRef = useRef([]);
  const pendingHomesRef = useRef([]);

  // ─── Sync Audio State on Focus ───────────────────────────────────────────────
  useFocusEffect(useCallback(() => {
    setMusicOn(isMusicEnabled());
    setSfxOn(isSfxEnabled());
  }, []));

  // ─── Mount / Unmount ─────────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    const myPlayer = gameData.players.find(p => p.userId?.toString() === user?._id?.toString());
    if (myPlayer) {
      setMyColor(myPlayer.color);
      myColorRef.current = myPlayer.color;
    }
    setupSocketListeners();
    if (!gameData.isWaitingToStart) {
      startTurnTimer();
    }

    // Block back button during game
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      CustomAlert.alert('Leave Game?', 'Leaving will forfeit the game.', [{
        text: 'Stay',
        style: 'cancel'
      }, {
        text: 'Leave',
        style: 'destructive',
        onPress: () => {
          emit('leave_game', {
            gameId: gameData.gameId
          });
          navigation.replace('Main');
        }
      }]);
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
        setMatchCountdown(prev => {
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
    // Sync diceRolled from gameState (source of truth from server)
    setDiceRolled(gameState.diceRolled || false);
    if (!mine) {
      // Clear our movable pieces when it's not our turn
      setMovablePieces(null);
    }
    // Note: movablePieces for our turn are set by dice_result via handleDiceAnimationComplete
    // We do NOT override them here to avoid race conditions
  }, [gameState?.currentTurn, gameState?.diceRolled, myColor]);

  // Keep ref in sync
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // ─── Timer ───────────────────────────────────────────────────────────────────
  const startTurnTimer = useCallback(() => {
    clearTimer();
    setTimeLeft(TURN_DURATION);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearTimer();
          return 0;
        }
        if (t === 6) playSound('countdown');
        return t - 1;
      });
    }, 1000);
  }, []);
  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // ─── Socket listeners ─────────────────────────────────────────────────────────
  const setupSocketListeners = () => {
    const socket = getSocket();
    if (!socket) return;
    socket.on('dice_result', ({
      color,
      dice,
      movablePieces: mp,
      autoRolled
    }) => {
      if (!mountedRef.current) return;
      setDiceValue(dice);
      setDiceRolled(true);
      setRollingDice(false);
      
      // Play sound if opponent rolled, or if server auto-rolled for me
      if (color !== myColorRef.current || autoRolled) {
        playSound('dice_roll');
      }

      // Store movable pieces for the animation complete callback
      const isMyDice = color === myColorRef.current;
      const pending = isMyDice ? { color, pieces: (mp || []).map(Number) } : null;
      pendingMovablePieces.current = pending;

      if (dice === 6) {
        playVibration([0, 60, 60, 60]);
      }
      setGameState(prev => ({
        ...prev,
        diceValue: dice,
        diceRolled: true
      }));

      // Fallback: if animation callback never fires (e.g. opponent's dice, no animation),
      // apply movable pieces after dice animation time (~1.2s)
      if (isMyDice && pending) {
        setTimeout(() => {
          if (!mountedRef.current) return;
          // Only apply if still waiting (handleDiceAnimationComplete may have already run)
          setMovablePieces(current => {
            if (current === null || current === undefined || !current?.pieces?.length) {
              return pending;
            }
            return current;
          });
        }, 1400);
      }
    });
    socket.on('piece_moved', ({
      color,
      pieceId,
      newState,
      newPosition,
      toPos,
      autoMove
    }) => {
      console.log('[DEBUG] piece_moved received', { color, pieceId, newState, newPosition, toPos });
      if (!mountedRef.current) return;
      playVibration(30);
      const prev = gameStateRef.current;
      if (!prev) return;
      const pieceEntry = prev.pieces.find(entry => entry.color === color);
      const startPiece = pieceEntry?.pieces.find(p => p.id === pieceId);
      console.log('[DEBUG] piece_moved startPiece', startPiece);
      if (!startPiece) return;
      const roll = deduceRollValue(startPiece, newState, newPosition);
      const steps = getPathSteps(color, startPiece, roll);
      console.log('[DEBUG] piece_moved steps', steps);
      const isOpening = startPiece.state === 'base' && newState === 'on-board';
      if (steps.length === 0) {
        // Fallback if no steps: set target immediately
        if (isOpening) {
          playSound('safe_star');
        } else {
          playSound('piece_move', { randomizePitch: true });
        }
        setGameState(state => {
          if (!state) return state;
          const pieces = state.pieces.map(entry => {
            if (entry.color !== color) return entry;
            return {
              ...entry,
              pieces: entry.pieces.map(p => p.id === pieceId ? {
                ...p,
                state: newState,
                position: newPosition,
                absolutePos: toPos
              } : p)
            };
          });
          return {
            ...state,
            pieces
          };
        });
        return;
      }

      let stepIndex = 0;
      const runStep = () => {
        console.log('[DEBUG] runStep called', { stepIndex, stepsLength: steps.length });
        if (!mountedRef.current) return;
        if (stepIndex >= steps.length) {
          // Animation finished. Execute delayed kills/homes
          const kills = pendingKillsRef.current.filter(k => k.killerColor === color);
          pendingKillsRef.current = pendingKillsRef.current.filter(k => k.killerColor !== color);

          const homes = pendingHomesRef.current.filter(h => h.color === color && h.pieceId === pieceId);
          pendingHomesRef.current = pendingHomesRef.current.filter(h => !(h.color === color && h.pieceId === pieceId));

          if (kills.length > 0) {
            playSound('kill');
            setLastKill({ killer: kills[0].killerColor, victim: kills[0].killedColor });
            setTimeout(() => setLastKill(null), 2500);
          } else if (newState === 'on-board' && isSafeSquare(toPos)) {
            playSound('safe_star');
          }

          if (homes.length > 0) {
            playSound('home');
          }

          setGameState(state => {
            if (!state) return state;
            let pieces = state.pieces.map(entry => {
              if (entry.color !== color) return entry;
              return {
                ...entry,
                pieces: entry.pieces.map(p => p.id === pieceId ? {
                  ...p,
                  state: newState,
                  position: newPosition,
                  absolutePos: toPos
                } : p)
              };
            });

            kills.forEach(k => {
              pieces = pieces.map(entry => {
                if (entry.color !== k.killedColor) return entry;
                return {
                  ...entry,
                  pieces: entry.pieces.map(p => p.id === k.killedPieceId ? {
                    ...p,
                    state: 'base',
                    position: -1,
                    absolutePos: -1
                  } : p)
                };
              });
            });

            return {
              ...state,
              pieces
            };
          });
          return;
        }
        const targetStep = steps[stepIndex];

        // Play 'open' sound and heavier vibration if this is the first step of a spawn, otherwise 'move'
        if (isOpening && stepIndex === 0) {
          playSound('safe_star');
          playVibration(30);
        } else {
          playSound('piece_move', {
            randomizePitch: true
          });
          playVibration(15);
        }
        setGameState(state => {
          if (!state) return state;
          const pieces = state.pieces.map(entry => {
            if (entry.color !== color) return entry;
            return {
              ...entry,
              pieces: entry.pieces.map(p => {
                if (p.id !== pieceId) return p;
                return {
                  ...p,
                  state: targetStep.state,
                  position: targetStep.position,
                  absolutePos: targetStep.absolutePos
                };
              })
            };
          });
          return {
            ...state,
            pieces
          };
        });
        stepIndex++;
        setTimeout(runStep, 40); // Sped up from 70ms to 40ms for very snappy movement
      };

      // Start path animation
      runStep();
    });
    socket.on('piece_killed', ({
      killerColor,
      killedColor,
      killedPieceId
    }) => {
      if (!mountedRef.current) return;
      pendingKillsRef.current.push({ killerColor, killedColor, killedPieceId });
    });
    socket.on('piece_home', ({
      color,
      pieceId
    }) => {
      if (!mountedRef.current) return;
      pendingHomesRef.current.push({ color, pieceId });
      setPieceAtHome({ color, pieceId });
      setTimeout(() => setPieceAtHome(null), 2000);
    });
    socket.on('turn_change', ({
      currentTurn,
      extraTurn,
      reason
    }) => {
      if (!mountedRef.current) return;
      setGameState(prev => ({
        ...prev,
        currentTurn,
        diceRolled: false,
        diceValue: null
      }));
      setDiceValue(null);
      setDiceRolled(false);
      setMovablePieces(null);
      setRollingDice(false);
      startTurnTimer();
    });
    socket.on('game_over', result => {
      if (!mountedRef.current) return;
      clearTimer();
      const isWinner = result.winner.userId?.toString() === user?._id?.toString();
      playSound(isWinner ? 'win' : 'lose');
      navigation.replace('Result', {
        result,
        gameData
      });
    });
    socket.on('receive_emoji', ({
      userId,
      emoji
    }) => {
      if (!mountedRef.current) return;
      const id = Date.now();
      setEmojiReactions(prev => [...prev.slice(-4), {
        id,
        emoji,
        userId
      }]);
      const t = setTimeout(() => {
        setEmojiReactions(prev => prev.filter(e => e.id !== id));
      }, 3000);
      emojiTimeouts.current.push(t);
    });
    socket.on('opponent_left', ({
      userId,
      color,
      name
    }) => {
      if (!mountedRef.current) return;
      setOpponentLeft({
        name,
        color
      });
    });
    socket.on('opponent_reconnected', ({
      userId,
      color
    }) => {
      if (!mountedRef.current) return;
      setOpponentLeft(null);
    });
    socket.on('turn_timeout', ({
      color,
      timeoutCount
    }) => {
      if (!mountedRef.current) return;
      setTimeoutCounts(prev => ({
        ...prev,
        [color]: timeoutCount
      }));
    });
    socket.on('player_disqualified', ({
      color
    }) => {
      if (!mountedRef.current) return;
      setDisqualifiedColors(prev => [...prev, color]);
      const name = color === 'red' ? 'You' : players.find(p => p.color === color)?.name || color;
      CustomAlert.alert('Disqualified 🚫', `${name} missed 3 turns and was disqualified.`);
    });
    socket.on('disconnect', () => {
      if (!mountedRef.current) return;
      setDisconnected(true);
    });
    socket.on('connect', () => {
      if (!mountedRef.current) return;
      setDisconnected(false);
      // Attempt to rejoin
      emit('reconnect_game', {
        gameId: gameData.gameId
      });
    });
    socket.on('match_countdown', ({
      seconds
    }) => {
      if (!mountedRef.current) return;
      setMatchCountdown(seconds);
    });
    socket.on('match_started', () => {
      if (!mountedRef.current) return;
      setMatchCountdown(0);
      startTurnTimer();
    });
    socket.on('dice_roll_start', ({
      color
    }) => {
      if (!mountedRef.current) return;
      playVibration(50);
      setRollingDice(true);
    });
    socket.on('game_state_update', ({
      gameId,
      gameState: updatedState,
      players: updatedPlayers
    }) => {
      if (!mountedRef.current) return;
      setGameState(updatedState);
      if (updatedPlayers) setPlayers(updatedPlayers);
      setRollingDice(false);
    });
    socket.on('error_event', ({
      message
    }) => {
      if (!mountedRef.current) return;
      setRollingDice(false);
      CustomAlert.alert('Game Error', message);
    });
  };
  const removeSocketListeners = () => {
    const socket = getSocket();
    if (!socket) return;
    ['dice_result', 'piece_moved', 'piece_killed', 'piece_home', 'turn_change', 'game_over', 'receive_emoji', 'opponent_left', 'opponent_reconnected', 'turn_timeout', 'player_disqualified', 'match_countdown', 'match_started', 'dice_roll_start', 'game_state_update', 'error_event'].forEach(evt => socket.off(evt));
    emojiTimeouts.current.forEach(clearTimeout);
  };

  // ─── Handlers ─────────────────────────────────────────────────────────────────
  const handleRollDice = () => {
    if (!isMyTurn || diceRolled || rollingDice) return;
    setRollingDice(true);
    playSound('dice_roll');
    emit('roll_dice', {
      gameId: gameData.gameId
    });
  };
  const handleDiceAnimationComplete = useCallback(() => {
    const pending = pendingMovablePieces.current;
    const normalized = pending ? {
      ...pending,
      pieces: (pending.pieces || []).map(Number)
    } : null;
    setMovablePieces(normalized);
    if (normalized?.pieces?.length > 0) {
      startTurnTimer();
    }
  }, [startTurnTimer]);
  const handlePiecePress = (color, pieceId) => {
    const numPieceId = Number(pieceId);
    console.log('[MOVE] handlePiecePress', { color, pieceId: numPieceId, myColor, myColorRef: myColorRef.current, isMyTurn, diceRolled, movablePieces });
    if (color !== myColor || !isMyTurn || !diceRolled) {
      console.log('[MOVE] Blocked: turn check failed', { color, myColor, isMyTurn, diceRolled });
      return;
    }
    const movableIds = (movablePieces?.pieces || []).map(Number);
    if (!movableIds.includes(numPieceId)) {
      console.log('[MOVE] Blocked: pieceId not in movable list', { numPieceId, movableIds });
      return;
    }
    playSound('piece_select');
    console.log('[MOVE] Emitting move_piece for', numPieceId);
    emit('move_piece', {
      gameId: gameData.gameId,
      pieceId: numPieceId
    });
    setMovablePieces(null);
  };
  const handleEmoji = emoji => {
    emit('send_emoji', {
      gameId: gameData.gameId,
      emoji
    });
  };

  // ─── Render helpers ────────────────────────────────────────────────────────────
  const currentPlayer = players.find(p => p.color === gameState?.currentTurn);
  const timerColor = timeLeft <= 10 ? COLORS.error : timeLeft <= 20 ? COLORS.warning : COLORS.green;
  const redPlayer = players.find(p => p.color === 'red');
  const bluePlayer = players.find(p => p.color === 'blue');
  const greenPlayer = players.find(p => p.color === 'green');
  const yellowPlayer = players.find(p => p.color === 'yellow');
  const TurnTimerBar = ({
    duration,
    currentLeft,
    pColor
  }) => {
    const widthAnim = useRef(new Animated.Value(currentLeft / duration)).current;
    useEffect(() => {
      Animated.timing(widthAnim, {
        toValue: currentLeft / duration,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: false
      }).start();
    }, [currentLeft, duration]);
    const widthPct = widthAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '100%']
    });
    const barColor = currentLeft <= 5 ? COLORS.error : PLAYER_COLORS[pColor]?.primary || COLORS.white;
    return <View style={styles.timerBarContainer}>
        <Animated.View style={[styles.timerBarFill, {
        width: widthPct,
        backgroundColor: barColor
      }]} />
      </View>;
  };
  const renderPlayerProfile = (player, color, diceComponent = null) => {
    if (!player) {
      return <View style={styles.emptyProfileBox} />;
    }
    const isDisqualified = disqualifiedColors.includes(color);
    const isActive = gameState?.currentTurn === color && !isDisqualified;
    const isMe = player.userId?.toString() === user?._id?.toString();
    const activeBg = color === 'red' ? 'rgba(211,47,47,0.15)' : color === 'blue' ? 'rgba(25,118,210,0.15)' : color === 'green' ? 'rgba(56,142,60,0.15)' : 'rgba(251,192,45,0.15)';
    const borderStyle = isActive ? {
      borderColor: PLAYER_COLORS[color]?.primary,
      backgroundColor: activeBg
    } : {};
    const opacityStyle = isDisqualified ? {
      opacity: 0.35
    } : {};
    const avatarUrl = isMe ? user?.avatar : player?.avatar;
    console.log(`[Avatar Debug - ${color}] isMe:`, isMe, 'player.userId:', player.userId, 'user._id:', user?._id, 'avatarUrl:', avatarUrl);
    return <View style={[styles.playerProfile, borderStyle, opacityStyle]}>
        <View style={styles.profileRow}>
          <View style={[styles.avatarMini, {
          backgroundColor: PLAYER_COLORS[color]?.primary,
          overflow: 'hidden'
        }]}>
            {avatarUrl && !isDisqualified ? <Image source={{
            uri: avatarUrl
          }} style={{
            width: '100%',
            height: '100%'
          }} /> : <Text style={styles.avatarTextMini}>
                {isDisqualified ? '🚫' : color === 'red' ? '🔴' : color === 'blue' ? '🔵' : color === 'green' ? '🟢' : '🟡'}
              </Text>}
          </View>
          {!isDisqualified && diceComponent}
        </View>
        
        <Text style={[styles.playerNameText, isDisqualified && {
        textDecorationLine: 'line-through',
        color: COLORS.textMuted
      }]} numberOfLines={1}>
          {isMe ? 'You' : player.name.split(' ')[0]}
        </Text>
        
        {isActive ? <TurnTimerBar duration={TURN_DURATION} currentLeft={timeLeft} pColor={color} /> : !isDisqualified && <View style={styles.timeoutDotsRow}>
              {[0, 1, 2].map(idx => {
          const isMissed = (timeoutCounts[color] || 0) > idx;
          return <View key={idx} style={[styles.timeoutDot, isMissed ? styles.timeoutDotMissed : styles.timeoutDotActive]} />;
        })}
            </View>}
      </View>;
  };
  const renderDiceSlot = (player, color) => {
    const isActive = gameState?.currentTurn === color;
    const hasPlayer = !!player;
    if (!hasPlayer) return null;
    return <View style={styles.diceBox}>
        <View style={{
        opacity: isActive ? 1 : 0
      }} pointerEvents={isActive ? 'auto' : 'none'}>
          <Dice3D value={isActive ? diceValue : null} rolling={isActive && rollingDice} onPress={handleRollDice} disabled={myColor === color ? diceRolled : false} size={36} onRollComplete={isActive ? handleDiceAnimationComplete : undefined} />
        </View>
      </View>;
  };
  const insets = useSafeAreaInsets();
  return <LinearGradient colors={GRADIENTS.background} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Top bar: prize pool + timer */}
      <View style={[styles.topBar, {
      paddingTop: Math.max(insets.top, 16) + 10
    }]}>
        <View style={styles.prizeChip}>
          <Text style={styles.prizeEmoji}>🏆</Text>
          <Text style={styles.prizeText}>₹{gameData.prizePool}</Text>
        </View>

        <View style={styles.turnInfo}>
          <View style={[styles.turnDot, {
          backgroundColor: PLAYER_COLORS[gameState?.currentTurn]?.primary || COLORS.white
        }]} />
          <Text style={styles.turnText}>
            {isMyTurn ? 'Your Turn' : `${currentPlayer?.name || '?'}'s Turn`} ({timeLeft}s)
          </Text>
        </View>

        <View style={styles.topRightControls}>
          <TouchableOpacity onPress={(...args) => {
          playSound("button_click");
          return handleToggleMusic(...args);
        }} style={styles.soundToggleBtn} activeOpacity={0.7}>
            <Text style={styles.soundToggleText}>{musicOn ? '🎵' : '🔇'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={(...args) => {
          playSound("button_click");
          return handleToggleSfx(...args);
        }} style={styles.soundToggleBtn} activeOpacity={0.7}>
            <Text style={styles.soundToggleText}>{sfxOn ? '🔊' : '🔈'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Kill / home notification banners */}
      {lastKill && <View style={styles.killBanner}>
          <Text style={styles.killBannerText}>
            💀 {lastKill.killer}'s piece killed {lastKill.victim}!
          </Text>
        </View>}
      {pieceAtHome && <View style={styles.homeBanner}>
          <Text style={styles.homeBannerText}>
            🏠 {pieceAtHome.color} piece reached HOME! 🎉
          </Text>
        </View>}
      {opponentLeft && <View style={styles.disconnectBanner}>
          <Text style={styles.disconnectBannerText}>
            ⚠️ {opponentLeft.name} disconnected — waiting 60s...
          </Text>
        </View>}
      {disconnected && <View style={styles.disconnectBanner}>
          <Text style={styles.disconnectBannerText}>⚠️ Reconnecting...</Text>
        </View>}

      <View style={styles.gameContainer}>
        {/* Top Player Row: Red (Left) and Blue (Right) */}
        <View style={styles.topPlayerRow}>
          {renderPlayerProfile(redPlayer, 'red', renderDiceSlot(redPlayer, 'red'))}
          {renderPlayerProfile(bluePlayer, 'blue', renderDiceSlot(bluePlayer, 'blue'))}
        </View>

        {/* Ludo Board */}
        <View style={styles.boardContainer}>
          <LudoBoard gameState={gameState} players={players} myColor={myColor} movablePieces={movablePieces} onPiecePress={handlePiecePress} />
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
          {EMOJIS.map(e => <TouchableOpacity key={e} style={styles.emojiBtn} onPress={() => {
          playSound("button_click");
          return handleEmoji(e);
        }}>
              <Text style={styles.emoji}>{e}</Text>
            </TouchableOpacity>)}
        </View>

        {/* Emoji reactions overlay */}
        <View style={styles.emojiReactions} pointerEvents="none">
          {emojiReactions.map(r => <EmojiReaction key={r.id} emoji={r.emoji} />)}
        </View>
      </View>

      {matchCountdown > 0 && <View style={styles.countdownOverlay} pointerEvents="auto">
          <LinearGradient colors={['rgba(11, 27, 61, 0.95)', 'rgba(28, 61, 125, 0.95)']} style={styles.countdownContent}>
            <Text style={styles.countdownTitle}>🎯 MATCH FOUND!</Text>
            <Text style={styles.countdownSubtitle}>Get ready to play</Text>
            <View style={styles.countdownCircle}>
              <Text style={styles.countdownNumber}>{matchCountdown}</Text>
            </View>
            <Text style={styles.countdownFooter}>Starting match...</Text>
          </LinearGradient>
        </View>}
    </LinearGradient>;
};

// Floating emoji animation component
const EmojiReaction = ({
  emoji
}) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 1800,
      useNativeDriver: true
    }).start();
  }, []);
  return <Animated.Text style={[styles.floatingEmoji, {
    opacity: anim.interpolate({
      inputRange: [0, 0.7, 1],
      outputRange: [1, 1, 0]
    }),
    transform: [{
      translateY: anim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -80]
      })
    }]
  }]}>
      {emoji}
    </Animated.Text>;
};
const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    paddingTop: SPACING.md + 4,
    backgroundColor: COLORS.surface
  },
  prizeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.round
  },
  prizeEmoji: {
    fontSize: 11
  },
  prizeText: {
    color: COLORS.gold,
    fontWeight: '900',
    fontSize: 11
  },
  turnInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  turnDot: {
    width: 10,
    height: 10,
    borderRadius: 5
  },
  turnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 10
  },
  timerChip: {
    width: 48,
    height: 32,
    borderRadius: RADIUS.round,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  timerText: {
    fontWeight: '900',
    fontSize: 11
  },
  topRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  soundToggleBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  soundToggleText: {
    fontSize: 14
  },
  killBanner: {
    backgroundColor: 'rgba(255,68,68,0.85)',
    padding: SPACING.sm,
    alignItems: 'center'
  },
  killBannerText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 10
  },
  homeBanner: {
    backgroundColor: 'rgba(68,221,136,0.85)',
    padding: SPACING.sm,
    alignItems: 'center'
  },
  homeBannerText: {
    color: COLORS.background,
    fontWeight: '700',
    fontSize: 10
  },
  disconnectBanner: {
    backgroundColor: 'rgba(255,165,0,0.85)',
    padding: SPACING.sm,
    alignItems: 'center'
  },
  disconnectBannerText: {
    color: COLORS.background,
    fontWeight: '700',
    fontSize: 10
  },
  gameContainer: {
    flex: 1,
    padding: SPACING.md,
    justifyContent: 'center'
  },
  topPlayerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs
  },
  bottomPlayerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.xs
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
    minHeight: 82
  },
  profileInactive: {
    opacity: 0.4
  },
  emptyProfileBox: {
    minWidth: 100,
    minHeight: 82,
    backgroundColor: 'transparent'
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  avatarMini: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  avatarTextMini: {
    color: COLORS.white,
    fontWeight: '900',
    fontSize: 12
  },
  playerNameText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 11
  },
  timerBarContainer: {
    width: '90%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    marginTop: 4,
    overflow: 'hidden'
  },
  timerBarFill: {
    height: '100%',
    borderRadius: 2
  },
  diceBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1.0,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  boardContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xs
  },
  bottomControls: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    alignItems: 'center'
  },
  emojiBar: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center'
  },
  emojiBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  emoji: {
    fontSize: 20
  },
  emojiReactions: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 60
  },
  floatingEmoji: {
    position: 'absolute',
    fontSize: 40
  },
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999
  },
  countdownContent: {
    padding: 32,
    borderRadius: 24,
    alignItems: 'center',
    width: '85%',
    borderWidth: 2,
    borderColor: 'rgba(255,215,0,0.3)',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10
    },
    shadowOpacity: 0.5,
    shadowRadius: 15
  },
  countdownTitle: {
    color: COLORS.gold,
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: {
      width: 1,
      height: 1
    },
    textShadowRadius: 3
  },
  countdownSubtitle: {
    color: COLORS.white,
    fontSize: 16,
    opacity: 0.9,
    marginBottom: 24
  },
  countdownCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,215,0,0.15)',
    borderWidth: 3,
    borderColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24
  },
  countdownNumber: {
    color: COLORS.gold,
    fontSize: 48,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: {
      width: 2,
      height: 2
    },
    textShadowRadius: 4
  },
  countdownFooter: {
    color: COLORS.white,
    fontSize: 14,
    opacity: 0.7,
    fontStyle: 'italic'
  },
  timeoutDotsRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 2
  },
  timeoutDot: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  timeoutDotActive: {
    backgroundColor: COLORS.success
  },
  timeoutDotMissed: {
    backgroundColor: COLORS.error
  }
});
export default GameScreen;