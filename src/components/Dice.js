import React, { useEffect, useRef, useState } from 'react';
import { TouchableOpacity, Animated, StyleSheet, View, Text } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS } from '../utils/theme';

const DICE_FACES = {
  1: [[false, false, false], [false, true, false], [false, false, false]],
  2: [[false, false, true], [false, false, false], [true, false, false]],
  3: [[false, false, true], [false, true, false], [true, false, false]],
  4: [[true, false, true], [false, false, false], [true, false, true]],
  5: [[true, false, true], [false, true, false], [true, false, true]],
  6: [[true, false, true], [true, false, true], [true, false, true]],
};

const DiceComponent = ({ value, rolling, onPress, disabled, size = 62 }) => {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const jumpAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shakeXAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  const [tempValue, setTempValue] = useState(null);

  useEffect(() => {
    let interval;
    if (rolling) {
      // Rapidly shuffle the visible dice faces to simulate the spinning cube
      interval = setInterval(() => {
        setTempValue(Math.floor(Math.random() * 6) + 1);
      }, 70);

      // Reset values
      spinAnim.setValue(0);
      jumpAnim.setValue(0);
      scaleAnim.setValue(1);
      shakeXAnim.setValue(0);

      // Start looping 3D physics animations
      Animated.parallel([
        // Continuous rotation
        Animated.loop(
          Animated.timing(spinAnim, { toValue: 1, duration: 350, useNativeDriver: true })
        ),
        // Rhythmic jumping arches
        Animated.loop(
          Animated.sequence([
            Animated.timing(jumpAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
            Animated.timing(jumpAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
          ])
        ),
        // Horizontal vibration/shake
        Animated.loop(
          Animated.sequence([
            Animated.timing(shakeXAnim, { toValue: 6, duration: 80, useNativeDriver: true }),
            Animated.timing(shakeXAnim, { toValue: -6, duration: 80, useNativeDriver: true }),
            Animated.timing(shakeXAnim, { toValue: 0, duration: 80, useNativeDriver: true }),
          ])
        ),
      ]).start();
    } else {
      if (interval) clearInterval(interval);
      setTempValue(null);

      // Gracefully snap back animations
      spinAnim.stopAnimation(() => spinAnim.setValue(0));
      jumpAnim.stopAnimation(() => jumpAnim.setValue(0));
      shakeXAnim.stopAnimation(() => shakeXAnim.setValue(0));
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }).start();
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [rolling]);

  // Glow pulse when it's your turn and you haven't rolled
  useEffect(() => {
    if (!disabled && !rolling) {
      const glow = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        ]),
      );
      glow.start();
      return () => glow.stop();
    } else {
      glowAnim.setValue(0.3);
    }
  }, [disabled, rolling]);

  // Interpolated rotations for a premium 3D effect
  const rotateX = spinAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '180deg', '360deg'],
  });
  const rotateY = spinAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '270deg', '540deg'],
  });
  const rotateZ = spinAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '90deg', '180deg'],
  });

  // Squash/stretch scaling on jumps
  const scale = jumpAnim.interpolate({
    inputRange: [0, 0.15, 1],
    outputRange: [0.92, 1.0, 1.22],
  });

  // Vertical jump distance (offset up to 35% of dice size)
  const translateY = jumpAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -size * 0.35],
  });

  const displayValue = tempValue || value || 6;
  const face = DICE_FACES[displayValue] || DICE_FACES[6];

  // Proportionate scaling calculations
  const padding = size * (7 / 62);
  const dotSlotSize = size * (14 / 62);
  const dotSize = size * (10 / 62);
  const dotRadius = dotSize / 2;

  // Proportional border sizes
  const borderWidth = Math.max(1, size * (1.2 / 62));
  const borderBottomWidth = Math.max(1.5, size * (4.5 / 62));
  const borderRightWidth = Math.max(1.2, size * (3.8 / 62));

  return (
    <Animated.View
      style={[
        styles.glowWrapper,
        {
          opacity: glowAnim,
          shadowRadius: size * (12 / 62),
          transform: [{ scale: glowAnim.interpolate({ inputRange: [0.3, 1], outputRange: [1, 1.08] }) }],
        },
      ]}
    >
      <TouchableOpacity onPress={onPress} disabled={disabled || rolling} activeOpacity={0.85} style={styles.touchable}>
        {/* Dynamic Physical Shadow under the dice */}
        <Animated.View
          style={[
            styles.diceShadow,
            {
              width: size * 0.85,
              height: size * 0.85,
              borderRadius: size * (12 / 62),
              opacity: rolling 
                ? jumpAnim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.12] })
                : 0.35,
              transform: [
                {
                  scale: rolling
                    ? jumpAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.15] })
                    : 1,
                },
                {
                  translateY: rolling
                    ? jumpAnim.interpolate({ inputRange: [0, 1], outputRange: [size * 0.05, size * 0.18] })
                    : size * 0.05,
                },
              ],
            },
          ]}
        />

        {/* Dice Body */}
        <Animated.View
          style={[
            styles.diceOuter,
            {
              width: size,
              height: size,
              borderRadius: size * (12 / 62),
              borderWidth,
              borderBottomWidth,
              borderRightWidth,
              borderTopColor: disabled ? '#666' : '#FFFFFF',
              borderLeftColor: disabled ? '#666' : '#FFFFFF',
              borderRightColor: disabled ? '#444' : '#E0E0E0',
              borderBottomColor: disabled ? '#333' : '#CCCCCC',
              transform: [
                { perspective: 300 },
                { scale: rolling ? scale : scaleAnim },
                { translateX: shakeXAnim },
                { translateY: rolling ? translateY : 0 },
                { rotateX },
                { rotateY },
                { rotateZ },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={disabled ? ['#555', '#333'] : ['#FFFFFF', '#F8F9FA', '#E9ECEF']}
            style={[styles.dice, { padding }]}
          >
            {face.map((row, ri) => (
              <View key={ri} style={styles.diceRow}>
                {row.map((dot, ci) => (
                  <View key={ci} style={[styles.dotSlot, { width: dotSlotSize, height: dotSlotSize }]}>
                    {dot && (
                      <View style={[
                        styles.dot,
                        {
                          width: dotSize,
                          height: dotSize,
                          borderRadius: dotRadius,
                          backgroundColor: disabled ? '#888' : '#111111',
                          borderColor: disabled ? '#666' : '#000000',
                          borderWidth: size * (0.8 / 62),
                        }
                      ]}>
                        {!disabled && (
                          <View style={[
                            styles.dotInsetHighlight,
                            {
                              width: dotSize * 0.35,
                              height: dotSize * 0.35,
                              borderRadius: (dotSize * 0.35) / 2,
                            }
                          ]} />
                        )}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            ))}

            {!disabled && (
              <LinearGradient
                colors={['rgba(255,255,255,0.45)', 'rgba(255,255,255,0.08)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.8, y: 0.8 }}
                style={StyleSheet.absoluteFillObject}
                pointerEvents="none"
              />
            )}
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  glowWrapper: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    elevation: 10,
  },
  touchable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  diceShadow: {
    position: 'absolute',
    backgroundColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.65,
    shadowRadius: 5,
    elevation: 4,
  },
  diceOuter: {
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
  },
  dice: {
    flex: 1,
    justifyContent: 'space-between',
  },
  diceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dotSlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.35,
    shadowRadius: 1,
    elevation: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  dotInsetHighlight: {
    position: 'absolute',
    top: 1,
    left: 1,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
});

export default DiceComponent;
