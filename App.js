import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar, Alert } from 'react-native';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { preloadSounds, startMusic } from './src/utils/sounds';
import CustomAlert, { CustomAlertManager } from './src/components/CustomAlert';

const App = () => {
  useEffect(() => {
    preloadSounds();
    startMusic();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor="#1A0A2E" />
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
        <CustomAlertManager />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
