import { Dimensions, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Colors ───────────────────────────────────────────────────────────────────
export const COLORS = {
  // Background
  background: '#2B045D',
  backgroundLight: '#3D097A',
  backgroundCard: '#4F1299',

  // Accent / Classic Gold
  gold: '#FFD100',
  goldDark: '#FF9900',
  goldLight: '#FFEE82',

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
  overlay: 'rgba(20, 0, 40, 0.85)',
  overlayLight: 'rgba(20, 0, 40, 0.45)',
  pureWhite: '#FFFFFF',
};

// ─── Gradients ────────────────────────────────────────────────────────────────
export const GRADIENTS = {
  background: ['#3A0088', '#1F004D'],
  backgroundSplash: ['#00B4DB', '#0083B0', '#1F004D'], // Cyan to Purple
  card: ['rgba(255, 215, 0, 0.18)', 'rgba(255, 215, 0, 0.02)'],
  gold: ['#FFE082', '#FF9900'],
  goldButton: ['#FFD100', '#FF8C00'], 
  red: ['#FF416C', '#FF4B2B'],
  blue: ['#00C9FF', '#92FE9D'], // Adjusted to match neon styling
  green: ['#11998E', '#38EF7D'],
  yellow: ['#F9D423', '#FF4E50'],
  success: ['#11998E', '#38EF7D'],
  danger: ['#FF416C', '#FF4B2B'],
  darkCard: ['rgba(79, 18, 153, 0.8)', 'rgba(43, 4, 93, 0.8)'],
  glassy: ['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)'],
};

// ─── Shadows ──────────────────────────────────────────────────────────────────
export const SHADOWS = {
  gold: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  glowPrimary: {
    shadowColor: '#FF416C',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 10,
  },
  glowGlass: {
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  }
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
