const mongoose = require('mongoose');
require('dotenv').config();

async function findEpic() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bjp_nalam_thittam_db');
  const db = mongoose.connection.db;

  const epicToSearch = 'TFN2578318';
  console.log(`Searching for EPIC: ${epicToSearch}...`);

  // 1. Search in User collection
  const user = await db.collection('users').findOne({ epicNo: epicToSearch });
  if (user) {
    console.log('=== FOUND IN USERS COLLECTION ===');
    console.log('Voter Name:', user.voterName);
    console.log('Mobile:', user.mobile);
    console.log('EPIC:', user.epicNo);
    console.log('District:', user.district);
    console.log('Assembly:', user.assemblyName);
    console.log('Booth No:', user.boothNo);
    console.log('Referrals Count:', user.referralsCount);
  } else {
    console.log('Not found in users collection.');
  }

  // 2. Search across assembly voter collections
  const collections = await db.listCollections().toArray();
  let foundInVoterDb = false;

  for (const col of collections) {
    if (col.name.startsWith('ass_') || col.name.includes('voter')) {
      const voter = await db.collection(col.name).findOne({ epic_no: epicToSearch });
      if (voter) {
        foundInVoterDb = true;
        console.log(`=== FOUND IN ASSEMBLY COLLECTION (${col.name}) ===`);
        console.log('Voter Name (EN):', voter.applicant_first_name_v1 || voter.voterName || voter.name);
        console.log('Voter Name (L1):', voter.applicant_first_name_l1);
        console.log('EPIC No:', voter.epic_no);
        console.log('Gender:', voter.gender);
        console.log('Age:', voter.age);
        console.log('Part No (Booth):', voter.part_no);
        console.log('Relative Name:', voter.relation_first_name_v1);
        console.log('Full Doc:', JSON.stringify(voter, null, 2));
      }
    }
  }

  if (!foundInVoterDb) {
    console.log('Not found in assembly voter collections.');
  }

  process.exit(0);
}

findEpic();
