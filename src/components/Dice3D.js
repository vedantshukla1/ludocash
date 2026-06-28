import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Easing, TouchableOpacity } from 'react-native';
import { playSound } from '../utils/sounds';

const Dice3D = ({ value = 1, rolling = false, onRollComplete, onPress, disabled, size = 60 }) => {
  const rotateX = useRef(new Animated.Value(0)).current;
  const rotateY = useRef(new Animated.Value(0)).current;
  const [displayValue, setDisplayValue] = useState(value);
  const latestValue = useRef(value);
  const isAnimating = useRef(false);

  useEffect(() => {
    latestValue.current = value;
  }, [value]);

  useEffect(() => {
    if (rolling) {
      isAnimating.current = true;
      // Play sound
      playSound('dice');

      // Animate roll
      rotateX.setValue(0);
      rotateY.setValue(0);
      
      Animated.sequence([
        Animated.parallel([
          Animated.timing(rotateX, {
            toValue: 720,
            duration: 600,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(rotateY, {
            toValue: 540,
            duration: 600,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          })
        ]),
        Animated.spring(rotateX, {
          toValue: 720, // Spring back to a flat orientation visually
          friction: 4,
          tension: 20,
          useNativeDriver: true,
        })
      ]).start(() => {
        isAnimating.current = false;
        setDisplayValue(latestValue.current);
        if (onRollComplete) {
          onRollComplete(latestValue.current);
        }
      });

      // While rolling, randomly change display value to simulate different faces passing by
      let interval = setInterval(() => {
        setDisplayValue(Math.floor(Math.random() * 6) + 1);
      }, 100);
      
      setTimeout(() => {
        clearInterval(interval);
      }, 500);
    } else {
      if (!isAnimating.current) {
        setDisplayValue(value);
      }
    }
  }, [rolling]);

  const spinX = rotateX.interpolate({
    inputRange: [0, 720],
    outputRange: ['0deg', '720deg']
  });

  const spinY = rotateY.interpolate({
    inputRange: [0, 540],
    outputRange: ['0deg', '540deg']
  });

  const renderDots = () => {
    const dots = [];
    const positions = {
      tl: { top: 8, left: 8 },
      tr: { top: 8, right: 8 },
      ml: { top: 22, left: 8 },
      mr: { top: 22, right: 8 },
      bl: { bottom: 8, left: 8 },
      br: { bottom: 8, right: 8 },
      c:  { top: 22, left: 22 },
    };

    const getDotsForValue = (val) => {
      if (val === null || val === undefined) return [];
      switch (val) {
        case 1: return [positions.c];
        case 2: return [positions.tl, positions.br];
        case 3: return [positions.tl, positions.c, positions.br];
        case 4: return [positions.tl, positions.tr, positions.bl, positions.br];
        case 5: return [positions.tl, positions.tr, positions.c, positions.bl, positions.br];
        case 6: return [positions.tl, positions.tr, positions.ml, positions.mr, positions.bl, positions.br];
        default: return [positions.c];
      }
    };

    const currentDots = getDotsForValue(displayValue);

    return currentDots.map((pos, index) => (
      <View key={index} style={[styles.dot, pos]} />
    ));
  };

  return (
    <TouchableOpacity onPress={onPress} disabled={disabled || rolling} activeOpacity={0.8}>
      <Animated.View style={[
        styles.container,
        {
          transform: [
            { scale: size / 60 },
            { perspective: 800 },
            { rotateX: spinX },
            { rotateY: spinY }
          ]
        }
      ]}>
      <View style={styles.diceBase}>
        {/* Top face illusion */}
        <View style={styles.topIllusion} />
        {/* Right face illusion */}
        <View style={styles.rightIllusion} />
        
        {/* Dots container */}
        <View style={styles.dotsContainer}>
          {renderDots()}
        </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 60,
    height: 60,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 10,
  },
  diceBase: {
    width: 60,
    height: 60,
    backgroundColor: '#F5DEB3', // warm cream/beige wood color
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#D2B48C', // 3D edge darker shade left
    borderBottomWidth: 3,
    borderBottomColor: '#C19A6B', // Bottom darker edge
    overflow: 'hidden',
    position: 'relative',
  },
  topIllusion: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.4)', // slightly lighter
  },
  rightIllusion: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.1)', // slightly darker
  },
  dotsContainer: {
    flex: 1,
    position: 'relative',
  },
  dot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2C1810', // dark brown
    // Inner shadow simulation for depth (React Native doesn't have true inner shadow)
    // We simulate it using borders
    borderTopWidth: 1,
    borderTopColor: '#1A0E09',
    borderLeftWidth: 1,
    borderLeftColor: '#1A0E09',
    borderBottomWidth: 1,
    borderBottomColor: '#4A281A',
    borderRightWidth: 1,
    borderRightColor: '#4A281A',
  }
});

export default Dice3D;
