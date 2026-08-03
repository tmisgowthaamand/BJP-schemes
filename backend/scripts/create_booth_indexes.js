const mongoose = require('mongoose');
require('dotenv').config();

/**
 * Script: Create PART_NO Indexes for All Assembly Collections
 * 
 * This script creates indexes on the PART_NO (booth number) field
 * for all 233 assembly collections to improve booth filtering performance.
 * 
 * Performance Impact:
 * - Before: 1,500-2,700ms for booth queries
 * - After: Expected 50-200ms for booth queries
 */

async function createBoothIndexes() {
  console.log('='.repeat(80));
  console.log('CREATE PART_NO INDEXES FOR BOOTH FILTERING');
  console.log('='.repeat(80));
  console.log('');

  try {
    // Connect to voter database
    const voterDbUrl = process.env.MONGO_VOTER_URL || 'mongodb://127.0.0.1:27017/voter_db';
    const conn = mongoose.createConnection(voterDbUrl);

    await new Promise((resolve, reject) => {
      conn.once('open', resolve);
      conn.once('error', reject);
    });

    console.log('✅ Connected to voter_db\n');

    // Get all assembly collections
    const collections = await conn.db.listCollections().toArray();
    const assemblyCollections = collections
      .filter(c => c.name.startsWith('ass_'))
      .sort((a, b) => {
        const numA = parseInt(a.name.replace('ass_', ''));
        const numB = parseInt(b.name.replace('ass_', ''));
        return numA - numB;
      });

    console.log(`Found ${assemblyCollections.length} assembly collections\n`);
    console.log('Creating indexes...\n');

    let created = 0;
    let existed = 0;
    let errors = 0;

    for (const col of assemblyCollections) {
      const assemblyNo = col.name.replace('ass_', '');
      
      try {
        // Check if index already exists
        const existingIndexes = await conn.db.collection(col.name).indexes();
        const hasPartNoIndex = existingIndexes.some(idx => 
          idx.key && idx.key.PART_NO === 1
        );

        if (hasPartNoIndex) {
          console.log(`⏭️  Assembly ${assemblyNo.padStart(3)}: Index already exists`);
          existed++;
          continue;
        }

        // Create index on PART_NO
        const startTime = Date.now();
        await conn.db.collection(col.name).createIndex({ PART_NO: 1 });
        const duration = Date.now() - startTime;

        console.log(`✅ Assembly ${assemblyNo.padStart(3)}: Created index (${duration}ms)`);
        created++;

      } catch (error) {
        console.log(`❌ Assembly ${assemblyNo.padStart(3)}: Error - ${error.message}`);
        errors++;
      }
    }

    console.log('');
    console.log('='.repeat(80));
    console.log('INDEX CREATION SUMMARY');
    console.log('='.repeat(80));
    console.log('');
    console.log(`✅ Created: ${created} indexes`);
    console.log(`⏭️  Already Existed: ${existed} indexes`);
    console.log(`❌ Errors: ${errors}`);
    console.log('');

    if (created > 0) {
      console.log('🎉 Success! Booth filtering queries should now be faster.');
      console.log('');
      console.log('Expected Performance Improvement:');
      console.log('  - Before: 1,500-2,700ms for booth queries');
      console.log('  - After: 50-200ms for booth queries');
      console.log('');
    }

    if (existed === assemblyCollections.length) {
      console.log('ℹ️  All indexes already exist. No action needed.');
      console.log('');
    }

    // Test performance improvement on a sample assembly
    if (created > 0 || existed > 0) {
      console.log('='.repeat(80));
      console.log('PERFORMANCE TEST');
      console.log('='.repeat(80));
      console.log('');

      const testAssembly = 'ass_1';
      const testBooth = '1';

      console.log(`Testing booth query on ${testAssembly}, Booth ${testBooth}...\n`);

      // Query with index
      const startTime = Date.now();
      const count = await conn.db.collection(testAssembly).countDocuments({
        $or: [{ PART_NO: testBooth }, { PART_NO: parseInt(testBooth) }]
      });
      const duration = Date.now() - startTime;

      console.log(`Result: ${count} voters found in ${duration}ms`);
      console.log('');

      if (duration < 500) {
        console.log('✅ Performance is EXCELLENT (< 500ms)');
      } else if (duration < 1000) {
        console.log('✅ Performance is GOOD (< 1s)');
      } else {
        console.log('⚠️  Performance could be better (> 1s)');
      }
      console.log('');
    }

    // Show index information
    console.log('='.repeat(80));
    console.log('INDEX INFORMATION');
    console.log('='.repeat(80));
    console.log('');

    const sampleAssembly = 'ass_1';
    const indexes = await conn.db.collection(sampleAssembly).indexes();
    
    console.log(`Indexes on ${sampleAssembly}:`);
    indexes.forEach((idx, i) => {
      const keys = Object.entries(idx.key).map(([k, v]) => `${k}: ${v}`).join(', ');
      console.log(`  ${i + 1}. ${idx.name}: { ${keys} }`);
    });
    console.log('');

    await conn.close();
    console.log('✅ Done! Connection closed.');
    console.log('');

    process.exit(0);

  } catch (error) {
    console.error('❌ Fatal Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
console.log('');
console.log('This script will create indexes on PART_NO field for all assembly collections.');
console.log('This will improve booth filtering query performance significantly.');
console.log('');
console.log('Note: Index creation may take several minutes for large collections.');
console.log('');

createBoothIndexes();
