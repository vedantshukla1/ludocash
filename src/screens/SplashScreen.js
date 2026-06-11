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

const { width, height } = Dimensions.get('window');

const SplashScreen = ({ navigation }) => {
  const { initialized, isLoggedIn } = useAuth();

  // Animations
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo entrance
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Glow pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    ).start();

    // Progress bar
    Animated.timing(progressWidth, {
      toValue: width * 0.65,
      duration: 2000,
      useNativeDriver: false,
    }).start();

    // Tagline
    setTimeout(() => {
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }, 500);

    // Navigate after 2.5s
    const timer = setTimeout(() => {
      if (initialized) {
        navigation.replace(isLoggedIn ? 'Main' : 'Login');
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [initialized, isLoggedIn]);

  return (
    <LinearGradient colors={GRADIENTS.background} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Background decorative circles */}
      <View style={[styles.bgCircle, styles.bgCircle1]} />
      <View style={[styles.bgCircle, styles.bgCircle2]} />

      {/* Logo */}
      <Animated.View
        style={[
          styles.logoContainer,
          { transform: [{ scale: logoScale }], opacity: logoOpacity },
        ]}
      >
        {/* Glow ring */}
        <Animated.View style={[styles.glowRing, { opacity: glowOpacity }]} />

        {/* Logo background */}
        <View style={styles.logoBg}>
          <Text style={styles.logoEmoji}>🎲</Text>
        </View>

        {/* App name */}
        <Text style={styles.appName}>LudoCash</Text>
        <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
          Play. Win. Cash Out.
        </Animated.Text>
      </Animated.View>

      {/* Loading bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <Animated.View
            style={[styles.progressFill, { width: progressWidth }]}
          />
        </View>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>

      {/* Bottom badge */}
      <Text style={styles.bottomBadge}>Real Money Gaming • 18+</Text>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bgCircle: {
    position: 'absolute',
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.1)',
  },
  bgCircle1: {
    width: 300,
    height: 300,
    top: height * 0.1,
    right: -100,
  },
  bgCircle2: {
    width: 250,
    height: 250,
    bottom: height * 0.15,
    left: -80,
    borderColor: 'rgba(255,215,0,0.08)',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  glowRing: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,215,0,0.15)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 40,
    elevation: 20,
  },
  logoBg: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,215,0,0.15)',
    borderWidth: 3,
    borderColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 15,
  },
  logoEmoji: {
    fontSize: 48,
  },
  appName: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFD700',
    letterSpacing: 3,
    textShadowColor: 'rgba(255,215,0,0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  tagline: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 6,
    letterSpacing: 2,
    fontWeight: '500',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 120,
    alignItems: 'center',
    gap: 10,
  },
  progressTrack: {
    width: width * 0.65,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 2,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 5,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    letterSpacing: 1,
  },
  bottomBadge: {
    position: 'absolute',
    bottom: 30,
    color: 'rgba(255,255,255,0.3)',
    fontSize: 9,
    letterSpacing: 1,
  },
});

export default SplashScreen;
