import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../context/AuthContext';
import { COLORS, GRADIENTS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../utils/theme';

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const { user, logout } = useAuth();

  const gameModes = [
    {
      id: '2player',
      title: '2 Player',
      icon: 'account-multiple',
      color: GRADIENTS.primary,
    },
    {
      id: '4player',
      title: '4 Player',
      icon: 'account-group',
      color: GRADIENTS.secondary,
    },
    {
      id: 'private',
      title: 'Play with Friends',
      icon: 'account-heart',
      color: GRADIENTS.gold,
    },
    {
      id: 'computer',
      title: 'Play vs Computer',
      icon: 'desktop-classic',
      color: GRADIENTS.darkCard,
    },
  ];

  const handleModeSelect = (mode) => {
    if (mode.id === 'computer') {
      navigation.navigate('ComputerGame', { playersCount: 2 });
    } else {
      navigation.navigate('SelectFee', { mode });
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={COLORS.background} barStyle="light-content" />
      <LinearGradient colors={GRADIENTS.background} style={styles.background} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <View style={styles.avatarContainer}>
            <Icon name="account" size={24} color={COLORS.primary} />
          </View>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.username}>
              {user?.username || 'Guest'}
            </Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.walletButton}
          onPress={() => navigation.navigate('Wallet')}
        >
          <Icon name="wallet" size={20} color={COLORS.secondary} />
          <Text style={styles.balanceText}>
            ₹{user?.wallet?.balance || '0.00'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Banner */}
        <LinearGradient
          colors={GRADIENTS.gold}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.banner}
        >
          <View style={styles.bannerContent}>
            <Text style={styles.bannerTitle}>Play & Win Real Cash!</Text>
            <Text style={styles.bannerSubtitle}>Join tournaments everyday</Text>
            <TouchableOpacity style={styles.bannerButton}>
              <Text style={styles.bannerButtonText}>Join Now</Text>
            </TouchableOpacity>
          </View>
          <Icon name="trophy" size={80} color="rgba(255,255,255,0.3)" style={styles.bannerIcon} />
        </LinearGradient>

        {/* Game Modes */}
        <Text style={styles.sectionTitle}>Select Game Mode</Text>
        <View style={styles.modesGrid}>
          {gameModes.map((mode) => (
            <TouchableOpacity
              key={mode.id}
              style={styles.modeCardContainer}
              onPress={() => handleModeSelect(mode)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={mode.color}
                style={styles.modeCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Icon name={mode.icon} size={40} color={COLORS.white} />
                <Text style={styles.modeTitle}>{mode.title}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    paddingTop: SPACING.xl,
    backgroundColor: 'rgba(15, 30, 61, 0.8)',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.round,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  greeting: {
    ...TYPOGRAPHY.small,
    color: COLORS.textMuted,
  },
  username: {
    ...TYPOGRAPHY.body,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  walletButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.round,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  balanceText: {
    ...TYPOGRAPHY.body,
    fontWeight: 'bold',
    color: COLORS.white,
    marginLeft: SPACING.xs,
  },
  scrollContent: {
    padding: SPACING.md,
  },
  banner: {
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: SPACING.xl,
    ...SHADOWS.gold,
  },
  bannerContent: {
    flex: 1,
    zIndex: 1,
  },
  bannerTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.background,
    marginBottom: SPACING.xs,
  },
  bannerSubtitle: {
    ...TYPOGRAPHY.small,
    color: 'rgba(15, 30, 61, 0.8)',
    marginBottom: SPACING.md,
  },
  bannerButton: {
    backgroundColor: COLORS.background,
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.round,
  },
  bannerButtonText: {
    ...TYPOGRAPHY.small,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  bannerIcon: {
    position: 'absolute',
    right: -10,
    bottom: -10,
    transform: [{ rotate: '-15deg' }],
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.white,
    marginBottom: SPACING.md,
  },
  modesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  modeCardContainer: {
    width: (width - SPACING.md * 3) / 2,
    aspectRatio: 1,
    marginBottom: SPACING.md,
    borderRadius: RADIUS.lg,
    ...SHADOWS.medium,
  },
  modeCard: {
    flex: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeTitle: {
    ...TYPOGRAPHY.body,
    fontWeight: 'bold',
    color: COLORS.white,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
});

export default HomeScreen;
