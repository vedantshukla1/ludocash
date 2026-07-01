import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, Animated, StyleSheet, View } from 'react-native';
import { PLAYER_COLORS, COLORS } from '../utils/theme';
import { playSound } from '../utils/sounds';

const Piece = ({
  color,
  pieceId,
  isMovable,
  onPress,
  size = 22,
  style
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (isMovable) {
      const pulse = Animated.loop(Animated.sequence([Animated.timing(pulseAnim, {
        toValue: 1.18,
        duration: 500,
        useNativeDriver: true
      }), Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true
      })]));
      const glow = Animated.loop(Animated.sequence([Animated.timing(glowAnim, {
        toValue: 0.8,
        duration: 500,
        useNativeDriver: true
      }), Animated.timing(glowAnim, {
        toValue: 0.2,
        duration: 500,
        useNativeDriver: true
      })]));
      pulse.start();
      glow.start();
      return () => {
        pulse.stop();
        glow.stop();
      };
    } else {
      pulseAnim.setValue(1);
      glowAnim.setValue(0);
    }
  }, [isMovable]);
  const colorInfo = PLAYER_COLORS[color] || PLAYER_COLORS.red;
  const borderRadius = size / 2;

  // Realistic Ludo colors
  const classicColors = {
    red: '#D32F2F',
    blue: '#1976D2',
    green: '#388E3C',
    yellow: '#FBC02D'
  };
  const primaryColor = classicColors[color] || colorInfo.primary;
  return <TouchableOpacity onPress={onPress} disabled={!isMovable} activeOpacity={0.7} style={[style, {
    width: size,
    height: size
  }]}>
      {/* Glow ring when movable */}
      {isMovable && <Animated.View style={[StyleSheet.absoluteFillObject, styles.glowRing, {
      borderRadius: borderRadius + 6,
      borderColor: primaryColor,
      opacity: glowAnim,
      transform: [{
        scale: pulseAnim
      }]
    }]} />}

      {/* Piece Shadow Base (Creates height/depth on board) */}
      <View style={{
      position: 'absolute',
      bottom: -2,
      right: -2,
      width: size,
      height: size,
      borderRadius,
      backgroundColor: 'rgba(0,0,0,0.3)',
      zIndex: 0
    }} />

      {/* Piece body */}
      <Animated.View style={[styles.piece, {
      width: size,
      height: size,
      borderRadius,
      backgroundColor: primaryColor,
      transform: [{
        scale: isMovable ? pulseAnim : 1
      }],
      zIndex: 1
    }]}>
        {/* Ridge / Outer ring of the peg */}
        <View style={[styles.outerRidge, {
        width: size * 0.85,
        height: size * 0.85,
        borderRadius: size * 0.85 / 2,
        borderColor: 'rgba(255,255,255,0.25)',
        borderWidth: size * 0.08
      }]} />

        {/* Inner dome */}
        <View style={[styles.innerCircle, {
        width: size * 0.54,
        height: size * 0.54,
        borderRadius: size * 0.54 / 2,
        backgroundColor: primaryColor,
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 1.5
        },
        shadowOpacity: 0.35,
        shadowRadius: 1,
        elevation: 2
      }]} />

        {/* Specular glossy highlight */}
        <View style={[styles.specularHighlight, {
        width: size * 0.22,
        height: size * 0.22,
        borderRadius: size * 0.22 / 2,
        top: size * 0.1,
        left: size * 0.1
      }]} />
      </Animated.View>
    </TouchableOpacity>;
};
const styles = StyleSheet.create({
  piece: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.25)'
  },
  outerRidge: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center'
  },
  innerCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.8,
    borderColor: 'rgba(255,255,255,0.15)'
  },
  glowRing: {
    position: 'absolute',
    top: -5,
    left: -5,
    right: -5,
    bottom: -5,
    borderWidth: 3,
    zIndex: -1
  },
  specularHighlight: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.75)'
  }
});
export default Piece;