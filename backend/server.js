require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const { isDbConnected } = require('./config/db');
const maintenance = require('./middleware/maintenance');
const { initRazorpay } = require('./services/paymentService');
const initSocket = require('./socket');

const authRoutes = require('./routes/auth');
const walletRoutes = require('./routes/wallet');
const gameRoutes = require('./routes/game');
const leaderboardRoutes = require('./routes/leaderboard');
const adminRoutes = require('./routes/admin');

const PORT = process.env.PORT || 5000;

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.set('io', io);

app.use(cors());
app.use(express.json({ limit: '1mb' }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: 'Too many requests, please try again later' },
});

app.get('/', (req, res) => {
  res.json({ message: 'LudoCash API Server is running. Visit /health for status.' });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'LudoCash API',
    database: isDbConnected() ? 'connected' : 'disconnected',
  });
});

app.use('/api/auth', authLimiter, maintenance, authRoutes);
app.use('/api/wallet', maintenance, walletRoutes);
app.use('/api/game', maintenance, gameRoutes);
app.use('/api/leaderboard', maintenance, leaderboardRoutes);
app.use('/api/admin', adminRoutes);

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const start = async () => {
  initRazorpay();
  initSocket(io);

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\nPort ${PORT} is already in use. Stop the other server first:`);
      console.error(`  netstat -ano | findstr :${PORT}`);
      console.error(`  taskkill /PID <pid> /F\n`);
      process.exit(1);
    }
    throw err;
  });

  server.listen(PORT, () => {
    console.log(`LudoCash server running on port ${PORT}`);
  });

  let dbWarningShown = false;

  const tryConnect = async () => {
    if (isDbConnected()) return;

    try {
      await connectDB();
    } catch (err) {
      if (!dbWarningShown) {
        dbWarningShown = true;
        console.warn('\n⚠️  MongoDB not connected:', err.message);
        console.warn('   Admin login works, but users/games/wallet need a database.');
        console.warn('   Fix: install MongoDB locally OR set MONGODB_URI in backend/.env');
        console.warn('   Atlas (free): https://www.mongodb.com/atlas → Connect → copy connection string\n');
      }
      setTimeout(tryConnect, 30000);
    }
  };

  tryConnect();
};

start();
