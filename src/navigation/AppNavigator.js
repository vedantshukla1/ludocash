import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../utils/theme';

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
          options={{ animation: 'slide_from_right', gestureEnabled: false }}
        />
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
    backgroundColor: '#0F1E3D',
    borderTopColor: 'rgba(255, 215, 0, 0.25)',
    borderTopWidth: 1,
    height: 65,
    paddingBottom: 8,
    paddingTop: 4,
  },
  tabIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
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
