import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, StatusBar, Alert, Switch,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { COLORS, GRADIENTS, SPACING, RADIUS, SHADOWS } from '../utils/theme';
import { toggleMusic, toggleSfx, isMusicEnabled, isSfxEnabled } from '../utils/sounds';

const MENU_ITEMS = [
  { id: 'history', icon: '📋', label: 'Transaction History', screen: 'Wallet' },
  { id: 'wins', icon: '🏆', label: 'My Wins', screen: null },
  { id: 'support', icon: '💬', label: 'Support', screen: null },
  { id: 'terms', icon: '📄', label: 'Terms & Conditions', screen: 'Terms' },
  { id: 'privacy', icon: '🔒', label: 'Privacy Policy', screen: 'Privacy' },
];

const StatCard = ({ icon, label, value, color }) => (
  <View style={styles.statCard}>
    <Text style={styles.statIcon}>{icon}</Text>
    <Text style={[styles.statValue, color && { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const ProfileScreen = ({ navigation }) => {
  const { user, logout, refreshUser } = useAuth();
  const [musicOn, setMusicOn] = useState(isMusicEnabled());
  const [sfxOn, setSfxOn] = useState(isSfxEnabled());

  const handleToggleMusic = () => setMusicOn(toggleMusic());
  const handleToggleSfx = () => setSfxOn(toggleSfx());

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            navigation.replace('Login');
          },
        },
      ],
    );
  };

  const handleMenuPress = (item) => {
    if (item.screen) {
      navigation.navigate(item.screen);
      return;
    }
    Alert.alert(item.label, 'Coming soon!');
  };

  useFocusEffect(
    React.useCallback(() => {
      refreshUser();
    }, [refreshUser])
  );

  const stats = user?.stats || {};
  const winRate = stats.gamesPlayed > 0
    ? Math.round((stats.wins / stats.gamesPlayed) * 100)
    : 0;

  return (
    <LinearGradient colors={GRADIENTS.background} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>👤 Profile</Text>
        </View>

        {/* Avatar + info */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.name?.[0]?.toUpperCase() || '?'}
              </Text>
            </View>
            <View style={styles.avatarGlow} />
          </View>
          <Text style={styles.displayName}>{user?.name || 'Player'}</Text>
          <Text style={styles.displayEmail}>{user?.email || ''}</Text>

          {/* Wallet mini card */}
          <View style={styles.walletMini}>
            <Text style={styles.walletMiniLabel}>💰 Wallet Balance</Text>
            <Text style={styles.walletMiniAmount}>₹{(user?.wallet?.balance || 0).toFixed(0)}</Text>
          </View>
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <StatCard icon="🎮" label="Games" value={stats.gamesPlayed || 0} />
          <StatCard icon="🏆" label="Wins" value={stats.wins || 0} color={COLORS.gold} />
          <StatCard icon="📊" label="Win Rate" value={`${winRate}%`} color={COLORS.green} />
          <StatCard
            icon="💵"
            label="Earned"
            value={`₹${(stats.totalWithdrawn || 0).toFixed(0)}`}
            color={COLORS.gold}
          />
        </View>

        {/* Settings */}
        <View style={styles.menuSection}>
          <View style={styles.menuItem}>
            <Text style={styles.menuIcon}>🎵</Text>
            <Text style={styles.menuLabel}>Background Music</Text>
            <Switch
              value={musicOn}
              onValueChange={handleToggleMusic}
              trackColor={{ false: '#333', true: COLORS.green }}
              thumbColor={COLORS.white}
            />
          </View>
          <View style={[styles.menuItem, styles.menuItemLast]}>
            <Text style={styles.menuIcon}>🔊</Text>
            <Text style={styles.menuLabel}>Sound Effects & Haptics</Text>
            <Switch
              value={sfxOn}
              onValueChange={handleToggleSfx}
              trackColor={{ false: '#333', true: COLORS.green }}
              thumbColor={COLORS.white}
            />
          </View>
        </View>

        {/* Menu */}
        <View style={styles.menuSection}>
          {MENU_ITEMS.map((item, idx) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.menuItem, idx === MENU_ITEMS.length - 1 && styles.menuItemLast]}
              onPress={() => handleMenuPress(item)}
            >
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>🚪 Logout</Text>
        </TouchableOpacity>

        {/* Version */}
        <Text style={styles.version}>LudoCash v1.0.0 • 18+ Real Money Gaming</Text>

        <View style={{ height: 30 }} />
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: SPACING.md, paddingTop: SPACING.lg + 4 },
  headerTitle: { color: COLORS.gold, fontSize: 16, fontWeight: '900' },
  profileSection: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    paddingBottom: SPACING.xl,
  },
  avatarContainer: { position: 'relative', marginBottom: SPACING.md },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    ...SHADOWS.gold,
  },
  avatarText: { fontSize: 28, fontWeight: '900', color: COLORS.background },
  avatarGlow: {
    position: 'absolute',
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: 'rgba(255,255,255,0.1)',
    top: -8,
    left: -8,
  },
  displayName: { color: COLORS.white, fontSize: 16, fontWeight: '800', marginBottom: 4 },
  displayEmail: { color: COLORS.textMuted, fontSize: 10, marginBottom: SPACING.md },
  walletMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.full,
    ...SHADOWS.medium,
  },
  walletMiniLabel: { color: COLORS.textSecondary, fontSize: 10 },
  walletMiniAmount: { color: COLORS.gold, fontWeight: '900', fontSize: 12 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: SPACING.md,
    gap: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  statCard: {
    flex: 1,
    minWidth: '44%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    gap: 4,
    ...SHADOWS.medium,
  },
  statIcon: { fontSize: 16 },
  statValue: { color: COLORS.white, fontSize: 15, fontWeight: '900' },
  statLabel: { color: COLORS.textMuted, fontSize: 9 },
  menuSection: {
    margin: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  menuItemLast: { borderBottomWidth: 0 },
  menuIcon: { fontSize: 14, width: 26 },
  menuLabel: { flex: 1, color: COLORS.white, fontSize: 11, fontWeight: '600' },
  menuArrow: { color: COLORS.textMuted, fontSize: 16, fontWeight: '300' },
  logoutBtn: {
    marginHorizontal: SPACING.md,
    padding: SPACING.md,
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: 'rgba(255,68,68,0.4)',
    backgroundColor: 'rgba(255,68,68,0.08)',
    marginBottom: SPACING.md,
  },
  logoutText: { color: COLORS.error, fontWeight: '700', fontSize: 12 },
  version: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: 9,
    marginBottom: SPACING.sm,
  },
});

export default ProfileScreen;
