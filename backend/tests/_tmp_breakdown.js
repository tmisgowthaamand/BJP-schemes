// TEMP read-only report: scheme applications grouped by district and assembly.
// TEMP read-only report: scheme applications grouped by district and assembly.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { MongoClient } = require('mongodb');

(async () => {
  const url = process.env.MONGO_APP_URL || process.env.MONGO_URI;
  const client = new MongoClient(url);
  await client.connect();
  const db = client.db(process.env.MONGO_DB || 'bjp_nalam_thittam_db');
  const col = db.collection('schemeapplications');

  const total = await col.countDocuments({});
  console.log('TOTAL_APPLICATIONS =', total);

  const byDistrict = await col.aggregate([
    { $group: { _id: '$district', apps: { $sum: 1 } } },
    { $sort: { apps: -1 } }
  ]).toArray();

  console.log('\n=== BY DISTRICT ===');
  byDistrict.forEach((d) => console.log(`${(d._id || 'Unknown').padEnd(20)} ${d.apps}`));

  const byAssembly = await col.aggregate([
    { $group: { _id: { district: '$district', assembly: '$assemblyName' }, apps: { $sum: 1 } } },
    { $sort: { apps: -1 } }
  ]).toArray();

  console.log('\n=== BY ASSEMBLY (district | assembly | apps) ===');
  byAssembly.forEach((a) => console.log(`${(a._id.district || 'Unknown').padEnd(18)} | ${(a._id.assembly || 'Unknown').padEnd(22)} | ${a.apps}`));

  await client.close();
})().catch((e) => { console.error('ERROR', e.message); process.exit(1); });
