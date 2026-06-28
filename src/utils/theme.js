import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const COLORS = {
  primary: '#0052CC',
  secondary: '#FFB300',
  background: '#0F1E3D', // Dark Blue
  surface: '#1A2A4D',
  text: '#FFFFFF',
  textMuted: '#A0AEC0',
  border: 'rgba(255,255,255,0.1)',
  success: '#00C853',
  danger: '#FF3D00',
  white: '#FFFFFF',
};

export const GRADIENTS = {
  primary: ['#00B4DB', '#0083B0'], // Modern blue gradient
  secondary: ['#8E2DE2', '#4A00E0'], // Purple gradient
  background: ['#0F1E3D', '#1A2A4D'], // Deep blue gradient
  gold: ['#FFD700', '#FFA000'], // Bright gold gradient
  darkCard: ['#1A2A4D', '#0F1E3D'],
  backgroundSplash: ['#1F004D', '#0A001A'], // Rich deep purple for Splash
};

export const SHADOWS = {
  light: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  gold: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  piece: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 8,
  },
  button: {
    shadowColor: '#FFB300',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 5,
  },
};

export const TYPOGRAPHY = {
  h1: { fontSize: 32, fontWeight: 'bold' },
  h2: { fontSize: 24, fontWeight: 'bold' },
  h3: { fontSize: 20, fontWeight: 'bold' },
  body: { fontSize: 16 },
  caption: { fontSize: 14 },
  small: { fontSize: 12 },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  round: 9999,
};

export const SCREEN = {
  width,
  height,
};

export const BOARD = {
  size: width * 0.95,
  cellSize: (width * 0.95) / 15,
};

export const PLAYER_COLORS = {
  red: { primary: '#E53935', secondary: '#FFCDD2' },
  blue: { primary: '#1E88E5', secondary: '#BBDEFB' },
  green: { primary: '#43A047', secondary: '#C8E6C9' },
  yellow: { primary: '#FFB300', secondary: '#FFECB3' },
};

export default {
  COLORS,
  GRADIENTS,
  SHADOWS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SCREEN,
  BOARD,
  PLAYER_COLORS,
};
