import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS, SHADOWS } from '../utils/theme';

// Screens
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import SelectFeeScreen from '../screens/SelectFeeScreen';
import GameScreen from '../screens/GameScreen';
import ResultScreen from '../screens/ResultScreen';
import WalletScreen from '../screens/WalletScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ComputerGameScreen from '../screens/ComputerGameScreen';
import TermsScreen from '../screens/TermsScreen';
import PrivacyScreen from '../screens/PrivacyScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

import Icon from 'react-native-vector-icons/Ionicons';

const TabIcon = ({ name, focused }) => {
  const icons = {
    Home: focused ? 'home' : 'home-outline',
    Wallet: focused ? 'wallet' : 'wallet-outline',
    Leaderboard: focused ? 'trophy' : 'trophy-outline',
    Profile: focused ? 'person' : 'person-outline',
  };

  const iconName = icons[name] || 'ellipse-outline';
  const color = focused ? COLORS.gold : COLORS.textMuted;

  return (
    <View style={styles.tabIcon}>
      <Icon name={iconName} size={20} color={color} />
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{name}</Text>
    </View>
  );
};

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarStyle: styles.tabBar,
      tabBarShowLabel: false,
      tabBarHideOnKeyboard: true,
      tabBarBackground: () => (
        <View style={styles.tabBarBackground} />
      ),
    }}
  >
    <Tab.Screen
      name="Home"
      component={HomeScreen}
      options={{ tabBarIcon: ({ focused }) => <TabIcon name="Home" focused={focused} /> }}
    />
    <Tab.Screen
      name="Wallet"
      component={WalletScreen}
      options={{ tabBarIcon: ({ focused }) => <TabIcon name="Wallet" focused={focused} /> }}
    />
    <Tab.Screen
      name="Leaderboard"
      component={LeaderboardScreen}
      options={{ tabBarIcon: ({ focused }) => <TabIcon name="Leaderboard" focused={focused} /> }}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileScreen}
      options={{ tabBarIcon: ({ focused }) => <TabIcon name="Profile" focused={focused} /> }}
    />
  </Tab.Navigator>
);

const AppNavigator = () => {
  const { initialized, isLoggedIn } = useAuth();

  if (!initialized) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Splash" component={SplashScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{ headerShown: false, animation: 'fade' }}
        initialRouteName={isLoggedIn ? 'Main' : 'Splash'}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen
          name="SelectFee"
          component={SelectFeeScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="Game"
          component={GameScreen}
          options={{ animation: 'slide_from_right', gestureEnabled: false }}
        />
        <Stack.Screen
          name="ComputerGame"
          component={ComputerGameScreen}
          options={{
            animation: 'slide_from_bottom',
            gestureEnabled: false,
          }}
        />
        <Stack.Screen name="Terms" component={TermsScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="Privacy" component={PrivacyScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen
          name="Result"
          component={ResultScreen}
          options={{ animation: 'fade', gestureEnabled: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 20,
    left: 15,
    right: 15,
    elevation: 0,
    backgroundColor: 'rgba(59, 10, 123, 0.7)',
    borderRadius: 30,
    height: 70,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingBottom: 0,
    ...SHADOWS.glowPrimary,
  },
  tabBarBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 30,
  },
  tabIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    top: 5,
  },
  tabLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: COLORS.gold,
  },
});

export default AppNavigator;
