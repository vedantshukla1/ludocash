import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SOCKET_URL = 'https://ludocash.onrender.com'; // Switched to production Render URL

let socket = null;

/**
 * Connect to the Socket.IO server with JWT auth
 */
export const connectSocket = async () => {
  if (socket && socket.connected) return socket;

  const token = await AsyncStorage.getItem('accessToken');
  if (!token) throw new Error('No access token for socket connection');

  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      timeout: 10000,
    });

    socket.on('connect', () => {
      console.log('🔌 Socket connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.error('🔌 Socket connection error:', err.message);
    });
  } else {
    socket.connect();
  }

  if (socket.connected) return socket;

  return new Promise((resolve, reject) => {
    const onConnect = () => {
      cleanup();
      resolve(socket);
    };

    const onConnectError = (err) => {
      cleanup();
      reject(err);
    };

    const cleanup = () => {
      socket.off('connect', onConnect);
      socket.off('connect_error', onConnectError);
    };

    socket.once('connect', onConnect);
    socket.once('connect_error', onConnectError);
  });
};

/**
 * Get the existing socket (or null)
 */
export const getSocket = () => socket;

/**
 * Disconnect and reset
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

/**
 * Emit a socket event
 */
export const emit = (event, data) => {
  if (!socket || !socket.connected) {
    console.warn(`Socket not connected. Cannot emit: ${event}`);
    return;
  }
  socket.emit(event, data);
};

/**
 * Listen to a socket event (returns cleanup fn)
 */
export const on = (event, handler) => {
  if (!socket) return () => {};
  socket.on(event, handler);
  return () => socket.off(event, handler);
};

/**
 * Remove a specific event listener
 */
export const off = (event, handler) => {
  if (!socket) return;
  socket.off(event, handler);
};

export default {
  connectSocket,
  getSocket,
  disconnectSocket,
  emit,
  on,
  off,
};
