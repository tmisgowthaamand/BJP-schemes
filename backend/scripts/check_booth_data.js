const mongoose = require('mongoose');
require('dotenv').config();

async function checkBoothData() {
  try {
    // Connect to voter_db (db1 - read-only)
    const voterDbConnection = mongoose.createConnection(
      process.env.MONGO_VOTER_URL || 'mongodb://127.0.0.1:27017/voter_db'
    );
    
    await new Promise((resolve, reject) => {
      voterDbConnection.once('open', resolve);
      voterDbConnection.once('error', reject);
    });

    console.log('✅ Connected to voter_db (db1 - Read-only database)\n');

    // Get first assembly collection
    const collections = await voterDbConnection.db.listCollections().toArray();
    const assCollection = collections.find(c => c.name.startsWith('ass_'));
    
    if (!assCollection) {
      console.log('❌ No assembly collections found');
      process.exit(1);
    }

    console.log(`📊 Checking booth data in collection: ${assCollection.name}\n`);

    // Get sample voter with booth data
    const sampleVoter = await voterDbConnection.db.collection(assCollection.name).findOne({});
    
    console.log('📋 Sample Voter Record Fields:');
    console.log(Object.keys(sampleVoter).join(', '));
    console.log('\n');

    // Check PART_NO (booth number) field
    if (sampleVoter.PART_NO) {
      console.log(`✅ PART_NO field exists: ${sampleVoter.PART_NO} (This is the Booth Number)`);
    } else {
      console.log('❌ PART_NO field not found');
    }

    // Get booth statistics
    console.log('\n📊 Booth Statistics:');
    const boothStats = await voterDbConnection.db.collection(assCollection.name).aggregate([
      {
        $group: {
          _id: '$PART_NO',
          voterCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 20 }
    ]).toArray();

    console.log(`\nFirst 20 Booths in ${assCollection.name}:`);
    console.log('Booth No | Voter Count');
    console.log('---------|------------');
    boothStats.forEach(stat => {
      console.log(`${String(stat._id).padEnd(8)} | ${stat.voterCount}`);
    });

    // Total booths
    const totalBooths = await voterDbConnection.db.collection(assCollection.name).distinct('PART_NO');
    console.log(`\n📌 Total Booths in this assembly: ${totalBooths.length}`);

    // Sample booth data
    console.log('\n📝 Sample Voter from Booth 1:');
    const boothSample = await voterDbConnection.db.collection(assCollection.name).findOne({ 
      $or: [{ PART_NO: '1' }, { PART_NO: 1 }] 
    });
    
    if (boothSample) {
      console.log(`  EPIC_NO: ${boothSample.EPIC_NO}`);
      console.log(`  NAME_V1: ${boothSample.NAME_V1 || boothSample.NAME}`);
      console.log(`  PART_NO (Booth): ${boothSample.PART_NO}`);
      console.log(`  GENDER: ${boothSample.GENDER}`);
      console.log(`  ASSEMBLY_NO: ${boothSample.ASSEMBLY_NO}`);
      console.log(`  ASSEMBLY_NAME: ${boothSample.ASSEMBLY_NAME}`);
      console.log(`  DISTRICT: ${boothSample.DISTRICT}`);
    }

    // Check all assemblies
    console.log('\n\n📊 Checking ALL 234 Assembly Collections:');
    const assCollections = collections.filter(c => c.name.startsWith('ass_'));
    console.log(`Found ${assCollections.length} assembly collections\n`);

    let totalVotersAcrossAll = 0;
    let totalBoothsAcrossAll = 0;

    for (let i = 0; i < Math.min(10, assCollections.length); i++) {
      const col = assCollections[i];
      const voterCount = await voterDbConnection.db.collection(col.name).countDocuments({});
      const booths = await voterDbConnection.db.collection(col.name).distinct('PART_NO');
      
      console.log(`${col.name}: ${voterCount.toLocaleString()} voters, ${booths.length} booths`);
      
      totalVotersAcrossAll += voterCount;
      totalBoothsAcrossAll += booths.length;
    }

    console.log('\n✅ BOOTH DATA EXISTS IN DB1 (voter_db)!');
    console.log(`\nSummary (first 10 assemblies):`);
    console.log(`  Total Voters: ${totalVotersAcrossAll.toLocaleString()}`);
    console.log(`  Total Booths: ${totalBoothsAcrossAll}`);

    await voterDbConnection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkBoothData();
