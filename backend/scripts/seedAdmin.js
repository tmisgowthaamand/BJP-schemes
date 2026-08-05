/**
 * scripts/seedAdmin.js
 * ────────────────────────────────────────────────────────────────────────────
 * SECURITY FIX 2: Secure one-time Super Admin seeding script.
 *
 * Replaces the auto-seeding of hardcoded credentials that was previously
 * embedded in server.js (admin/admin, BJP/BJP@2026, etc.).
 *
 * Usage:
 *   SUPER_ADMIN_USERNAME=youruser SUPER_ADMIN_PASSWORD=yourpassword node scripts/seedAdmin.js
 *
 * Or with a .env file:
 *   node scripts/seedAdmin.js
 *
 * Requirements:
 *   - SUPER_ADMIN_USERNAME  must be set and non-empty
 *   - SUPER_ADMIN_PASSWORD  must be set and non-empty
 *   - MONGODB_URI / DATABASE_URL  must be reachable
 *
 * Safety:
 *   - Only creates the admin if zero Admin documents exist in the database.
 *   - Hashes the password with bcrypt rounds 12 before storing.
 *   - Logs success/failure to console then exits — never stays running.
 * ────────────────────────────────────────────────────────────────────────────
 */

'use strict';

require('dotenv').config();

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

// ── Validate required environment variables ──────────────────────────────────
const SUPER_ADMIN_USERNAME = (process.env.SUPER_ADMIN_USERNAME || '').trim();
const SUPER_ADMIN_PASSWORD = (process.env.SUPER_ADMIN_PASSWORD || '').trim();

if (!SUPER_ADMIN_USERNAME) {
  console.error('[seedAdmin] FATAL: SUPER_ADMIN_USERNAME environment variable is required but not set.');
  process.exit(1);
}

if (!SUPER_ADMIN_PASSWORD) {
  console.error('[seedAdmin] FATAL: SUPER_ADMIN_PASSWORD environment variable is required but not set.');
  process.exit(1);
}

if (SUPER_ADMIN_PASSWORD.length < 12) {
  console.error('[seedAdmin] FATAL: SUPER_ADMIN_PASSWORD must be at least 12 characters.');
  process.exit(1);
}

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL;
if (!MONGO_URI) {
  console.error('[seedAdmin] FATAL: No MongoDB URI found. Set MONGODB_URI in your environment.');
  process.exit(1);
}

// ── Minimal Admin schema (mirrors models/Admin.js without the pre-save hook,
//    since we hash manually here to control the rounds) ──────────────────────
const AdminSchema = new mongoose.Schema({
  username:     { type: String, required: true, unique: true, trim: true },
  password:     { type: String, required: true },
  role:         { type: String, required: true, enum: ['SUPER_ADMIN', 'STATE_ADMIN', 'DISTRICT_ADMIN', 'ASSEMBLY_ADMIN', 'BOOTH_ADMIN'] },
  district:     { type: String, default: null },
  assemblyName: { type: String, default: null },
  boothNo:      { type: String, default: null },
  createdBy:    { type: String, default: 'SEED_SCRIPT' }
}, { timestamps: true });

const Admin = mongoose.models.Admin || mongoose.model('Admin', AdminSchema);

// ── Seed logic ──────────────────────────────────────────────────────────────
async function run() {
  console.log('[seedAdmin] Connecting to MongoDB…');
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 10_000 });
  console.log('[seedAdmin] Connected.');

  const existingCount = await Admin.countDocuments();
  if (existingCount > 0) {
    console.log(`[seedAdmin] ${existingCount} admin document(s) already exist — skipping seed.`);
    console.log('[seedAdmin] To force a re-seed, drop the admins collection first.');
    await mongoose.disconnect();
    process.exit(0);
  }

  // Hash with bcrypt rounds 12 (OWASP recommendation)
  const BCRYPT_ROUNDS = 12;
  console.log(`[seedAdmin] Hashing password with bcrypt rounds ${BCRYPT_ROUNDS}…`);
  const hashedPassword = await bcrypt.hash(SUPER_ADMIN_PASSWORD, BCRYPT_ROUNDS);

  await Admin.create({
    username:  SUPER_ADMIN_USERNAME,
    password:  hashedPassword,
    role:      'SUPER_ADMIN',
    createdBy: 'SEED_SCRIPT'
  });

  console.log(`[seedAdmin] ✅ Super Admin created successfully:`);
  console.log(`           Username : ${SUPER_ADMIN_USERNAME}`);
  console.log(`           Role     : SUPER_ADMIN`);
  console.log(`           Password : [hashed — not stored in plaintext]`);

  await mongoose.disconnect();
  console.log('[seedAdmin] Disconnected. Done.');
  process.exit(0);
}

run().catch((err) => {
  console.error('[seedAdmin] FATAL ERROR:', err.message);
  mongoose.disconnect().finally(() => process.exit(1));
});
