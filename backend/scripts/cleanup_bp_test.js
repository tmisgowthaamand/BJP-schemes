'use strict';
require('dotenv').config();
const mongoose = require('mongoose');
const BP = require('../models/BoothPresidentApplication');

(async () => {
  await mongoose.connect(process.env.MONGO_APP_URL, { dbName: process.env.MONGO_DB });
  const epic = 'CVP2200228';
  const cutoff = new Date('2026-08-07T00:00:00Z');
  // Remove test-created Pending duplicates (from endpoint testing) — keep the real Approved one
  const r = await BP.deleteMany({ epicNo: epic, status: 'Pending', appliedAt: { $gte: cutoff } });
  console.log('Deleted test Pending apps:', r.deletedCount);
  const left = await BP.find({ epicNo: epic }).sort({ appliedAt: -1 }).lean();
  left.forEach(a => console.log(' remaining:', a.status, '| booth', a.targetBoothNo, a.targetAssembly));
  process.exit(0);
})().catch(e => { console.log('ERR', e.message); process.exit(1); });
