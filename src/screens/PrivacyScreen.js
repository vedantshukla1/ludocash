import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { COLORS, GRADIENTS, SPACING, RADIUS } from '../utils/theme';

const PrivacyScreen = ({ navigation }) => {
  return (
    <LinearGradient colors={GRADIENTS.background} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="chevron-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.title}>1. Information We Collect</Text>
          <Text style={styles.text}>
            We collect information you provide directly to us, such as when you create or modify your account, contact customer support, or otherwise communicate with us. This may include your name, email address, phone number, and payment information.
          </Text>

          <Text style={styles.title}>2. How We Use Information</Text>
          <Text style={styles.text}>
            We use the information we collect to provide, maintain, and improve our services, process transactions, send related information including confirmations and receipts, and to enforce our terms, conditions, and policies.
          </Text>

          <Text style={styles.title}>3. Sharing of Information</Text>
          <Text style={styles.text}>
            We may share your information with third-party vendors, consultants, and other service providers who need access to such information to carry out work on our behalf (such as payment processors).
          </Text>

          <Text style={styles.title}>4. Security</Text>
          <Text style={styles.text}>
            We take reasonable measures to help protect information about you from loss, theft, misuse, unauthorized access, disclosure, alteration, and destruction.
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

export default PrivacyScreen;
