const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const {
  register,
  login,
  logout,
  refresh,
  getMe,
  updateProfile,
  forgotPassword,
} = require('../controllers/auth.controller');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/refresh', refresh);
router.post('/forgot-password', forgotPassword);
router.get('/me', authenticate, getMe);
router.patch('/profile', authenticate, updateProfile);

module.exports = router;
