import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  StatusBar,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { gameAPI, authAPI, walletAPI } from '../services/api';
import { COLORS, GRADIENTS, SPACING, RADIUS, SHADOWS } from '../utils/theme';

const GAME_MODES = [
  {
    id: '2player',
    title: '2 Player',
    subtitle: '1 vs 1',
    emoji: '⚔️',
    fees: [10, 50, 100, 500],
    cutPercent: 10,
    gradient: ['#FF6B6B', '#FF4444'],
    description: 'Head-to-head battle',
  },
  {
    id: '4player',
    title: '4 Player',
    subtitle: 'Free for All',
    emoji: '🎯',
    fees: [10, 50, 100, 500],
    cutPercent: 15,
    gradient: ['#6BA8FF', '#4488FF'],
    description: 'Last one standing wins',
  },
  {
    id: 'tournament',
    title: 'Tournament',
    subtitle: 'Big Prize Pool',
    emoji: '🏆',
    fees: [50, 100, 500],
    cutPercent: 20,
    gradient: ['#FFE766', '#FFD700'],
    description: 'Compete for glory',
  },
  {
    id: 'computer',
    title: 'vs Computer',
    subtitle: 'Practice Mode',
    emoji: '🤖',
    fees: [0],
    cutPercent: 0,
    gradient: ['#00FFA3', '#00C880'],
    description: 'Play with Computer (Free)',
  },
];

const HomeScreen = ({ navigation }) => {
  const { user, refreshUser, logout } = useAuth();
  const [waitingCounts, setWaitingCounts] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [dailyBonusClaimed, setDailyBonusClaimed] = useState(false);
  const [claimingBonus, setClaimingBonus] = useState(false);
  const [showComputerModal, setShowComputerModal] = useState(false);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const cardAnims = useRef(GAME_MODES.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // Stagger card animations on mount
    Animated.stagger(120, cardAnims.map((anim) =>
      Animated.spring(anim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
    )).start();

    // Pulse animation for daily bonus button
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    ).start();

    loadWaitingCounts();
    checkDailyBonus();
  }, []);

  const loadWaitingCounts = async () => {
    const counts = {};
    for (const mode of GAME_MODES) {
      if (mode.id === 'computer') continue;
      for (const fee of mode.fees) {
        try {
          const { data } = await gameAPI.getWaitingCount(mode.id, fee);
          counts[`${mode.id}_${fee}`] = data.count;
        } catch (_) {
          counts[`${mode.id}_${fee}`] = 0;
        }
      }
    }
    setWaitingCounts(counts);
  };

  const checkDailyBonus = () => {
    if (user?.dailyBonusLastClaimed) {
      const last = new Date(user.dailyBonusLastClaimed);
      const now = new Date();
      if (
        last.getDate() === now.getDate() &&
        last.getMonth() === now.getMonth() &&
        last.getFullYear() === now.getFullYear()
      ) {
        setDailyBonusClaimed(true);
      }
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshUser(), loadWaitingCounts()]);
    setRefreshing(false);
  };

  const handleDailyBonus = async () => {
    if (dailyBonusClaimed || claimingBonus) return;
    setClaimingBonus(true);
    try {
      const { data } = await authAPI.dailyBonus();
      await refreshUser();
      setDailyBonusClaimed(true);
      Alert.alert('🎁 Daily Bonus!', `₹${data.bonus} bonus added to your wallet!`);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to claim daily bonus.';
      Alert.alert('Oops', msg);
    } finally {
      setClaimingBonus(false);
    }
  };

  const handleComputerModePress = () => {
    setShowComputerModal(true);
  };

  const handleModePress = (mode) => {
    if (mode.id === 'computer') {
      handleComputerModePress();
      return;
    }
    navigation.navigate('SelectFee', { mode });
  };

  const walletTotal = user?.wallet
    ? (user.wallet.balance || 0)
    : 0;

  return (
    <LinearGradient colors={GRADIENTS.background} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name ? user.name[0].toUpperCase() : '?'}
            </Text>
          </View>
          <View>
            <Text style={styles.greeting}>Good game,</Text>
            <Text style={styles.userName}>{user?.name || 'Player'}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.walletChip}
          onPress={() => navigation.navigate('Wallet')}
        >
          <Text style={styles.walletEmoji}>💰</Text>
          <Text style={styles.walletAmount}>₹{walletTotal.toFixed(0)}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.gold} />}
        contentContainerStyle={styles.scroll}
      >
        {/* Welcome bonus banner */}
        {!user?.welcomeBonusClaimed && (
          <View style={styles.welcomeBanner}>
            <Text style={styles.welcomeEmoji}>🎉</Text>
            <View style={styles.welcomeText}>
              <Text style={styles.welcomeTitle}>Welcome Bonus!</Text>
              <Text style={styles.welcomeDesc}>₹20 has been added to your wallet</Text>
            </View>
          </View>
        )}

        {/* Daily bonus */}
        <Animated.View style={{ transform: [{ scale: dailyBonusClaimed ? 1 : pulseAnim }] }}>
          <TouchableOpacity
            style={[styles.dailyBonus, dailyBonusClaimed && styles.dailyBonusClaimed]}
            onPress={handleDailyBonus}
            disabled={dailyBonusClaimed}
          >
            <Text style={styles.dailyBonusEmoji}>{dailyBonusClaimed ? '✅' : '🎁'}</Text>
            <View style={styles.dailyBonusText}>
              <Text style={styles.dailyBonusTitle}>
                {dailyBonusClaimed ? 'Daily Bonus Claimed!' : 'Claim Daily Bonus'}
              </Text>
              <Text style={styles.dailyBonusDesc}>
                {dailyBonusClaimed ? 'Come back tomorrow' : 'Get ₹2 free every day'}
              </Text>
            </View>
            {!dailyBonusClaimed && (
              <View style={styles.dailyBonusBadge}>
                <Text style={styles.dailyBonusBadgeText}>₹2</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Section title */}
        <Text style={styles.sectionTitle}>🎮 Choose Game Mode</Text>

        {/* Game mode cards - 2x2 Grid Layout */}
        <View style={styles.gridContainer}>
          {GAME_MODES.map((mode, index) => (
            <Animated.View
              key={mode.id}
              style={[
                styles.gridItem,
                {
                  opacity: cardAnims[index],
                  transform: [{ translateY: cardAnims[index].interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
                }
              ]}
            >
              <TouchableOpacity
                style={styles.modeCardGrid}
                onPress={() => handleModePress(mode)}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['rgba(28, 61, 125, 0.85)', 'rgba(15, 32, 68, 0.6)']}
                  style={styles.modeCardGradGrid}
                >
                  <Text style={styles.modeEmojiGrid}>{mode.emoji}</Text>
                  <Text style={styles.modeTitleGrid}>{mode.title}</Text>
                  <Text style={styles.modeSubtitleGrid}>{mode.subtitle}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        <View style={styles.bottomPad} />
      </ScrollView>

      {/* Custom Modal for vs Computer selection */}
      <Modal
        visible={showComputerModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowComputerModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowComputerModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🤖 vs Computer</Text>
            <Text style={styles.modalSubtitle}>Select Number of Players</Text>
            
            <View style={styles.modalOptionsContainer}>
              <TouchableOpacity 
                style={styles.modalOptionBtn}
                onPress={() => {
                  setShowComputerModal(false);
                  navigation.navigate('ComputerGame', { playersCount: 2 });
                }}
              >
                <Text style={styles.modalOptionEmoji}>👥</Text>
                <Text style={styles.modalOptionText}>2 Players</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalOptionBtn}
                onPress={() => {
                  setShowComputerModal(false);
                  navigation.navigate('ComputerGame', { playersCount: 3 });
                }}
              >
                <Text style={styles.modalOptionEmoji}>👥👤</Text>
                <Text style={styles.modalOptionText}>3 Players</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalOptionBtn}
                onPress={() => {
                  setShowComputerModal(false);
                  navigation.navigate('ComputerGame', { playersCount: 4 });
                }}
              >
                <Text style={styles.modalOptionEmoji}>👥👥</Text>
                <Text style={styles.modalOptionText}>4 Players</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.modalCancelBtn}
              onPress={() => setShowComputerModal(false)}
            >
              <Text style={styles.modalCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </LinearGradient>
  );
};

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
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  avatarText: { fontSize: 14, fontWeight: '900', color: '#0B1B3D' },
  greeting: { fontSize: 9, color: COLORS.textMuted },
  userName: { fontSize: 13, fontWeight: '700', color: COLORS.white },
  walletChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.45)',
  },
  walletEmoji: { fontSize: 13 },
  walletAmount: { color: COLORS.gold, fontWeight: '800', fontSize: 12 },
  scroll: { padding: SPACING.md },
  welcomeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: 'rgba(68,221,136,0.12)',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(68,221,136,0.35)',
    marginBottom: SPACING.md,
  },
  welcomeEmoji: { fontSize: 22 },
  welcomeText: {},
  welcomeTitle: { color: COLORS.green, fontWeight: '800', fontSize: 12 },
  welcomeDesc: { color: COLORS.textSecondary, fontSize: 10, marginTop: 2 },
  dailyBonus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.35)',
    marginBottom: SPACING.lg,
  },
  dailyBonusClaimed: {
    opacity: 0.5,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  dailyBonusEmoji: { fontSize: 18 },
  dailyBonusText: { flex: 1 },
  dailyBonusTitle: { color: COLORS.gold, fontWeight: '800', fontSize: 11 },
  dailyBonusDesc: { color: COLORS.textSecondary, fontSize: 10, marginTop: 2 },
  dailyBonusBadge: {
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 4,
  },
  dailyBonusBadgeText: { color: '#0B1B3D', fontWeight: '900', fontSize: 10 },
  sectionTitle: { color: COLORS.white, fontSize: 14, fontWeight: '800', marginBottom: SPACING.md },
  modeCard: {
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  gridItem: {
    width: '47%',
  },
  modeCardGrid: {
    borderRadius: RADIUS.md,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 215, 0, 0.25)',
    overflow: 'hidden',
    ...SHADOWS.card,
    height: 125,
  },
  modeCardGradGrid: {
    flex: 1,
    padding: SPACING.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  modeEmojiGrid: {
    fontSize: 28,
    marginBottom: 2,
  },
  modeTitleGrid: {
    color: COLORS.gold,
    fontWeight: '800',
    fontSize: 12,
    textAlign: 'center',
  },
  modeSubtitleGrid: {
    color: COLORS.textSecondary,
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
  },
  feeRow: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap' },
  feeChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: RADIUS.md,
    padding: SPACING.sm + 2,
    alignItems: 'center',
    minWidth: 68,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    position: 'relative',
  },
  feeChipEntry: { color: COLORS.white, fontWeight: '800', fontSize: 11 },
  feeChipPrize: { color: COLORS.gold, fontWeight: '600', fontSize: 8, marginTop: 2 },
  waitingDot: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: COLORS.blue,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitingDotText: { color: COLORS.white, fontSize: 8, fontWeight: '900' },
  platformCut: {
    color: COLORS.textMuted,
    fontSize: 8,
    marginTop: SPACING.sm,
    textAlign: 'right',
  },
  playCompBtn: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.45)',
    marginTop: SPACING.xs,
  },
  playCompText: {
    color: COLORS.gold,
    fontWeight: '800',
    fontSize: 12,
  },
  bottomPad: { height: 20 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '82%',
    backgroundColor: '#0B1B3D',
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 215, 0, 0.35)',
    padding: SPACING.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.gold,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  modalOptionsContainer: {
    width: '100%',
    gap: SPACING.sm + 2,
  },
  modalOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.md,
  },
  modalOptionEmoji: {
    fontSize: 18,
  },
  modalOptionText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 12,
  },
  modalCancelBtn: {
    marginTop: SPACING.lg,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  modalCancelBtnText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
});

export default HomeScreen;
