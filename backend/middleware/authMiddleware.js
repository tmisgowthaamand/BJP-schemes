const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');

// SECURITY FIX 3: process.env.JWT_SECRET used directly — no fallback string.
// Verify User JWT Token
const protectUser = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-__v');
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'User token invalid or user not found' });
      }
      return next();
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Invalid token' });
    }
  }
  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized: No token provided' });
  }
};

const mongoose = require('mongoose');

// Verify Admin JWT Token
const protectAdmin = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];

    if (!token || token === 'undefined' || token === 'null') {
      return res.status(401).json({ success: false, message: 'Unauthorized: Admin token required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Invalid or expired admin token' });
    }

    // 1. Try MongoDB Admin collection — only for real 24-hex Mongo ObjectIds
    const isMongoId = decoded.id && /^[0-9a-fA-F]{24}$/.test(String(decoded.id));
    if (isMongoId) {
      try {
        req.admin = await Admin.findById(decoded.id).select('-password');
      } catch (dbErr) {
        // CastError or DB error — fall through to JWT payload fallback
        req.admin = null;
      }
    }

    // 2. Fallback: rebuild admin object from JWT payload (dynamic/quick-switch sessions)
    if (!req.admin) {
      if ((decoded.username || decoded.role) || decoded.isAdmin) {
        req.admin = {
          _id: decoded.id || decoded.username || 'dynamic',
          username: decoded.username || 'admin',
          role: decoded.role || 'SUPER_ADMIN',
          district: decoded.district || null,
          assemblyName: decoded.assemblyName || null,
          boothNo: decoded.boothNo || null
        };
      }
    }

    if (!req.admin) {
      return res.status(401).json({ success: false, message: 'Admin session expired or not found' });
    }

    return next();
  }

  return res.status(401).json({ success: false, message: 'Unauthorized: Admin token required' });
};

// Enforce specific admin roles
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.admin || !roles.includes(req.admin.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Admin role '${req.admin?.role || 'Unknown'}' is not allowed to access credentials`
      });
    }
    next();
  };
};

module.exports = {
  protectUser,
  protectAdmin,
  authorizeRoles
};
