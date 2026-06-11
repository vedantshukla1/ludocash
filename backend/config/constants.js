module.exports = {
  BLOCKED_STATES: [
    'Tamil Nadu',
    'Andhra Pradesh',
    'Telangana',
    'Assam',
    'Odisha',
    'Sikkim',
    'Nagaland',
  ],

  COLORS_ORDER: ['red', 'blue', 'green', 'yellow'],
  COLOR_START: { red: 0, blue: 13, green: 26, yellow: 39 },
  SAFE_SQUARES: new Set([0, 8, 13, 21, 26, 34, 39, 47]),
  HOME_COLUMN_LENGTH: 6,
  TURN_DURATION_MS: 20000,

  WELCOME_BONUS: 20,
  DAILY_BONUS: 2,
  DEPOSIT_BONUS_THRESHOLD: 500,
  DEPOSIT_BONUS_AMOUNT: 50,

  TDS_RATE: 0.3,
  TDS_THRESHOLD: 10000,

  MODE_CONFIG: {
    '2player': { players: 2, defaultCut: 10 },
    '4player': { players: 4, defaultCut: 15 },
    tournament: { players: 4, defaultCut: 20 },
  },

  JWT_EXPIRY: '7d',
  REFRESH_EXPIRY: '30d',
};
