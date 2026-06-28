import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, TouchableWithoutFeedback } from 'react-native';
import { playSound } from '../utils/sounds';

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

      playSound('move');
    }
  }, [moving, translateY]);

  return (
    <TouchableWithoutFeedback onPress={onPress}>
      <View style={[style, { width: size, height: size, alignItems: 'center', justifyContent: 'flex-end' }]}>
        <Animated.View style={[
          styles.container,
          {
            transform: [
              { scale: size / 50 },
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 8,
    // Add margin bottom so the base aligns inside the bounding box
    marginBottom: -15,
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
