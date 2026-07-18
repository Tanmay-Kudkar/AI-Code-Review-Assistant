const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { z } = require('zod');
const prisma = require('../utils/prisma');
const { asyncHandler } = require('../middleware/error.middleware');

// ─── Validation Schemas ─────────────────────────────────────────────────────
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

// ─── Token Helpers ──────────────────────────────────────────────────────────

/**
 * 🔑 Generate Authentication Tokens
 * Creates both a short-lived access token and a long-lived refresh token.
 * Access token is for immediate API access, refresh token is for getting new access tokens!
 */
const generateTokens = (userId) => {
  // ⏱️ Access Token (Short-lived, e.g. 15 minutes)
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' }
  );
  
  // 🔄 Refresh Token (Long-lived, e.g. 7 days)
  const refreshToken = jwt.sign(
    { userId, jti: uuidv4() }, // jti adds a unique ID to prevent replay attacks
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
  
  return { accessToken, refreshToken };
};

/**
 * 📅 Calculate Expiration Date for Refresh Tokens
 * Reads the env variable (like '7d') and converts it into a real JavaScript Date object.
 */
const getRefreshExpiry = () => {
  const days = parseInt((process.env.JWT_REFRESH_EXPIRES_IN || '7d').replace('d', ''));
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000); // Current time + days in milliseconds
};

// ─── Controllers ────────────────────────────────────────────────────────────

/**
 * 📝 POST /api/auth/register
 * 
 * Registers a brand new user into the database!
 * 1. Validates the input
 * 2. Checks if email is taken
 * 3. Hashes the password for security
 * 4. Logs the user in immediately by giving them tokens
 */
const register = asyncHandler(async (req, res) => {
  // 1️⃣ Validate the request body (name, email, password) using Zod schema
  const { name, email, password } = registerSchema.parse(req.body);

  // 2️⃣ Check if a user with this email already exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  // 3️⃣ Securely hash the password before saving to the database
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, passwordHash },
    select: { id: true, name: true, email: true, avatar: true, createdAt: true }, // Don't return the hash!
  });

  // 4️⃣ Generate the login tokens
  const { accessToken, refreshToken } = generateTokens(user.id);

  // 5️⃣ Save the refresh token to the database to track the active session
  await prisma.session.create({
    data: {
      userId: user.id,
      refreshToken,
      expiresAt: getRefreshExpiry(),
    },
  });

  // 6️⃣ Send the refresh token as a secure, HTTP-only cookie (invisible to Javascript/Hackers)
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true, // Prevents XSS attacks
    secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
    sameSite: 'strict', // Prevents CSRF attacks
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  // 7️⃣ Return the user data and access token to the frontend
  res.status(201).json({ user, accessToken });
});

/**
 * 🚪 POST /api/auth/login
 * 
 * Logs an existing user in by verifying their password.
 */
const login = asyncHandler(async (req, res) => {
  // 1️⃣ Validate input
  const { email, password } = loginSchema.parse(req.body);

  // 2️⃣ Find the user by email
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // 3️⃣ Verify the password against the stored hash
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // 4️⃣ Generate tokens and save the session
  const { accessToken, refreshToken } = generateTokens(user.id);

  await prisma.session.create({
    data: {
      userId: user.id,
      refreshToken,
      expiresAt: getRefreshExpiry(),
    },
  });

  // 5️⃣ Send the refresh token cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  // 6️⃣ Remove the password hash before sending the user object back!
  const { passwordHash, ...userSafe } = user;
  res.json({ user: userSafe, accessToken });
});

/**
 * 📤 POST /api/auth/logout
 * 
 * Logs the user out by deleting their session from the database and clearing their cookie.
 */
const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (token) {
    // 🗑️ Delete the session from the database so the token can't be used again
    await prisma.session.deleteMany({ where: { refreshToken: token } });
  }
  
  // 🍪 Clear the cookie from the user's browser
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out successfully' });
});

/**
 * 🔄 POST /api/auth/refresh
 * 
 * Takes the user's Refresh Token cookie and generates a brand new Access Token.
 * Used automatically by the frontend when the 15-minute Access Token expires!
 */
const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    return res.status(401).json({ error: 'No refresh token' }); // User is totally logged out
  }

  // 1️⃣ Verify the refresh token is valid and hasn't been tampered with
  const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  
  // 2️⃣ Verify the session actually exists in our database
  const session = await prisma.session.findUnique({ where: { refreshToken: token } });

  if (!session || session.expiresAt < new Date()) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  // 3️⃣ Generate fresh tokens (Rotating the refresh token for extra security)
  const { accessToken, refreshToken: newRefreshToken } = generateTokens(payload.userId);

  // 4️⃣ Update the database with the new refresh token
  await prisma.session.update({
    where: { id: session.id },
    data: { refreshToken: newRefreshToken, expiresAt: getRefreshExpiry() },
  });

  // 5️⃣ Send the new refresh token cookie
  res.cookie('refreshToken', newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({ accessToken });
});

/**
 * GET /api/auth/me
 */
const getMe = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

/**
 * PATCH /api/auth/profile
 */
const updateProfile = asyncHandler(async (req, res) => {
  const schema = z.object({
    name: z.string().min(2).optional(),
    avatar: z.string().optional(),
  });
  const data = schema.parse(req.body);

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data,
    select: { id: true, name: true, email: true, avatar: true },
  });

  res.json({ user });
});

/**
 * POST /api/auth/forgot-password
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = z.object({ email: z.string().email() }).parse(req.body);

  const user = await prisma.user.findUnique({ where: { email } });
  // Always return success to prevent email enumeration
  if (!user) {
    return res.json({ message: 'If that email exists, a reset link has been sent.' });
  }

  // In production: generate reset token, store it, send email
  // For now, return a placeholder response
  res.json({ message: 'If that email exists, a reset link has been sent.' });
});

module.exports = { register, login, logout, refresh, getMe, updateProfile, forgotPassword };
