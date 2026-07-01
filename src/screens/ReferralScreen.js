import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, StatusBar, ScrollView, ActivityIndicator, Share, Clipboard } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, GRADIENTS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../utils/theme';
import { useAuth } from '../context/AuthContext';
import CustomAlert from '../components/CustomAlert';
import { playSound, playVibration } from '../utils/sounds';
const ReferralScreen = ({
  navigation
}) => {
  const {
    user,
    updateUser
  } = useAuth();
  const [couponCode, setCouponCode] = useState('');
  const [loading, setLoading] = useState(false);

  // Generate a mock referral code based on the user's ID or email, fallback to a random one
  const userReferralCode = user?._id ? `LUDO${user._id.substring(user._id.length - 6).toUpperCase()}` : 'LUDO789XYZ';
  const handleCopyCode = () => {
    playSound('button_click');
    Clipboard.setString(userReferralCode);
    CustomAlert.alert('Copied!', 'Your referral code has been copied to clipboard.');
  };
  const handleShareCode = async () => {
    playSound('button_click');
    try {
      await Share.share({
        message: `Hello sun, ludocash khelo aur geto unlimited money, mera referal ${userReferralCode} use karo pao 10 rupeeebonus`
      });
    } catch (error) {
      console.error(error.message);
    }
  };
  const handleRedeem = async () => {
    if (!couponCode.trim()) {
      playVibration(10);
      CustomAlert.alert('Error', 'Please enter a valid coupon code.');
      return;
    }
    if (couponCode.trim().toUpperCase() === userReferralCode) {
      playVibration(10);
      CustomAlert.alert('Error', 'You cannot use your own referral code!');
      return;
    }
    playSound('button_click');
    setLoading(true);

    // Simulate a network request to the backend
    setTimeout(async () => {
      setLoading(false);
      try {
        // Here we simulate the backend succeeding and returning a +10 wallet update.
        // We update the local state. (In production, walletAPI.redeemReferral would be called)

        const currentBalance = user?.wallet?.balance || 0;
        await updateUser({
          wallet: {
            ...user?.wallet,
            balance: currentBalance + 10
          }
        });
        playSound('home'); // Play a nice success sound
        CustomAlert.alert('Success! 🎉', 'Coupon redeemed successfully. ₹10 has been added to your wallet!');
        setCouponCode('');
      } catch (error) {
        CustomAlert.alert('Error', 'Invalid or expired coupon code.');
      }
    }, 1500);
  };
  return <LinearGradient colors={GRADIENTS.background} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => {
        playSound('button_click');
        navigation.goBack();
      }}>
          <Icon name="arrow-left" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Refer & Earn</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Banner Graphic */}
        <View style={styles.graphicContainer}>
          <Text style={styles.giftEmoji}>🎁</Text>
          <Text style={styles.graphicTitle}>Invite Friends & Earn Cash</Text>
          <Text style={styles.graphicSubtitle}>Get ₹10 instantly for every friend who joins using your code!</Text>
        </View>

        {/* Your Referral Code Section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Referral Code</Text>
          <View style={styles.codeBox}>
            <Text style={styles.codeText}>{userReferralCode}</Text>
          </View>
          
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={(...args) => {
            playSound("button_click");
            return handleCopyCode(...args);
          }}>
              <Icon name="content-copy" size={20} color={COLORS.primary} />
              <Text style={styles.actionBtnText}>Copy Code</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnShare]} onPress={(...args) => {
            playSound("button_click");
            return handleShareCode(...args);
          }}>
              <Icon name="share-variant" size={20} color={COLORS.white} />
              <Text style={[styles.actionBtnText, {
              color: COLORS.white
            }]}>Share Now</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Redeem Code Section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Redeem a Code</Text>
          <Text style={styles.cardSubtitle}>Have a friend's referral code or a promotional coupon? Enter it below to get your ₹10 bonus.</Text>
          
          <View style={styles.inputContainer}>
            <TextInput style={styles.input} placeholder="Enter Coupon Code" placeholderTextColor={COLORS.textMuted} value={couponCode} onChangeText={setCouponCode} autoCapitalize="characters" editable={!loading} />
            <TouchableOpacity style={[styles.redeemBtn, loading && {
            opacity: 0.7
          }]} onPress={(...args) => {
            playSound("button_click");
            return handleRedeem(...args);
          }} disabled={loading}>
              {loading ? <ActivityIndicator color={COLORS.white} size="small" /> : <Text style={styles.redeemBtnText}>Redeem</Text>}
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </LinearGradient>;
};
const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    paddingTop: SPACING.xl,
    backgroundColor: 'rgba(15, 30, 61, 0.9)',
    ...SHADOWS.light
  },
  backButton: {
    padding: SPACING.xs,
    marginRight: SPACING.sm
  },
  headerTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.white
  },
  scrollContent: {
    padding: SPACING.md
  },
  graphicContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl
  },
  giftEmoji: {
    fontSize: 72,
    marginBottom: SPACING.md
  },
  graphicTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.gold,
    marginBottom: SPACING.xs,
    textAlign: 'center'
  },
  graphicSubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: SPACING.lg
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.medium
  },
  cardTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.white,
    marginBottom: SPACING.md
  },
  cardSubtitle: {
    ...TYPOGRAPHY.small,
    color: COLORS.textMuted,
    marginBottom: SPACING.md
  },
  codeBox: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  codeText: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.gold,
    letterSpacing: 2
  },
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.md
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    gap: SPACING.xs
  },
  actionBtnShare: {
    backgroundColor: COLORS.green
  },
  actionBtnText: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 14
  },
  inputContainer: {
    flexDirection: 'row',
    gap: SPACING.sm
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600'
  },
  redeemBtn: {
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md
  },
  redeemBtnText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16
  }
});
export default ReferralScreen;