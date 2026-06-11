import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, StatusBar, Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { COLORS, GRADIENTS, SPACING, RADIUS, SHADOWS } from '../utils/theme';

const { width, height } = Dimensions.get('window');

// Confetti particle
const Confetti = ({ delay, color }) => {
  const x = useRef(new Animated.Value(Math.random() * width)).current;
  const y = useRef(new Animated.Value(-20)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const run = () => {
      x.setValue(Math.random() * width);
      y.setValue(-20);
      opacity.setValue(1);
      rotate.setValue(0);
      Animated.parallel([
        Animated.timing(y, { toValue: height + 20, duration: 2500 + Math.random() * 1500, useNativeDriver: true }),
        Animated.timing(rotate, { toValue: 360, duration: 2000, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(1800),
          Animated.timing(opacity, { toValue: 0, duration: 700, useNativeDriver: true }),
        ]),
      ]).start(() => setTimeout(run, delay + Math.random() * 1000));
    };
    setTimeout(run, delay);
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: 10,
        height: 10,
        backgroundColor: color,
        transform: [
          { translateX: x },
          { translateY: y },
          { rotate: rotate.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] }) },
        ],
        opacity,
        borderRadius: Math.random() > 0.5 ? 5 : 0,
      }}
    />
  );
};

const CONFETTI_COLORS = [COLORS.gold, COLORS.red, COLORS.blue, COLORS.green, '#FF69B4', '#FF8C00'];

const ResultScreen = ({ route, navigation }) => {
  const { result, gameData } = route.params;
  const { user, refreshUser } = useAuth();

  const isWinner = result.winner.userId?.toString() === user?._id?.toString();

  const trophyScale = useRef(new Animated.Value(0)).current;
  const trophyRotate = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslate = useRef(new Animated.Value(50)).current;
  const prizeAnim = useRef(new Animated.Value(0)).current;
  const btnOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    refreshUser();

    Animated.sequence([
      Animated.parallel([
        Animated.spring(trophyScale, { toValue: 1, tension: 60, friction: 6, useNativeDriver: true }),
        Animated.timing(trophyRotate, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(cardOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(cardTranslate, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
      ]),
      Animated.timing(prizeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(btnOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  const confettiParticles = isWinner
    ? Array.from({ length: 40 }, (_, i) => ({
        id: i,
        delay: i * 60,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      }))
    : [];

  return (
    <LinearGradient colors={GRADIENTS.background} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Confetti */}
      {confettiParticles.map((p) => (
        <Confetti key={p.id} delay={p.delay} color={p.color} />
      ))}

      {/* Trophy */}
      <Animated.View
        style={[
          styles.trophyContainer,
          {
            transform: [
              { scale: trophyScale },
              {
                rotate: trophyRotate.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: ['-15deg', '15deg', '0deg'],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.trophyEmoji}>{isWinner ? '🏆' : '😔'}</Text>
        <Text style={[styles.resultTitle, { color: isWinner ? COLORS.gold : COLORS.textSecondary }]}>
          {isWinner ? 'You Won!' : 'You Lost'}
        </Text>
        <Text style={styles.winnerName}>
          {isWinner ? 'Congratulations!' : `${result.winner.name} won!`}
        </Text>
      </Animated.View>

      {/* Prize card */}
      <Animated.View
        style={[
          styles.card,
          { opacity: cardOpacity, transform: [{ translateY: cardTranslate }] },
        ]}
      >
        {isWinner && (
          <Animated.View style={[styles.prizeRow, { opacity: prizeAnim }]}>
            <Text style={styles.prizeLabel}>Prize Credited 💰</Text>
            <Text style={styles.prizeAmount}>₹{result.prizeCredited}</Text>
            {result.tdsDeducted > 0 && (
              <Text style={styles.tdsNote}>TDS deducted: ₹{result.tdsDeducted} (30%)</Text>
            )}
          </Animated.View>
        )}

        {/* Game summary */}
        <View style={styles.summaryRows}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Mode</Text>
            <Text style={styles.summaryValue}>{gameData.mode}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Entry Fee</Text>
            <Text style={styles.summaryValue}>₹{gameData.entryFee}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Prize Pool</Text>
            <Text style={styles.summaryValue}>₹{result.prizePool}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Winner</Text>
            <View style={styles.winnerRow}>
              <View style={[styles.colorDot, { backgroundColor: getColorHex(result.winner.color) }]} />
              <Text style={styles.summaryValueHighlight}>{result.winner.name}</Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Buttons */}
      <Animated.View style={[styles.buttons, { opacity: btnOpacity }]}>
        <TouchableOpacity
          style={styles.playAgainBtn}
          onPress={() => navigation.replace('Main')}
        >
          <LinearGradient colors={GRADIENTS.goldButton} style={styles.playAgainGrad}>
            <Text style={styles.playAgainText}>🎮 Play Again</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => navigation.navigate('Main')}
        >
          <Text style={styles.homeBtnText}>🏠 Home</Text>
        </TouchableOpacity>
      </Animated.View>
    </LinearGradient>
  );
};

const getColorHex = (color) => {
  const map = { red: COLORS.red, blue: COLORS.blue, green: COLORS.green, yellow: COLORS.yellow };
  return map[color] || COLORS.white;
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  trophyContainer: { alignItems: 'center', marginBottom: SPACING.xl },
  trophyEmoji: { fontSize: 64, marginBottom: SPACING.sm },
  resultTitle: { fontSize: 28, fontWeight: '900', letterSpacing: 2, marginBottom: 4 },
  winnerName: { color: COLORS.textSecondary, fontSize: 13 },
  card: {
    width: '100%',
    backgroundColor: 'rgba(15, 32, 22, 0.75)',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 163, 0.15)',
    marginBottom: SPACING.xl,
    ...SHADOWS.card,
  },
  prizeRow: {
    alignItems: 'center',
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 255, 163, 0.15)',
    marginBottom: SPACING.md,
  },
  prizeLabel: { color: COLORS.textSecondary, fontSize: 10, marginBottom: 4 },
  prizeAmount: { color: COLORS.gold, fontSize: 32, fontWeight: '900' },
  tdsNote: { color: COLORS.textMuted, fontSize: 9, marginTop: 4 },
  summaryRows: { gap: SPACING.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { color: COLORS.textSecondary, fontSize: 11 },
  summaryValue: { color: COLORS.white, fontSize: 11, fontWeight: '700' },
  summaryValueHighlight: { color: COLORS.gold, fontSize: 11, fontWeight: '800' },
  winnerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  colorDot: { width: 10, height: 10, borderRadius: 5 },
  buttons: { width: '100%', gap: SPACING.sm },
  playAgainBtn: { borderRadius: RADIUS.md, overflow: 'hidden' },
  playAgainGrad: { padding: SPACING.md + 2, alignItems: 'center', borderRadius: RADIUS.md },
  playAgainText: { color: COLORS.white, fontSize: 13, fontWeight: '900' },
  homeBtn: {
    padding: SPACING.md,
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  homeBtnText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
});

export default ResultScreen;
