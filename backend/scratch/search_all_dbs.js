const mongoose = require('mongoose');
require('dotenv').config();

async function searchAllDbs() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bjp_nalam_thittam_db');
  const adminDb = mongoose.connection.db.admin();
  const dbs = await adminDb.listDatabases();

  console.log('Databases:', dbs.databases.map(d => d.name));

  const targetEpic = 'TFN2578318';

  for (const dbInfo of dbs.databases) {
    if (['admin', 'config', 'local'].includes(dbInfo.name)) continue;
    const db = mongoose.connection.useDb(dbInfo.name);
    const cols = await db.db.listCollections().toArray();
    for (const col of cols) {
      const match = await db.db.collection(col.name).findOne({
        $or: [
          { epicNo: targetEpic },
          { epic_no: targetEpic },
          { epic: targetEpic },
          { EPIC: targetEpic },
          { epic_no: new RegExp(targetEpic, 'i') }
        ]
      });
      if (match) {
        console.log(`\n=== FOUND IN DB: ${dbInfo.name} | COLLECTION: ${col.name} ===`);
        console.log(JSON.stringify(match, null, 2));
      }
    }
  }
  process.exit(0);
}

searchAllDbs();
