import { Dimensions, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Colors ───────────────────────────────────────────────────────────────────
export const COLORS = {
  // Background
  background: '#0B1B3D',
  backgroundLight: '#15326C',
  backgroundCard: '#1C3D7D',

  // Accent / Classic Gold
  gold: '#FFD700',
  goldDark: '#FFB300',
  goldLight: '#FFE082',

  // Player colors (Ludo King Classic)
  red: '#D50000',
  blue: '#0091EA',
  green: '#00C853',
  yellow: '#FF8F00',

  // UI
  white: '#FFFFFF',
  whiteAlpha80: 'rgba(255, 255, 255, 0.8)',
  whiteAlpha60: 'rgba(255, 255, 255, 0.6)',
  whiteAlpha20: 'rgba(255, 255, 255, 0.2)',
  whiteAlpha10: 'rgba(255, 255, 255, 0.1)',

  // Status
  success: '#00C853',
  error: '#D50000',
  warning: '#FF8F00',
  info: '#0091EA',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.75)',
  textMuted: 'rgba(255, 255, 255, 0.45)',

  // Card / surface
  surface: 'rgba(255, 255, 255, 0.08)',
  surfaceHover: 'rgba(255, 255, 255, 0.15)',
  border: 'rgba(255, 215, 0, 0.25)',
  borderBright: 'rgba(255, 215, 0, 0.6)',

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.75)',
  overlayLight: 'rgba(0, 0, 0, 0.4)',
  pureWhite: '#FFFFFF',
};

// ─── Gradients ────────────────────────────────────────────────────────────────
export const GRADIENTS = {
  background: ['#071126', '#0B1B3D', '#071126'],
  card: ['rgba(255, 215, 0, 0.18)', 'rgba(255, 215, 0, 0.02)'],
  gold: ['#FFE082', '#FFB300'],
  goldButton: ['#FFB300', '#E67E22'], // Classic Orange/Gold buttons
  red: ['#FF5252', '#D50000'],
  blue: ['#40C4FF', '#0091EA'],
  green: ['#69F0AE', '#00C853'],
  yellow: ['#FFB300', '#E67E22'],
  success: ['#69F0AE', '#00C853'],
  danger: ['#FF5252', '#D50000'],
  darkCard: ['#15326C', '#0B1B3D'],
  purpleCard: ['#1C3D7D', '#0F1E3D'],
};

// ─── Shadows ──────────────────────────────────────────────────────────────────
export const SHADOWS = {
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
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  button: {
    shadowColor: '#FFB300',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 5,
  },
};

// ─── Typography ───────────────────────────────────────────────────────────────
export const FONTS = {
  heading1: { fontSize: 18, fontWeight: '900', color: COLORS.gold, letterSpacing: 1 },
  heading2: { fontSize: 14, fontWeight: '800', color: COLORS.white },
  heading3: { fontSize: 12, fontWeight: '700', color: COLORS.white },
  body: { fontSize: 10, fontWeight: '400', color: COLORS.textPrimary },
  bodyBold: { fontSize: 10, fontWeight: '700', color: COLORS.textPrimary },
  caption: { fontSize: 8, fontWeight: '400', color: COLORS.textSecondary },
  captionBold: { fontSize: 8, fontWeight: '700', color: COLORS.textSecondary },
  small: { fontSize: 7, fontWeight: '400', color: COLORS.textMuted },
  gold: { fontSize: 10, fontWeight: '800', color: COLORS.gold },
  goldLarge: { fontSize: 15, fontWeight: '900', color: COLORS.gold },
  buttonText: { fontSize: 10, fontWeight: '800', color: COLORS.background },
  buttonTextLight: { fontSize: 10, fontWeight: '700', color: COLORS.white },
};

// ─── Spacing ──────────────────────────────────────────────────────────────────
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// ─── Border Radius ────────────────────────────────────────────────────────────
export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

// ─── Screen Dimensions ───────────────────────────────────────────────────────
export const SCREEN = {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
};

// ─── Board ────────────────────────────────────────────────────────────────────
export const BOARD = {
  size: Math.min(SCREEN_WIDTH - 16, SCREEN_HEIGHT * 0.5),
  cellSize: Math.floor(Math.min(SCREEN_WIDTH - 16, SCREEN_HEIGHT * 0.5) / 15),
};

// ─── Player Color Map ─────────────────────────────────────────────────────────
export const PLAYER_COLORS = {
  red: {
    primary: COLORS.red,
    light: '#FF8888',
    dark: '#CC2222',
    gradient: GRADIENTS.red,
    home: 'rgba(255,68,68,0.3)',
  },
  blue: {
    primary: COLORS.blue,
    light: '#88BBFF',
    dark: '#2266CC',
    gradient: GRADIENTS.blue,
    home: 'rgba(68,136,255,0.3)',
  },
  green: {
    primary: COLORS.green,
    light: '#88FFD4',
    dark: '#22BB66',
    gradient: GRADIENTS.green,
    home: 'rgba(68,221,136,0.3)',
  },
  yellow: {
    primary: COLORS.yellow,
    light: '#FFE082',
    dark: '#E65100',
    gradient: GRADIENTS.yellow,
    home: 'rgba(255,143,0,0.3)',
  },
};

export default {
  COLORS,
  GRADIENTS,
  SHADOWS,
  FONTS,
  SPACING,
  RADIUS,
  SCREEN,
  BOARD,
  PLAYER_COLORS,
};
