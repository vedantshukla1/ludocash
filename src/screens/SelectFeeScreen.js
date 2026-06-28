import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Animated, StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { connectSocket, getSocket, emit, on, off } from '../services/socket';
import { COLORS, GRADIENTS, SPACING, RADIUS, SHADOWS } from '../utils/theme';

const FEE_OPTIONS = {
  '2player': [
    { fee: 10, players: 2, cut: 10 },
    { fee: 50, players: 2, cut: 10 },
    { fee: 100, players: 2, cut: 10 },
    { fee: 500, players: 2, cut: 10 },
  ],
  '4player': [
    { fee: 10, players: 4, cut: 15 },
    { fee: 50, players: 4, cut: 15 },
    { fee: 100, players: 4, cut: 15 },
    { fee: 500, players: 4, cut: 15 },
  ],
  tournament: [
    { fee: 50, players: 4, cut: 20 },
    { fee: 100, players: 4, cut: 20 },
    { fee: 500, players: 4, cut: 20 },
  ],
};

const SelectFeeScreen = ({ route, navigation }) => {
  const { mode, preselectedFee } = route.params;
  const { user, refreshUser } = useAuth();

  const options = FEE_OPTIONS[mode.id] || [];
  const [selectedFee, setSelectedFee] = useState(preselectedFee || options[0]?.fee);
  const [searching, setSearching] = useState(false);
  const [waitingCount, setWaitingCount] = useState(0);
  const [waitingUsers, setWaitingUsers] = useState([]);

  const searchAnim = useRef(new Animated.Value(0)).current;
  const dotAnims = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  const findBtnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    return () => {
      if (searching) {
        emit('cancel_pool', { mode: mode.id, fee: selectedFee });
      }
    };
  }, [searching, selectedFee]);

  useEffect(() => {
    if (!searching) return;

    // Dot loading animation
    const loops = dotAnims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 200),
          Animated.timing(anim, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [searching]);

  const handleFindOpponent = async () => {
    const opt = options.find((o) => o.fee === selectedFee);
    if (!opt) return;

    const balance = user?.wallet?.balance || 0;
    if (balance < selectedFee) {
      Alert.alert(
        'Insufficient Balance',
        `You need ₹${selectedFee} to join. Your balance: ₹${balance.toFixed(0)}`,
        [
          { text: 'Add Money', onPress: () => navigation.navigate('Wallet') },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
      return;
    }

    try {
      Animated.spring(findBtnScale, { toValue: 0.95, useNativeDriver: true }).start();
      const socket = await connectSocket();

      // Listen for events
      socket.on('pool_joined', ({ position }) => {
        setSearching(true);
      });

      // Hide active player counts entirely

      socket.on('game_found', (gameData) => {
        setSearching(false);
        socket.off('pool_joined');
        socket.off('game_found');
        navigation.replace('Game', { gameData });
      });

      socket.on('insufficient_balance', ({ required, current }) => {
        setSearching(false);
        Alert.alert('Insufficient Balance', `Need ₹${required}, have ₹${current}`);
      });

      socket.on('error_event', ({ message }) => {
        setSearching(false);
        Alert.alert('Error', message);
      });

      emit('join_pool', { mode: mode.id, fee: selectedFee });
    } catch (err) {
      Alert.alert('Connection Error', err.message || 'Failed to connect. Check your internet connection.');
      setSearching(false);
    }
  };

  const handleCancel = () => {
    emit('cancel_pool', { mode: mode.id, fee: selectedFee });
    const socket = getSocket();
    if (socket) {
      socket.off('pool_joined');
      socket.off('game_found');
    }
    setSearching(false);
    setWaitingCount(0);
    setWaitingUsers([]);
  };

  const selectedOption = options.find((o) => o.fee === selectedFee);
  const prize = selectedOption
    ? Math.floor(selectedOption.fee * selectedOption.players * (1 - selectedOption.cut / 100))
    : 0;

  return (
    <LinearGradient colors={GRADIENTS.background} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { handleCancel(); navigation.goBack(); }}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{mode.emoji} {mode.title}</Text>
        <View style={styles.balanceBadge}>
          <Text style={styles.balanceText}>₹{(user?.wallet?.balance || 0).toFixed(0)}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionLabel}>Select Entry Fee</Text>

        {/* Fee cards - 2x2 Grid Layout */}
        <View style={styles.gridContainer}>
          {options.map((opt) => {
            const p = Math.floor(opt.fee * opt.players * (1 - opt.cut / 100));
            const isSelected = selectedFee === opt.fee;
            const canAfford = (user?.wallet?.balance || 0) >= opt.fee;

            return (
              <TouchableOpacity
                key={opt.fee}
                style={[
                  styles.feeCardGrid,
                  isSelected && styles.feeCardSelectedGrid,
                  !canAfford && styles.feeCardDisabledGrid,
                ]}
                onPress={() => !searching && canAfford && setSelectedFee(opt.fee)}
                activeOpacity={0.85}
              >
                <Text style={styles.feeCardAmountGrid}>₹{opt.fee}</Text>
                <Text style={styles.feeCardLabelGrid}>Entry Fee</Text>
                <View style={styles.prizeDividerGrid} />
                <Text style={styles.feeCardPrizeGrid}>Win ₹{p}</Text>
                {isSelected && (
                  <View style={styles.feeCardCheckGrid}>
                    <Text style={styles.checkTextGrid}>✓</Text>
                  </View>
                )}
                {!canAfford && (
                  <View style={styles.insufficientBadgeGrid}>
                    <Text style={styles.insufficientTextGrid}>Low Bal</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Prize summary */}
        {selectedOption && (
          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Your entry</Text>
              <Text style={styles.summaryValue}>₹{selectedFee}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total pot ({selectedOption.players} players)</Text>
              <Text style={styles.summaryValue}>₹{selectedFee * selectedOption.players}</Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryTotal]}>
              <Text style={styles.summaryTotalLabel}>Winner gets</Text>
              <Text style={styles.summaryTotalValue}>₹{prize}</Text>
            </View>
          </View>
        )}

        {/* Searching state */}
        {searching && (
          <View style={styles.searchingContainer}>
            <View style={styles.searchingDots}>
              {dotAnims.map((anim, i) => (
                <Animated.View
                  key={i}
                  style={[styles.dot, { transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) }] }]}
                />
              ))}
            </View>
            <Text style={styles.searchingText}>Finding opponent...</Text>
          </View>
        )}

        {/* Action buttons */}
        {!searching ? (
          <TouchableOpacity style={styles.findBtn} onPress={handleFindOpponent}>
            <LinearGradient colors={GRADIENTS.gold} style={styles.findBtnGrad}>
              <Text style={styles.findBtnText}>⚔️ Find Opponent</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
            <Text style={styles.cancelBtnText}>Cancel Search</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    paddingTop: SPACING.lg,
    paddingTop: SPACING.lg,
    backgroundColor: COLORS.surface,
  },
  backBtn: { color: COLORS.gold, fontSize: 12, fontWeight: '700' },
  headerTitle: { color: COLORS.white, fontSize: 14, fontWeight: '800' },
  balanceBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  balanceText: { color: COLORS.gold, fontWeight: '800', fontSize: 11 },
  scroll: { padding: SPACING.md },
  sectionLabel: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: SPACING.md,
    textTransform: 'uppercase',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  feeCardGrid: {
    width: '47%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    height: 110,
    ...SHADOWS.card,
  },
  feeCardSelectedGrid: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  feeCardDisabledGrid: {
    opacity: 0.45,
  },
  feeCardAmountGrid: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '900',
  },
  feeCardLabelGrid: {
    color: COLORS.textSecondary,
    fontSize: 9,
    marginTop: 2,
    fontWeight: '600',
  },
  prizeDividerGrid: {
    width: '60%',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginVertical: 6,
  },
  feeCardPrizeGrid: {
    color: COLORS.gold,
    fontSize: 12,
    fontWeight: '800',
  },
  feeCardCheckGrid: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: COLORS.gold,
    borderRadius: 9,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkTextGrid: {
    color: '#0B1B3D',
    fontSize: 10,
    fontWeight: '900',
  },
  insufficientBadgeGrid: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(255, 68, 68, 0.25)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  insufficientTextGrid: {
    color: '#FF8A80',
    fontSize: 7,
    fontWeight: '800',
  },
  summary: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginVertical: SPACING.md,
    gap: SPACING.sm,
    ...SHADOWS.medium,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { color: COLORS.textSecondary, fontSize: 11 },
  summaryValue: { color: COLORS.white, fontSize: 11, fontWeight: '700' },
  summaryTotal: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 215, 0, 0.35)',
  },
  summaryTotalLabel: { color: COLORS.gold, fontSize: 12, fontWeight: '800' },
  summaryTotalValue: { color: COLORS.gold, fontSize: 15, fontWeight: '900' },
  searchingContainer: { alignItems: 'center', paddingVertical: SPACING.lg },
  searchingDots: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: COLORS.gold },
  searchingText: { color: COLORS.white, fontSize: 14, fontWeight: '700', marginBottom: 6 },
  searchingCount: { color: COLORS.textSecondary, fontSize: 11, marginBottom: SPACING.md },
  opponentList: { marginTop: SPACING.md, alignItems: 'center', width: '100%', paddingHorizontal: SPACING.lg },
  opponentListTitle: { color: COLORS.gold, fontSize: 10, fontWeight: '800', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' },
  opponentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 215, 0, 0.1)', paddingVertical: 8, paddingHorizontal: 16, borderRadius: RADIUS.md, borderWidth: 1, borderColor: 'rgba(255, 215, 0, 0.25)', minWidth: 160, justifyContent: 'center', gap: 8 },
  opponentCardEmoji: { fontSize: 14 },
  opponentCardName: { color: COLORS.white, fontSize: 13, fontWeight: '700' },
  findBtn: { borderRadius: RADIUS.md, overflow: 'hidden', marginTop: SPACING.md },
  findBtnGrad: { padding: SPACING.md + 2, alignItems: 'center', borderRadius: RADIUS.md },
  findBtnText: { color: '#0B1B3D', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  cancelBtn: {
    padding: SPACING.md,
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: 'rgba(255,68,68,0.5)',
    marginTop: SPACING.md,
  },
  cancelBtnText: { color: COLORS.error, fontSize: 12, fontWeight: '700' },
});

export default SelectFeeScreen;
