const mongoose = require('mongoose');
require('dotenv').config();

async function checkFields() {
  try {
    await mongoose.connect(process.env.MONGO_VOTER_URL || process.env.MONGO_URI);
    const voterDb = mongoose.connection.useDb('voter_db');
    
    // Get a sample voter from ass_1, booth 1
    const sample = await voterDb.db.collection('ass_1').findOne({ 
      $or: [{ PART_NO: '1' }, { PART_NO: 1 }]
    });
    
    if (sample) {
      console.log('\n=== SAMPLE VOTER DOCUMENT FROM ass_1, Booth 1 ===');
      console.log('Available Fields:', Object.keys(sample));
      console.log('\nFull Document:');
      console.log(JSON.stringify(sample, null, 2));
    } else {
      console.log('No voter found in ass_1, booth 1');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkFields();
