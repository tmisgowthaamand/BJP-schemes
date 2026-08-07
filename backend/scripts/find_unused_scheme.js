'use strict';
require('dotenv').config();
const mongoose = require('mongoose');
const SA = require('../models/SchemeApplication');
const U = require('../models/User');

(async () => {
  await mongoose.connect(process.env.MONGO_APP_URL, { dbName: process.env.MONGO_DB });
  const u = await U.findOne({ mobile: '8903162114' });
  const apps = await SA.find({ userId: u._id }).lean();
  const usedIds = new Set(apps.map(a => a.schemeId));
  console.log('User', u.voterName, 'has scheme ids:', [...usedIds].join(','));
  let free = null;
  for (let i = 1; i <= 23; i++) { if (!usedIds.has(i)) { free = i; break; } }
  console.log('First unused scheme id:', free);
  process.exit(0);
})().catch(e => { console.log('ERR', e.message); process.exit(1); });
