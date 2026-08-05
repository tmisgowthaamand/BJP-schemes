'use strict';
const express = require('express');
const router  = express.Router();
const {
  applyBoothPresident,
  getMyApplications,
  adminGetApplications,
  adminUpdateApplication
} = require('../controllers/boothPresidentController');
const { protectUser, protectAdmin } = require('../middleware/authMiddleware');

// ── User routes (JWT user token) ──────────────────────────
router.post('/apply',            protectUser,  applyBoothPresident);
router.get('/my-applications',   protectUser,  getMyApplications);

// ── Admin routes (JWT admin token) ───────────────────────
router.get('/admin/applications',        protectAdmin, adminGetApplications);
router.put('/admin/applications/:id',    protectAdmin, adminUpdateApplication);

module.exports = router;
