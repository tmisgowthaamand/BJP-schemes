const mongoose = require('mongoose');
require('dotenv').config();

async function checkVoterRoll() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bjp_nalam_thittam_db');
  
  // Check voter_db database
  const voterDb = mongoose.connection.useDb('voter_db');
  const cols = await voterDb.db.listCollections().toArray();
  console.log('voter_db collections:', cols.map(c => c.name));

  for (const col of cols) {
    const record = await voterDb.db.collection(col.name).findOne({
      $or: [
        { epic_no: 'TFN2578318' },
        { epicNo: 'TFN2578318' },
        { EPIC: 'TFN2578318' }
      ]
    });
    if (record) {
      console.log(`=== FOUND TFN2578318 IN voter_db -> ${col.name} ===`);
      console.log(JSON.stringify(record, null, 2));
    }
  }

  // Also check election_app database
  const electionDb = mongoose.connection.useDb('election_app');
  const elCols = await electionDb.db.listCollections().toArray();
  for (const col of elCols) {
    const rec = await electionDb.db.collection(col.name).findOne({
      $or: [
        { epic_no: 'TFN2578318' },
        { epicNo: 'TFN2578318' },
        { EPIC: 'TFN2578318' }
      ]
    });
    if (rec) {
      console.log(`=== FOUND TFN2578318 IN election_app -> ${col.name} ===`);
      console.log(JSON.stringify(rec, null, 2));
    }
  }

  process.exit(0);
}

checkVoterRoll();
