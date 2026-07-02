import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, TouchableWithoutFeedback, TouchableOpacity } from 'react-native';
import { playSound } from '../utils/sounds';

const COLORS = {
  red: { body: '#D32F2F', highlight: '#EF9A9A', base: '#B71C1C' },
  blue: { body: '#1565C0', highlight: '#90CAF9', base: '#0D47A1' },
  green: { body: '#2E7D32', highlight: '#A5D6A7', base: '#1B5E20' },
  yellow: { body: '#F9A825', highlight: '#FFF176', base: '#F57F17' },
};

const Piece3D = ({ color = 'red', selected = false, onPress, moving = false, size = 40, style }) => {
  const theme = COLORS[color] || COLORS.red;
  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (selected) {
      Animated.spring(scale, {
        toValue: 1.15,
        useNativeDriver: true,
      }).start();

      let isLooping = true;
      const startLoop = () => {
        if (!isLooping) return;
        
        Animated.parallel([
          Animated.sequence([
            Animated.timing(glowAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
            Animated.timing(glowAnim, { toValue: 0, duration: 800, useNativeDriver: true })
          ]),
          Animated.sequence([
            Animated.timing(translateY, { toValue: -12, duration: 800, useNativeDriver: true }),
            Animated.timing(translateY, { toValue: -8, duration: 800, useNativeDriver: true })
          ])
        ]).start(() => {
          if (isLooping) {
            startLoop();
          }
        });
      };
      
      startLoop();
      
      return () => {
        isLooping = false;
        glowAnim.stopAnimation();
        translateY.stopAnimation();
        scale.stopAnimation();
      };
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
      
      glowAnim.stopAnimation();
      glowAnim.setValue(0);
    }
  }, [selected, translateY, scale, glowAnim]);

  useEffect(() => {
    if (moving) {
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -15,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        })
      ]).start();
      playSound('move');
    }
  }, [moving, translateY]);

  // Dimensions based on size
  const headSize = size * 0.45;
  const bodyWidth = size * 0.55;
  const bodyHeight = size * 0.6;
  const baseWidth = size * 0.75;
  const baseHeight = size * 0.25;

  const touchPadding = size * 0.15;

  return (
    <TouchableOpacity 
      activeOpacity={0.8}
      onPress={onPress} 
      disabled={!selected && !moving}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={{
        width: size + touchPadding * 2,
        height: size * 1.2 + touchPadding * 2,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View style={[style, { width: size, height: size * 1.2, alignItems: 'center', justifyContent: 'flex-end' }]}>
        <Animated.View style={{
          alignItems: 'center',
          justifyContent: 'flex-end',
          transform: [{ translateY }, { scale }]
        }}>
          {/* Glowing Aura when Selectable */}
          {selected && (
            <Animated.View style={{
              position: 'absolute',
              bottom: size * 0.0,
              width: baseWidth * 1.6,
              height: baseWidth * 1.6, // Circular glow
              borderRadius: baseWidth * 0.8,
              backgroundColor: theme.highlight, // Glow matches the piece's color
              opacity: glowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.2, 0.7] // Pulsates opacity
              }),
              transform: [{ scale: glowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.8, 1.2] // Pulsates size
              })}],
              zIndex: 0,
            }} />
          )}

          {/* Head */}
          <View style={{
            width: headSize,
            height: headSize,
            borderRadius: headSize / 2,
            backgroundColor: theme.body,
            zIndex: 3,
            shadowColor: '#000',
            shadowOffset: { width: -3, height: 4 },
            shadowOpacity: 0.5,
            shadowRadius: 4,
            elevation: 6,
          }}>
            {/* Enhanced Glare for premium 3D effect */}
            <View style={{
              position: 'absolute',
              top: '8%',
              left: '12%',
              width: '45%',
              height: '45%',
              borderRadius: headSize,
              backgroundColor: 'rgba(255,255,255,0.6)',
              transform: [{ rotate: '-35deg' }]
            }} />
          </View>

          {/* Body */}
          <View style={{
            width: bodyWidth,
            height: bodyHeight,
            backgroundColor: theme.body,
            borderTopLeftRadius: 5,
            borderTopRightRadius: 5,
            borderBottomLeftRadius: 2,
            borderBottomRightRadius: 2,
            marginTop: -size * 0.1, // hide under head
            zIndex: 2,
            transform: [{ perspective: 100 }, { rotateX: '35deg' }], // 3D cone perspective
            elevation: 3,
          }} />

          {/* Base */}
          <View style={[
            {
              width: baseWidth,
              height: baseHeight,
              borderRadius: baseWidth / 2,
              backgroundColor: theme.body, // Single color!
              marginTop: -size * 0.15,
              zIndex: 1,
              elevation: 2,
            },
            selected && { borderWidth: 2, borderColor: theme.highlight } // Border matches piece color
          ]} />

          {/* Shadow */}
          <View style={{
            position: 'absolute',
            bottom: -size * 0.05,
            width: size * 0.7,
            height: size * 0.2,
            borderRadius: size * 0.35,
            backgroundColor: 'rgba(0,0,0,0.3)',
            zIndex: 0,
          }} />
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
};

export default Piece3D;
