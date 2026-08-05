const jwt = require('jsonwebtoken');
const User = require('../models/User');
const OtpSession = require('../models/OtpSession');
const { sendSmsOtp } = require('../services/smsService');
const logger = require('../config/logger');

// SECURITY FIX 3: process.env.JWT_SECRET used directly — no fallback string.
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// @desc    Send 2Factor OTP to mobile
// @route   POST /api/auth/send-otp
// @access  Public
const sendOtp = async (req, res) => {
  try {
    const { mobile } = req.body;
    if (!mobile || !/^[6-9]\d{9}$/.test(mobile.trim())) {
      return res.status(400).json({ success: false, message: 'Please provide a valid 10-digit mobile number' });
    }

    const cleanMobile = mobile.trim();
    // Check if user already exists
    const existingUser = await User.findOne({ mobile: cleanMobile });

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

    // Clear old OTP sessions for this mobile
    await OtpSession.deleteMany({ mobile: cleanMobile });

    // Send SMS
    const smsResult = await sendSmsOtp(cleanMobile, otp);

    // Save session
    await OtpSession.create({
      mobile: cleanMobile,
      otp,
      sessionId: smsResult.sessionId || null,
      expiresAt
    });

    // SECURITY FIX 4: devOtp removed — never return OTP in API response.
    return res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      mobile: cleanMobile,
      isExistingUser: !!existingUser,
      existingVoterName: existingUser ? existingUser.voterName : null
    });
  } catch (error) {
    logger.error('[sendOtp Error]', { error: error.message, stack: error.stack, correlationId: req.correlationId });
    // SECURITY FIX 10: Generic error message.
    return res.status(500).json({ success: false, message: 'Something went wrong', correlationId: req.correlationId || 'unknown' });
  }
};

// @desc    Verify OTP and auto-login if existing user
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOtp = async (req, res) => {
  try {
    const { mobile, otp } = req.body;

    if (!mobile || !otp) {
      return res.status(400).json({ success: false, message: 'Mobile number and OTP are required' });
    }

    const cleanMobile = mobile.trim();
    const cleanOtp = otp.trim();

    const session = await OtpSession.findOne({ mobile: cleanMobile, verified: false });

    if (!session) {
      return res.status(400).json({ success: false, message: 'OTP expired or session not found. Please request a new OTP.' });
    }

    if (session.otp !== cleanOtp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP entered. Please try again.' });
    }

    // Mark session verified
    session.verified = true;
    await session.save();

    // Check if user exists
    const existingUser = await User.findOne({ mobile: cleanMobile });

    if (existingUser) {
      const token = generateToken(existingUser._id);
      return res.status(200).json({
        success: true,
        message: 'OTP verified successfully. Welcome back!',
        isExistingUser: true,
        token,
        user: existingUser
      });
    } else {
      return res.status(200).json({
        success: true,
        message: 'OTP verified successfully. Please enter your EPIC number to complete registration.',
        isExistingUser: false,
        requireEpic: true
      });
    }
  } catch (error) {
    logger.error('[verifyOtp Error]', { error: error.message, stack: error.stack, correlationId: req.correlationId });
    // SECURITY FIX 10: Generic error message.
    return res.status(500).json({ success: false, message: 'Something went wrong', correlationId: req.correlationId || 'unknown' });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private (User)
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    return res.status(200).json({ success: true, user });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  sendOtp,
  verifyOtp,
  getMe
};
