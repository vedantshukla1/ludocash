import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  StatusBar,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { COLORS, GRADIENTS, SPACING, RADIUS, SHADOWS } from '../utils/theme';
import Dice3D from '../components/Dice3D';

const { width, height } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const walletTotal = user?.wallet?.balance || 0;

  // Placeholder actions
  const handleComingSoon = (feature) => alert(`${feature} feature coming soon!`);

  return (
    <LinearGradient colors={GRADIENTS.background} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.profileContainer}>
          <View style={styles.avatarGlow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarEmoji}>👦</Text>
            </View>
          </View>
          <View>
            <Text style={styles.guestText}>Guest</Text>
            <Text style={styles.guestId}>{user?._id?.substring(0,6) || '59328'}</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.coinPill}
          onPress={() => navigation.navigate('Wallet')}
        >
          <View style={styles.coinGlow}>
             <Text style={styles.coinEmoji}>👑</Text>
          </View>
          <View style={styles.coinTextContainer}>
             <Text style={styles.coinAmount}>{walletTotal}</Text>
             <Text style={styles.coinLabel}>coins</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* LUDO ZONE Logo */}
      <View style={styles.logoContainer}>
        <Text style={[styles.logoLudo, styles.textLudoShadow]}>LUDO</Text>
        <Text style={styles.logoLudo}>LUDO</Text>
        <View style={styles.zoneWrapper}>
          <Text style={[styles.logoZone, styles.textZoneShadow]}>ZONE</Text>
          <Text style={styles.logoZone}>ZONE</Text>
        </View>
      </View>

      {/* Center 3D Board Simulation */}
      <View style={styles.centerStage}>
         <View style={styles.boardOuter}>
            <View style={styles.boardInner}>
                <View style={styles.boardRed} />
                <View style={styles.boardGreen} />
                <View style={styles.boardYellow} />
                <View style={styles.boardBlue} />
                <View style={styles.centerStar}>
                   <Text style={{fontSize: 20}}>⭐</Text>
                </View>
            </View>
         </View>

         {/* Floating Dice */}
         <View style={{position: 'absolute', top: -30, left: 40, transform: [{rotate: '-20deg'}]}}>
            <Dice3D value={6} size={50} />
         </View>
         <View style={{position: 'absolute', top: -10, right: 30, transform: [{rotate: '15deg'}]}}>
            <Dice3D value={4} size={55} />
         </View>

         {/* Side Action Buttons - Left */}
         <View style={styles.leftActions}>
            <ActionButton icon="💰" label="Tokens" onPress={() => handleComingSoon('Tokens')} />
            <ActionButton icon="🧩" label="Boards" onPress={() => handleComingSoon('Boards')} />
            <ActionButton icon="🎲" label="Dice" onPress={() => handleComingSoon('Custom Dice')} />
         </View>

         {/* Side Action Buttons - Right */}
         <View style={styles.rightActions}>
            <ActionButton icon="🎡" label="Spin" onPress={() => handleComingSoon('Spin Wheel')} />
            <ActionButton icon="📱" label="Follow" onPress={() => handleComingSoon('Social Follow')} />
            <ActionButton icon="G" label="Google Login" onPress={() => handleComingSoon('Google Auth')} />
         </View>
      </View>

      {/* Bottom Main Buttons */}
      <View style={styles.bottomButtonsContainer}>
        <GameModeCard
          title="Multiplayer"
          gradient={GRADIENTS.red}
          icon="🔴"
          onPress={() => navigation.navigate('SelectFee', { mode: { id: '4player', title: 'Multiplayer' } })}
        />
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <GameModeCard
            title="Computer"
            gradient={GRADIENTS.gold}
            icon="🤖"
            onPress={() => navigation.navigate('ComputerGame', { playersCount: 2 })}
          />
        </Animated.View>
        <GameModeCard
          title="Pass & Play"
          gradient={GRADIENTS.green}
          icon="⚔️"
          onPress={() => handleComingSoon('Pass & Play')}
        />
      </View>

    </LinearGradient>
  );
};

const ActionButton = ({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.actionBtn} onPress={onPress}>
    <LinearGradient colors={GRADIENTS.glassy} style={styles.actionBtnGrad}>
       <Text style={styles.actionBtnIcon}>{icon}</Text>
       <Text style={styles.actionBtnLabel}>{label}</Text>
    </LinearGradient>
  </TouchableOpacity>
);

const GameModeCard = ({ title, gradient, icon, onPress }) => (
  <TouchableOpacity style={styles.gameModeCard} onPress={onPress} activeOpacity={0.8}>
     <LinearGradient colors={gradient} style={styles.gameModeCardGrad}>
        <Text style={styles.gameModeTitle}>{title}</Text>
        <View style={styles.gameModeIconWrapper}>
           <Text style={styles.gameModeIcon}>{icon}</Text>
        </View>
        <Text style={styles.gameModeTitle}>{title}</Text>
     </LinearGradient>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingRight: 20,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(0,201,255,0.3)',
  },
  avatarGlow: {
    padding: 3,
    borderRadius: 25,
    backgroundColor: 'rgba(0,201,255,0.2)',
    ...SHADOWS.glowGlass,
    shadowColor: '#00C9FF',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0F1E3D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 24 },
  guestText: { color: COLORS.white, fontWeight: '900', fontSize: 16 },
  guestId: { color: COLORS.textMuted, fontWeight: '700', fontSize: 12 },
  
  coinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: '#FFD700',
    paddingRight: 15,
    paddingLeft: 2,
    paddingVertical: 2,
    ...SHADOWS.glowGlass,
    shadowColor: '#FFD700',
  },
  coinGlow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFD100',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  coinEmoji: { fontSize: 20 },
  coinTextContainer: { alignItems: 'center' },
  coinAmount: { color: '#FFD700', fontWeight: '900', fontSize: 16 },
  coinLabel: { color: COLORS.white, fontWeight: '700', fontSize: 9, marginTop: -2 },

  logoContainer: {
    alignItems: 'center',
    marginTop: 25,
    zIndex: 10,
  },
  logoLudo: {
    fontSize: 55,
    fontWeight: '900',
    color: '#FFEA00',
    letterSpacing: 2,
    position: 'absolute',
    fontFamily: 'sans-serif-black',
  },
  textLudoShadow: { color: '#FF8C00', top: 5 },
  zoneWrapper: { marginTop: 40 },
  logoZone: {
    fontSize: 40,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 3,
    position: 'absolute',
    fontFamily: 'sans-serif-black',
    alignSelf: 'center',
  },
  textZoneShadow: { color: '#0083B0', top: 4 },

  centerStage: {
    height: 250,
    marginTop: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boardOuter: {
    width: 220,
    height: 220,
    backgroundColor: '#FFD700',
    borderRadius: 20,
    transform: [{ rotateX: '45deg' }, { rotateZ: '45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.gold,
  },
  boardInner: {
    width: 200,
    height: 200,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    flexWrap: 'wrap',
    flexDirection: 'row',
  },
  boardRed: { width: 100, height: 100, backgroundColor: '#FF4444', borderTopLeftRadius: 15 },
  boardGreen: { width: 100, height: 100, backgroundColor: '#00C853', borderTopRightRadius: 15 },
  boardBlue: { width: 100, height: 100, backgroundColor: '#0091EA', borderBottomLeftRadius: 15 },
  boardYellow: { width: 100, height: 100, backgroundColor: '#FFB300', borderBottomRightRadius: 15 },
  centerStar: {
    position: 'absolute',
    top: 75,
    left: 75,
    width: 50,
    height: 50,
    backgroundColor: '#9C27B0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  leftActions: {
    position: 'absolute',
    left: 15,
    top: 0,
    bottom: 0,
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  rightActions: {
    position: 'absolute',
    right: 15,
    top: 0,
    bottom: 0,
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  actionBtn: {
    width: 65,
    height: 65,
    borderRadius: 15,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    ...SHADOWS.glowGlass,
  },
  actionBtnGrad: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnIcon: { fontSize: 24, marginBottom: 2 },
  actionBtnLabel: { color: COLORS.white, fontSize: 9, fontWeight: '800', textAlign: 'center' },

  bottomButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 40,
    height: 140,
  },
  gameModeCard: {
    width: (width - 60) / 3,
    height: 140,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    overflow: 'hidden',
    ...SHADOWS.glowGlass,
  },
  gameModeCardGrad: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
  },
  gameModeTitle: {
    color: COLORS.white,
    fontWeight: '900',
    fontSize: 12,
    textAlign: 'center',
  },
  gameModeIconWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  gameModeIcon: {
    fontSize: 36,
  }
});

export default HomeScreen;
