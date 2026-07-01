import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api';
import { disconnectSocket } from '../services/socket';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // ─── Bootstrap: load stored session ────────────────────────────────────────
  useEffect(() => {
    const bootstrap = async () => {
      try {
        const [storedUser, token] = await AsyncStorage.multiGet(['user', 'accessToken']);
        const userData = storedUser[1];
        const accessToken = token[1];

        if (userData && accessToken) {
          setUser(JSON.parse(userData));
          // Silently refresh user profile — don't block initialization on this
          authAPI.me()
            .then(({ data }) => {
              const parsedUser = JSON.parse(userData);
              const fresh = { 
                ...parsedUser, 
                ...data.user,
                avatar: data.user.avatar || parsedUser.avatar 
              };
              setUser(fresh);
              AsyncStorage.setItem('user', JSON.stringify(fresh));
            })
            .catch(() => {
              // Token may be expired — keep cached user
            });
        }
      } catch (err) {
        console.error('Bootstrap error:', err);
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };
    bootstrap();
  }, []);

  // ─── Login ──────────────────────────────────────────────────────────────────
  const login = useCallback(async (accessToken, refreshToken, userData) => {
    await AsyncStorage.multiSet([
      ['accessToken', accessToken],
      ['refreshToken', refreshToken],
      ['user', JSON.stringify(userData)],
    ]);
    setUser(userData);
  }, []);

  // ─── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
    disconnectSocket();
    setUser(null);
  }, []);

  // ─── Update user in state + storage ─────────────────────────────────────────
  const updateUser = useCallback(async (updatedUser) => {
    const merged = { 
      ...user, 
      ...updatedUser,
      avatar: updatedUser.avatar || user?.avatar
    };
    setUser(merged);
    await AsyncStorage.setItem('user', JSON.stringify(merged));
  }, [user]);

  // ─── Refresh user from server ────────────────────────────────────────────────
  const refreshUser = useCallback(async () => {
    try {
      const { data } = await authAPI.me();
      await updateUser(data.user);
      return data.user;
    } catch (err) {
      console.error('refreshUser error:', err);
      return null;
    }
  }, [updateUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        initialized,
        login,
        logout,
        updateUser,
        refreshUser,
        isLoggedIn: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export default AuthContext;
