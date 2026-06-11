import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { COLORS, GRADIENTS, RADIUS, SPACING } from '../utils/theme';

GoogleSignin.configure({
  webClientId: 'YOUR_GOOGLE_WEB_CLIENT_ID', // Replace with actual client ID
});



const LoginScreen = ({ navigation }) => {
  const { login } = useAuth();
  const [tab, setTab] = useState('login'); // login | register
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const tabAnim = useRef(new Animated.Value(0)).current;

  const switchTab = (t) => {
    setTab(t);
    Animated.spring(tabAnim, {
      toValue: t === 'login' ? 0 : 1,
      useNativeDriver: false,
    }).start();
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      return Alert.alert('Missing Fields', 'Please enter your email and password.');
    }
    setLoading(true);
    try {
      const { data } = await authAPI.login({ email: email.trim(), password });
      await login(data.accessToken, data.refreshToken, data.user);
      navigation.replace('Main');
    } catch (err) {
      const msg = err.response?.data?.error || 'Login failed. Please try again.';
      Alert.alert('Login Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!regName.trim() || !regEmail.trim() || !regPassword) {
      return Alert.alert('Missing Fields', 'Please fill all required fields.');
    }
    if (regPassword.length < 6) {
      return Alert.alert('Weak Password', 'Password must be at least 6 characters.');
    }
    setLoading(true);
    try {
      const { data } = await authAPI.register({
        name: regName.trim(),
        email: regEmail.trim(),
        password: regPassword,
      });
      await login(data.accessToken, data.refreshToken, data.user);
      Alert.alert('Welcome! 🎉', '₹50 welcome bonus has been added to your wallet!');
      navigation.replace('Main');
    } catch (err) {
      const msg = err.response?.data?.error || 'Registration failed.';
      Alert.alert('Registration Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const { idToken } = await GoogleSignin.getTokens();

      const { data } = await authAPI.googleLogin({ idToken });
      await login(data.accessToken, data.refreshToken, data.user);
      navigation.replace('Main');
    } catch (err) {
      if (err.code === statusCodes.SIGN_IN_CANCELLED) return;
      const msg = err.response?.data?.error || 'Google sign-in failed.';
      Alert.alert('Google Sign-In Failed', msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  const tabIndicatorLeft = tabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '50%'],
  });

  return (
    <LinearGradient colors={GRADIENTS.background} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.logoText}>🎲 LudoCash</Text>
            <Text style={styles.subtitle}>Real Money Ludo</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            {/* Tab switcher */}
            <View style={styles.tabContainer}>
              <Animated.View style={[styles.tabIndicator, { left: tabIndicatorLeft }]} />
              <TouchableOpacity style={styles.tabButton} onPress={() => switchTab('login')}>
                <Text style={[styles.tabText, tab === 'login' && styles.tabTextActive]}>
                  Login
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.tabButton} onPress={() => switchTab('register')}>
                <Text style={[styles.tabText, tab === 'register' && styles.tabTextActive]}>
                  Register
                </Text>
              </TouchableOpacity>
            </View>

            {tab === 'login' ? (
              <View style={styles.form}>
                <TextInput
                  style={styles.input}
                  placeholder="Email address"
                  placeholderTextColor={COLORS.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <View style={styles.passwordRow}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    placeholder="Password"
                    placeholderTextColor={COLORS.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Text>{showPassword ? '👁️' : '🙈'}</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={handleLogin}
                  disabled={loading}
                >
                  <LinearGradient colors={GRADIENTS.goldButton} style={styles.primaryBtnGrad}>
                    {loading
                      ? <ActivityIndicator color={COLORS.background} />
                      : <Text style={styles.primaryBtnText}>Login 🎮</Text>}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.form}>
                <TextInput
                  style={styles.input}
                  placeholder="Full name"
                  placeholderTextColor={COLORS.textMuted}
                  value={regName}
                  onChangeText={setRegName}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Email address"
                  placeholderTextColor={COLORS.textMuted}
                  value={regEmail}
                  onChangeText={setRegEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Password (min 6 chars)"
                  placeholderTextColor={COLORS.textMuted}
                  value={regPassword}
                  onChangeText={setRegPassword}
                  secureTextEntry
                />


                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={handleRegister}
                  disabled={loading}
                >
                  <LinearGradient colors={GRADIENTS.goldButton} style={styles.primaryBtnGrad}>
                    {loading
                      ? <ActivityIndicator color={COLORS.background} />
                      : <Text style={styles.primaryBtnText}>Create Account 🎉</Text>}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google button */}
            <TouchableOpacity
              style={styles.googleBtn}
              onPress={handleGoogleLogin}
              disabled={googleLoading}
            >
              {googleLoading
                ? <ActivityIndicator color="#000" />
                : (
                  <>
                    <Text style={styles.googleIcon}>G</Text>
                    <Text style={styles.googleText}>WITH GOOGLE</Text>
                  </>
                )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  scroll: { flexGrow: 1, padding: SPACING.md, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: SPACING.xl, marginTop: SPACING.xxl },
  logoText: { fontSize: 28, fontWeight: '900', color: COLORS.gold, letterSpacing: 2 },
  subtitle: { color: COLORS.textSecondary, marginTop: 4, fontSize: 11, letterSpacing: 1 },
  card: {
    backgroundColor: 'rgba(15, 32, 22, 0.75)',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 163, 0.15)',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 255, 163, 0.08)',
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
    position: 'relative',
    overflow: 'hidden',
    height: 44,
  },
  tabIndicator: {
    position: 'absolute',
    width: '50%',
    height: '100%',
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.lg,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  tabText: { color: COLORS.textSecondary, fontWeight: '600', fontSize: 12 },
  tabTextActive: { color: '#060B08', fontWeight: '800' },
  form: { gap: SPACING.sm },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    color: COLORS.white,
    fontSize: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: SPACING.sm,
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  eyeBtn: { padding: SPACING.md },
  primaryBtn: { marginTop: SPACING.sm, borderRadius: RADIUS.md, overflow: 'hidden' },
  primaryBtnGrad: {
    padding: SPACING.md,
    alignItems: 'center',
    borderRadius: RADIUS.md,
  },
  primaryBtnText: { color: COLORS.white, fontSize: 13, fontWeight: '800' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: SPACING.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.15)' },
  dividerText: { color: COLORS.textMuted, marginHorizontal: SPACING.sm, fontSize: 10 },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
  },
  googleIcon: { fontSize: 14, fontWeight: '900', color: '#000' },
  googleText: { color: '#000', fontWeight: '800', fontSize: 11, letterSpacing: 0.5 },
  appleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
  },
  appleIcon: { fontSize: 14, fontWeight: '900', color: '#000' },
  appleText: { color: '#000', fontWeight: '800', fontSize: 11, letterSpacing: 0.5 },
 
  disclaimer: {
    flexDirection: 'row',
    marginTop: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: 'rgba(255,68,68,0.1)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255,68,68,0.3)',
    gap: SPACING.sm,
    alignItems: 'flex-start',
  },
  disclaimerIcon: { fontSize: 13 },
  disclaimerText: { flex: 1, color: 'rgba(255,200,200,0.8)', fontSize: 9, lineHeight: 16 },
});

export default LoginScreen;
