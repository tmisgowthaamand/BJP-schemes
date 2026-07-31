const mongoose = require('mongoose');
require('dotenv').config();

async function checkAss13() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bjp_nalam_thittam_db');
  const voterDb = mongoose.connection.useDb('voter_db');
  
  // Check what assembly_name values exist in ass_13
  const assemblies = await voterDb.db.collection('ass_13').distinct('ASSEMBLY_NAME');
  console.log('ASSEMBLY_NAME values in ass_13:', assemblies.slice(0, 10));

  // Check PART_NO values
  const parts = await voterDb.db.collection('ass_13').distinct('PART_NO');
  console.log('PART_NO values:', parts.slice(0, 20));

  // Sample record
  const sample = await voterDb.db.collection('ass_13').findOne({});
  console.log('\nSample record:', JSON.stringify(sample, null, 2));

  // Count by PART_NO=29
  const booth29count = await voterDb.db.collection('ass_13').countDocuments({ PART_NO: '29' });
  const booth29countInt = await voterDb.db.collection('ass_13').countDocuments({ PART_NO: 29 });
  console.log('Booth 29 (string PART_NO):', booth29count);
  console.log('Booth 29 (int PART_NO):', booth29countInt);

  process.exit(0);
}
checkAss13();
