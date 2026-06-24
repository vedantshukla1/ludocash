import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { COLORS, GRADIENTS, SPACING, RADIUS } from '../utils/theme';

const TermsScreen = ({ navigation }) => {
  return (
    <LinearGradient colors={GRADIENTS.background} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="chevron-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms & Conditions</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.title}>1. Introduction</Text>
          <Text style={styles.text}>
            Welcome to LudoCash. By accessing our app, you agree to be bound by these Terms and Conditions. This is a real-money gaming application restricted to users 18 years and older.
          </Text>

          <Text style={styles.title}>2. Eligibility</Text>
          <Text style={styles.text}>
            You must be at least 18 years of age to participate in real-money games. Users from certain restricted states where real-money gaming is prohibited are not allowed to play.
          </Text>

          <Text style={styles.title}>3. Deposits & Withdrawals</Text>
          <Text style={styles.text}>
            Deposited amounts cannot be withdrawn directly. Only winnings from completed matches are added to your withdrawable balance. We reserve the right to verify your identity before processing withdrawals.
          </Text>

          <Text style={styles.title}>4. Fair Play</Text>
          <Text style={styles.text}>
            Any use of cheats, bots, or unauthorized modifications will result in immediate account termination and forfeiture of all balances.
          </Text>

          <Text style={styles.title}>5. Taxes (TDS)</Text>
          <Text style={styles.text}>
            Applicable Tax Deducted at Source (TDS) will be deducted from your net winnings in accordance with government regulations.
          </Text>

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    paddingTop: SPACING.lg + 10,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
  },
  contentContainer: {
    padding: SPACING.md,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  title: {
    color: COLORS.gold,
    fontSize: 16,
    fontWeight: '800',
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  text: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
});

export default TermsScreen;
