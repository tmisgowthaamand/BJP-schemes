const mongoose = require('mongoose');
require('dotenv').config();

async function checkAssemblies() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bjp_nalam_thittam_db');

  const voterDb = mongoose.connection.useDb('voter_db');
  const cols = await voterDb.db.listCollections().toArray();
  console.log('voter_db collections:', cols.map(c => c.name));

  for (const col of cols) {
    const sample = await voterDb.db.collection(col.name).findOne({});
    if (sample) {
      console.log(`\n--- ${col.name} sample fields ---`);
      console.log(Object.keys(sample));
      // Check booth 29
      const booth29 = await voterDb.db.collection(col.name).findOne({ part_no: '29' });
      const booth29_str = await voterDb.db.collection(col.name).findOne({ part_no: 29 });
      console.log('Booth 29 (string):', booth29 ? 'FOUND' : 'not found');
      console.log('Booth 29 (int):', booth29_str ? 'FOUND' : 'not found');

      // Total count
      const total = await voterDb.db.collection(col.name).countDocuments({});
      console.log('Total records in', col.name, ':', total);

      // Show distinct part_no values
      const parts = await voterDb.db.collection(col.name).distinct('part_no');
      console.log('Distinct part_no (booths):', parts.slice(0, 20));
    }
  }

  // Also check bjp_nalam_thittam_db for Gummidipoondi users/apps
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
  const SchemeApp = mongoose.model('SchemeApp', new mongoose.Schema({}, { strict: false }), 'schemeapplications');

  const gummiUsers = await User.find({ assemblyName: /gummi/i }).select('voterName mobile assemblyName boothNo').lean();
  console.log('\nUsers with assembly ~Gummi:', gummiUsers.length, gummiUsers.slice(0,3));

  const gummiApps = await SchemeApp.find({ assemblyName: /gummi/i }).countDocuments();
  console.log('SchemeApps with assembly ~Gummi:', gummiApps);

  // Check distinct assemblies in our user DB
  const assemblies = await User.distinct('assemblyName');
  console.log('\nAll assemblyNames in users:', assemblies.slice(0, 30));

  process.exit(0);
}
checkAssemblies();
