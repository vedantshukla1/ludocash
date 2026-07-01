import React, { useEffect, useRef, useState } from 'react';
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

const { width } = Dimensions.get('window');

const SplashScreen = ({ navigation }) => {
  const { initialized, isLoggedIn } = useAuth();
  const [animationDone, setAnimationDone] = useState(false);
  const hasNavigated = useRef(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Elegant fade-in entrance
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1200,
      useNativeDriver: true,
    }).start();

    // Progress bar
    Animated.timing(progressWidth, {
      toValue: width * 0.5, // slightly shorter for minimalism
      duration: 2000,
      useNativeDriver: false,
    }).start();

    // Set animation as done after 2.5s
    const timer = setTimeout(() => {
      setAnimationDone(true);
    }, 2500);

    // Safety fallback — force navigate after 5s no matter what
    const fallback = setTimeout(() => {
      if (!hasNavigated.current) {
        hasNavigated.current = true;
        navigation.replace('Login');
      }
    }, 5000);

    return () => {
      clearTimeout(timer);
      clearTimeout(fallback);
    };
  }, []); // Only run once on mount!

  useEffect(() => {
    // Navigate ONLY when BOTH animation is done and auth is initialized
    if (animationDone && initialized && !hasNavigated.current) {
      hasNavigated.current = true;
      navigation.replace(isLoggedIn ? 'Main' : 'Login');
    }
  }, [animationDone, initialized, isLoggedIn, navigation]);

  return (
    <LinearGradient colors={GRADIENTS.backgroundSplash} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Minimalist Logo */}
      <Animated.View style={[styles.logoContainer, { opacity: fadeAnim }]}>
        <Text style={styles.titleText}>LUDO<Text style={styles.highlightText}>CASH</Text></Text>
        <Text style={styles.subtitleText}>PLAY & WIN</Text>
      </Animated.View>

      {/* Refined Loading bar */}
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
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 42,
    fontWeight: '300',
    color: COLORS.white,
    letterSpacing: 4,
  },
  highlightText: {
    fontWeight: '900',
    color: COLORS.gold,
  },
  subtitleText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 8,
    marginTop: 12,
  },
  progressContainer: {
    position: 'absolute',
    bottom: 80,
    alignItems: 'center',
  },
  progressTrack: {
    width: width * 0.5,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.gold,
    borderRadius: 2,
  },
});

export default SplashScreen;
