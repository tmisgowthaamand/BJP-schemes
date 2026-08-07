'use strict';
require('dotenv').config();
const mongoose = require('mongoose');
const SA = require('../models/SchemeApplication');
const U = require('../models/User');

(async () => {
  await mongoose.connect(process.env.MONGO_APP_URL, { dbName: process.env.MONGO_DB });
  const waApps  = await SA.countDocuments({ channel: 'whatsapp' });
  const webApps = await SA.countDocuments({ channel: { $ne: 'whatsapp' } });
  const waUsers = await U.countDocuments({ channel: 'whatsapp' });
  console.log('SchemeApplications — whatsapp:', waApps, '| web/other:', webApps);
  console.log('Users registered via whatsapp:', waUsers);
  const sample = await SA.find({ channel: 'whatsapp' }).limit(5).lean();
  sample.forEach(s => console.log('  WA app:', s.voterName, '|', s.schemeName, '|', s.mobile));
  process.exit(0);
})().catch(e => { console.log('ERR', e.message); process.exit(1); });
