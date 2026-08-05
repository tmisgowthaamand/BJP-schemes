'use strict';
const mongoose = require('mongoose');

/**
 * BoothPresidentApplication — stores a member's request to lead a polling booth.
 *
 * A member can apply for:
 *  (a) their own registered booth  — boothType: 'registered'
 *  (b) any other booth             — boothType: 'custom'
 *
 * Workflow: Pending → Approved | Declined  (updated by any admin)
 */
const boothPresidentApplicationSchema = new mongoose.Schema({
  // ── Applicant ──
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  voterName:    { type: String, required: true, trim: true },
  epicNo:       { type: String, required: true, uppercase: true, trim: true },
  mobile:       { type: String, required: true, trim: true },

  // ── Voter's original registered booth ──
  originalDistrict:  { type: String, required: true, trim: true },
  originalAssembly:  { type: String, required: true, trim: true },
  originalBoothNo:   { type: String, required: true, trim: true },

  // ── Target booth applied for ──
  boothType:    { type: String, enum: ['registered', 'custom'], required: true },
  targetDistrict:  { type: String, required: true, trim: true },
  targetAssembly:  { type: String, required: true, trim: true },
  targetBoothNo:   { type: String, required: true, trim: true },

  // ── Workflow ──
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Declined'],
    default: 'Pending'
  },
  reviewedBy:   { type: String, default: null },   // admin username
  reviewedAt:   { type: Date,   default: null },
  adminNotes:   { type: String, default: '' },

  appliedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// One active application per (epicNo + targetBoothNo) — prevent duplicates
boothPresidentApplicationSchema.index(
  { epicNo: 1, targetBoothNo: 1, targetAssembly: 1, status: 1 }
);

module.exports = mongoose.model('BoothPresidentApplication', boothPresidentApplicationSchema);
