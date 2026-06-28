import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  StatusBar,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS, GRADIENTS } from '../utils/theme';
import { useAuth } from '../context/AuthContext';
import Piece3D from '../components/Piece3D';
import Dice3D from '../components/Dice3D';

const { width, height } = Dimensions.get('window');

const SplashScreen = ({ navigation }) => {
  const { initialized, isLoggedIn } = useAuth();

  // Animations
  const logoScale = useRef(new Animated.Value(0)).current;
  const piecesTranslate = useRef(new Animated.Value(50)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 50,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.spring(piecesTranslate, {
        toValue: 0,
        tension: 40,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Progress bar
    Animated.timing(progressWidth, {
      toValue: width * 0.65,
      duration: 2000,
      useNativeDriver: false,
    }).start();

    // Navigate after 2.5s
    const timer = setTimeout(() => {
      if (initialized) {
        navigation.replace(isLoggedIn ? 'Main' : 'Login');
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [initialized, isLoggedIn]);

  return (
    <LinearGradient colors={GRADIENTS.backgroundSplash} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Diamond Checker Pattern (Simulated with absolute views) */}
      <View style={styles.diamondPatternOverlay}>
         {/* Since a pure CSS diamond grid is heavy, we simulate the vibe with subtle glowing shapes */}
         <View style={[styles.diamond, { top: '10%', left: '20%' }]} />
         <View style={[styles.diamond, { top: '30%', right: '10%', transform: [{ scale: 1.5 }] }]} />
         <View style={[styles.diamond, { bottom: '20%', left: '15%', transform: [{ scale: 1.2 }] }]} />
      </View>

      {/* Center 3D Logo Graphic */}
      <Animated.View style={[styles.logoContainer, { transform: [{ scale: logoScale }] }]}>
        
        {/* Background 3D Pieces & Dice */}
        <Animated.View style={[styles.piecesBehind, { transform: [{ translateY: piecesTranslate }] }]}>
          <View style={{ position: 'absolute', top: -70, left: -60, transform: [{ scale: 1.2 }] }}>
             <Piece3D color="blue" size={50} />
          </View>
          <View style={{ position: 'absolute', top: -90, left: -10, transform: [{ scale: 1.1 }] }}>
             <Piece3D color="yellow" size={50} />
          </View>
          <View style={{ position: 'absolute', top: -85, right: -10, transform: [{ scale: 1.1 }] }}>
             <Piece3D color="green" size={50} />
          </View>
          <View style={{ position: 'absolute', top: -60, right: -50, transform: [{ scale: 1.3 }] }}>
             <Piece3D color="red" size={50} />
          </View>
          <View style={{ position: 'absolute', top: -110, alignSelf: 'center', transform: [{ scale: 1.5 }, { rotate: '15deg' }] }}>
             <Dice3D value={5} size={60} />
          </View>
        </Animated.View>

        {/* 3D Text Logo */}
        <View style={styles.text3DContainer}>
          <Text style={[styles.text3D, styles.textLudoShadow2]}>LUDO</Text>
          <Text style={[styles.text3D, styles.textLudoShadow]}>LUDO</Text>
          <Text style={[styles.text3D, styles.textLudo]}>LUDO</Text>

          <View style={styles.sagaContainer}>
            <Text style={[styles.text3D, styles.textSagaShadow2]}>CASH</Text>
            <Text style={[styles.text3D, styles.textSagaShadow]}>CASH</Text>
            <Text style={[styles.text3D, styles.textSaga]}>CASH</Text>
          </View>
        </View>

      </Animated.View>

      {/* Loading bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diamondPatternOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.1,
  },
  diamond: {
    position: 'absolute',
    width: 100,
    height: 100,
    backgroundColor: 'rgba(255,255,255,0.2)',
    transform: [{ rotate: '45deg' }],
    borderRadius: 10,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -50,
  },
  piecesBehind: {
    position: 'absolute',
    width: '100%',
    height: 100,
    alignItems: 'center',
    zIndex: 1,
  },
  text3DContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    marginTop: 40,
  },
  text3D: {
    fontSize: 75,
    fontWeight: '900',
    letterSpacing: 2,
    position: 'absolute',
    fontFamily: 'sans-serif-black',
  },
  textLudo: {
    color: '#FFEA00', // Bright Yellow
    textShadowColor: '#FFB300',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 1,
  },
  textLudoShadow: {
    color: '#FF8C00', // Orange depth
    top: 6,
  },
  textLudoShadow2: {
    color: '#B25900', // Darker orange depth
    top: 10,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 10 },
    textShadowRadius: 10,
  },
  sagaContainer: {
    marginTop: 70, // Push below LUDO
    alignItems: 'center',
    justifyContent: 'center',
  },
  textSaga: {
    color: '#FF3333', // Bright Red
    fontSize: 55,
    textShadowColor: '#FF6666',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 1,
  },
  textSagaShadow: {
    color: '#CC0000', // Dark red depth
    fontSize: 55,
    top: 5,
  },
  textSagaShadow2: {
    color: '#800000', // Darkest red depth
    fontSize: 55,
    top: 9,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 8 },
    textShadowRadius: 8,
  },
  progressContainer: {
    position: 'absolute',
    bottom: 100,
    alignItems: 'center',
  },
  progressTrack: {
    width: width * 0.65,
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00E676',
    borderRadius: 4,
  },
});

export default SplashScreen;
