require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');

const authRoutes = require('./routes/auth.routes');
const reviewRoutes = require('./routes/review.routes');
const { errorHandler } = require('./middleware/error.middleware');

const app = express();

// ─── Security Middleware ────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

// ─── Rate Limiting ──────────────────────────────────────────────────────────
// In production, we limit to 3000 requests per 15 minutes to prevent DDoS attacks.
// In development, we disable it completely so you never get locked out while testing!
if (process.env.NODE_ENV === 'production') {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3000, 
    message: { error: 'Too many requests, please try again later.' },
  });
  app.use('/api', limiter);
}

// ─── Body Parsing ───────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Logging ────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan((tokens, req, res) => {
    const status = tokens.status(req, res);
    const method = tokens.method(req, res);
    const url = tokens.url(req, res);
    const time = tokens['response-time'](req, res);

    let statusEmoji = '🟢';
    if (status >= 500) statusEmoji = '🔴';
    else if (status >= 400) statusEmoji = '🟠';
    else if (status >= 300) statusEmoji = '🟡';

    let methodEmoji = '🌐';
    if (method === 'GET') methodEmoji = '🔍';
    else if (method === 'POST') methodEmoji = '📝';
    else if (method === 'DELETE') methodEmoji = '🗑️';

    return `\x1b[36m${methodEmoji} ${method}\x1b[0m \x1b[90m|\x1b[0m \x1b[32m${url}\x1b[0m \x1b[90m|\x1b[0m ${statusEmoji} \x1b[1m${status}\x1b[0m \x1b[90m|\x1b[0m ⏱️ \x1b[33m${time}ms\x1b[0m`;
  }, {
    skip: (req, res) => res.statusCode === 304 // Skip boring repeating 304 polling logs!
  }));
}

// ─── Static Files (uploads) ─────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ─── Health Check ───────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/reviews', reviewRoutes);

// ─── 404 Handler ────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Global Error Handler ───────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ───────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
