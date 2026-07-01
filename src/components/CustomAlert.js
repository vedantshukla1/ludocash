import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Easing, Alert } from 'react-native';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../utils/theme';
import { playSound } from '../utils/sounds';

let alertRef = null;
export const CustomAlertManager = () => {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState(null);
  const scaleValue = useRef(new Animated.Value(0.8)).current;
  const opacityValue = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    alertRef = {
      show: (title, message, buttons) => {
        setConfig({
          title,
          message,
          buttons: buttons || [{
            text: 'OK'
          }]
        });
        setVisible(true);
        Animated.parallel([Animated.spring(scaleValue, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true
        }), Animated.timing(opacityValue, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true
        })]).start();
      }
    };
  }, []);
  const handleClose = onPress => {
    Animated.parallel([Animated.timing(scaleValue, {
      toValue: 0.8,
      duration: 150,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true
    }), Animated.timing(opacityValue, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true
    })]).start(() => {
      setVisible(false);
      if (onPress) onPress();
    });
  };
  if (!visible || !config) return null;
  return <Modal transparent visible={visible} animationType="none" onRequestClose={() => {}}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.alertBox, {
        transform: [{
          scale: scaleValue
        }],
        opacity: opacityValue
      }]}>
          <Text style={styles.title}>{config.title}</Text>
          <Text style={styles.message}>{config.message}</Text>
          
          <View style={styles.buttonRow}>
            {config.buttons.map((btn, index) => {
            const isDestructive = btn.style === 'destructive';
            const isCancel = btn.style === 'cancel';
            let btnBg = 'rgba(255,255,255,0.08)';
            let btnTextCol = COLORS.white;
            if (isDestructive) {
              btnBg = 'rgba(211,47,47,0.15)';
              btnTextCol = '#FF5252';
            } else if (!isCancel && (index === config.buttons.length - 1 || config.buttons.length === 1)) {
              // Primary button (usually the last one)
              btnBg = 'rgba(255, 184, 0, 0.15)'; // Gold tint
              btnTextCol = COLORS.gold;
            }
            return <TouchableOpacity key={index} style={[styles.button, {
              backgroundColor: btnBg
            }]} onPress={() => {
              playSound("button_click");
              return handleClose(btn.onPress);
            }}>
                  <Text style={[styles.buttonText, {
                color: btnTextCol
              }]}>
                    {btn.text}
                  </Text>
                </TouchableOpacity>;
          })}
          </View>
        </Animated.View>
      </View>
    </Modal>;
};
const CustomAlert = {
  alert: (title, message, buttons) => {
    if (alertRef) {
      alertRef.show(title, message, buttons);
    } else {
      // Fallback to native if not mounted yet
      Alert.alert(title, message, buttons);
    }
  }
};
export default CustomAlert;
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg
  },
  alertBox: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    ...SHADOWS.medium
  },
  title: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: SPACING.sm,
    textAlign: 'center'
  },
  message: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 20
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    width: '100%',
    justifyContent: 'center'
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center'
  },
  buttonText: {
    fontWeight: '700',
    fontSize: 14
  }
});