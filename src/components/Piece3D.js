import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, TouchableWithoutFeedback } from 'react-native';
import { Audio } from 'expo-av';

const COLORS = {
  red: { body: '#D32F2F', highlight: '#EF9A9A', base: '#B71C1C' },
  blue: { body: '#1565C0', highlight: '#90CAF9', base: '#0D47A1' },
  green: { body: '#2E7D32', highlight: '#A5D6A7', base: '#1B5E20' },
  yellow: { body: '#F9A825', highlight: '#FFF176', base: '#F57F17' },
};

const Piece3D = ({ color = 'red', selected = false, onPress, moving = false, size = 40, style }) => {
  const theme = COLORS[color];
  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  // Sound refs
  const soundPop = useRef(new Audio.Sound());
  const soundThud = useRef(new Audio.Sound());
  const [soundsLoaded, setSoundsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadSounds = async () => {
      try {
        // Preload sounds for zero-latency playback
        // In a real app, ensure these asset paths exist or use correct required modules.
        // We use dummy remote URIs or assume they might be replaced.
        // For standard require: require('../../assets/sounds/pop.mp3')
        // Using safe mock assets if local assets are missing.
        await soundPop.current.loadAsync(
          { uri: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_7d2f97a389.mp3?filename=pop-39222.mp3' },
          { shouldPlay: false }
        );
        await soundThud.current.loadAsync(
          { uri: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3?filename=thud-104443.mp3' },
          { shouldPlay: false }
        );
        if (isMounted) setSoundsLoaded(true);
      } catch (e) {
        console.log('Piece3D sound load error (ignoring if assets missing):', e);
      }
    };
    loadSounds();

    return () => {
      isMounted = false;
      soundPop.current.unloadAsync();
      soundThud.current.unloadAsync();
    };
  }, []);

  useEffect(() => {
    if (selected) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: -12,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1.15,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [selected, translateY, scale]);

  useEffect(() => {
    if (moving) {
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -15,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const playMoveSound = async () => {
        if (soundsLoaded) {
          try {
            await soundPop.current.replayAsync();
          } catch (e) {}
        }
      };
      playMoveSound();
    }
  }, [moving, translateY, soundsLoaded]);

  return (
    <TouchableWithoutFeedback onPress={onPress}>
      <View style={[style, { transform: [{ scale: size / 40 }] }]}>
        <Animated.View style={[
          styles.container,
          {
            transform: [
              { translateY },
              { scale }
            ]
          }
        ]}>
        
        {/* Ball Head */}
        <View style={[styles.ballHead, { backgroundColor: theme.body }]}>
          <View style={[styles.specularBall, { backgroundColor: theme.highlight }]} />
        </View>
        
        {/* Neck */}
        <View style={[styles.neck, { backgroundColor: theme.body }]} />
        
        {/* Cone Body */}
        <View style={[styles.coneBody, { backgroundColor: theme.body }]}>
          <View style={[styles.specularBody, { backgroundColor: theme.highlight }]} />
        </View>
        
        {/* Base */}
        <View style={[
          styles.base, 
          { backgroundColor: theme.base },
          selected && styles.selectedBase
        ]} />
        
        {/* Shadow (Bottom Layer) */}
        <View style={styles.shadow} />
        
        </Animated.View>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: 50,
    height: 70,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 8,
  },
  ballHead: {
    width: 22, 
    height: 22,
    borderRadius: 11,
    marginBottom: -4,
    zIndex: 5,
  },
  specularBall: {
    position: 'absolute',
    width: 6,
    height: 4,
    borderRadius: 3,
    top: 3,
    left: 4,
    transform: [{ rotate: '-30deg' }],
  },
  neck: {
    width: 10, 
    height: 8,
    borderRadius: 4,
    marginTop: -2,
    zIndex: 4,
  },
  coneBody: {
    width: 36, 
    height: 42,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    zIndex: 3,
    marginTop: -4,
    alignItems: 'center',
    overflow: 'hidden',
  },
  specularBody: {
    position: 'absolute',
    width: 6,
    height: 20,
    borderRadius: 3,
    top: 6,
    left: 6,
    transform: [{ rotate: '-15deg' }],
  },
  base: {
    width: 42,
    height: 10,
    borderRadius: 21, // slightly wide oval base
    marginTop: -6,
    zIndex: 2,
  },
  selectedBase: {
    borderWidth: 2,
    borderColor: '#FFD700', // Golden ring border
  },
  shadow: {
    width: 46,
    height: 12,
    borderRadius: 23,
    backgroundColor: 'rgba(0,0,0,0.25)',
    position: 'absolute',
    bottom: -2,
    zIndex: 1,
  }
});

export default Piece3D;
