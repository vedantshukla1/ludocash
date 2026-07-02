import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, Animated, Easing, TouchableOpacity } from 'react-native';
import { playSound, playVibration } from '../utils/sounds';
const Dice3D = ({
  value = 1,
  rolling = false,
  onRollComplete,
  onPress,
  disabled,
  size = 60
}) => {
  const animValue = useRef(new Animated.Value(0)).current;
  const [displayValue, setDisplayValue] = useState(value || 1);
  const latestValue = useRef(value || 1);
  const isAnimating = useRef(false);
  const stopRequested = useRef(false);
  const tossFinished = useRef(false);
  const rollInterval = useRef(null);

  useEffect(() => {
    if (value !== null && value !== undefined) {
      latestValue.current = value;
    }
    
    // Instantly set the display value when rolling stops to guarantee accuracy
    if (!rolling) {
      setDisplayValue(latestValue.current);
    }
  }, [value, rolling]);

  const executeSlamDown = useCallback(() => {
    if (rollInterval.current) {
      clearInterval(rollInterval.current);
      rollInterval.current = null;
    }
    setDisplayValue(latestValue.current);
    playVibration(40); // Heavy thud on landing

    Animated.sequence([
      Animated.timing(animValue, {
        toValue: 2,
        duration: 150,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true
      }),
      Animated.timing(animValue, {
        toValue: 2.5,
        duration: 100,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true
      }),
      Animated.timing(animValue, {
        toValue: 3,
        duration: 100,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true
      })
    ]).start(() => {
      isAnimating.current = false;
      if (onRollComplete) {
        onRollComplete(latestValue.current);
      }
    });
  }, [animValue, onRollComplete]);

  useEffect(() => {
    return () => {
      if (rollInterval.current) clearInterval(rollInterval.current);
    };
  }, []);

  useEffect(() => {
    if (rolling && !isAnimating.current) {
      isAnimating.current = true;
      stopRequested.current = false;
      tossFinished.current = false;
      animValue.setValue(0);
      playSound('dice');

      if (rollInterval.current) clearInterval(rollInterval.current);
      rollInterval.current = setInterval(() => {
        setDisplayValue(Math.floor(Math.random() * 6) + 1);
        playSound('move');
        playVibration(15);
      }, 100);

      // Toss up
      Animated.timing(animValue, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }).start(() => {
        tossFinished.current = true;
        if (stopRequested.current) {
          executeSlamDown();
        }
      });
    } else if (!rolling && isAnimating.current) {
      stopRequested.current = true;
      if (tossFinished.current) {
        executeSlamDown();
      }
    }
  }, [rolling, executeSlamDown, animValue]);
  const baseScale = size / 60;
  const translateY = animValue.interpolate({
    inputRange: [0, 1, 2, 2.5, 3],
    outputRange: [0, -15, 0, -5, 0] // Kept within the box
  });
  const scaleAnim = animValue.interpolate({
    inputRange: [0, 1, 2, 2.5, 3],
    outputRange: [baseScale, baseScale * 1.25, baseScale, baseScale * 1.05, baseScale] // Expand slightly in air
  });
  const spinZ = animValue.interpolate({
    inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1, 2, 3],
    outputRange: ['0deg', '35deg', '-35deg', '35deg', '-35deg', '0deg', '0deg', '0deg'] // Wild shake in air, lock on descent
  });
  const renderDots = () => {
    const positions = {
      tl: {
        top: 6,
        left: 6
      },
      tr: {
        top: 6,
        right: 6
      },
      ml: {
        top: 20.5,
        left: 6
      },
      // Exactly centered vertically (51 internal height)
      mr: {
        top: 20.5,
        right: 6
      },
      bl: {
        bottom: 6,
        left: 6
      },
      br: {
        bottom: 6,
        right: 6
      },
      c: {
        top: 20.5,
        left: 21.5
      } // Exactly centered horizontally (53 internal width)
    };
    const getDotsForValue = val => {
      const v = val || 1; // Fallback to 1
      switch (v) {
        case 1:
          return [positions.c];
        case 2:
          return [positions.tl, positions.br];
        case 3:
          return [positions.tl, positions.c, positions.br];
        case 4:
          return [positions.tl, positions.tr, positions.bl, positions.br];
        case 5:
          return [positions.tl, positions.tr, positions.c, positions.bl, positions.br];
        case 6:
          return [positions.tl, positions.tr, positions.ml, positions.mr, positions.bl, positions.br];
        default:
          return [positions.c];
      }
    };
    const actualDisplayValue = rolling ? displayValue : (value !== null && value !== undefined ? value : (latestValue.current || 1));
    const currentDots = getDotsForValue(actualDisplayValue);
    return currentDots.map((pos, index) => <View key={index} style={[styles.dot, pos, actualDisplayValue === 1 && {
      backgroundColor: '#E53935',
      borderBottomColor: '#B71C1C'
    } // Glossy red dot for 1!
    ]} />);
  };
  return <TouchableOpacity style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} onPress={onPress} disabled={disabled || rolling} activeOpacity={0.8}>
      <Animated.View style={[styles.container, {
      transform: [{
        translateY
      }, {
        scale: scaleAnim
      }, {
        rotateZ: spinZ
      }]
    }]}>
        <View style={styles.diceFace}>
          {/* Subtle glossy glare over the dice */}
          <View style={styles.diceGlare} />
          {renderDots()}
        </View>
      </Animated.View>
    </TouchableOpacity>;
};
const styles = StyleSheet.create({
  container: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center'
  },
  diceFace: {
    width: 56,
    height: 56,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderTopWidth: 1,
    borderTopColor: '#FFFFFF',
    borderLeftWidth: 1,
    borderLeftColor: '#F5F5F5',
    borderBottomWidth: 4,
    borderBottomColor: '#D6D6D6',
    // Smoother 3D edge
    borderRightWidth: 2,
    borderRightColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6
    },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
    overflow: 'hidden' // to contain glare
  },
  diceGlare: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '150%',
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    transform: [{
      rotate: '-25deg'
    }, {
      translateY: -10
    }],
    zIndex: 1 // glare above background, below dots
  },
  dot: {
    position: 'absolute',
    width: 10,
    // Smaller dots
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1A1A1A',
    // Softer black
    borderTopWidth: 1,
    borderTopColor: '#000000',
    // Simulates an indented dot hole
    borderBottomWidth: 1,
    borderBottomColor: '#444444',
    zIndex: 2 // dots above glare
  }
});
export default Dice3D;