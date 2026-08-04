/**
 * Find Real Voter with Scheme Application
 * This script finds an actual voter who has applied for schemes
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const SchemeApplication = require('../models/SchemeApplication');
const { BJP_SCHEMES } = require('../constants/schemes');

// Helper to resolve scheme name from ID or stored name
const resolveSchemeName = (schemeName, schemeId) => {
  const raw = String(schemeName == null ? '' : schemeName).trim();
  const byId = BJP_SCHEMES.find(s => String(s.id) === raw || (schemeId != null && String(s.id) === String(schemeId)));
  if (/^\d+$/.test(raw) && byId) return byId.name;
  const byName = BJP_SCHEMES.find(s => s.name.toLowerCase() === raw.toLowerCase());
  if (byName) return byName.name;
  const byKey = BJP_SCHEMES.find(s => (s.keys || []).some(k => k && raw.toLowerCase().includes(k)));
  if (byKey) return byKey.name;
  return raw || (byId ? byId.name : '—');
};

async function findRealVoter() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_APP_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      dbName: process.env.MONGO_DB
    });
    console.log('✅ Connected to MongoDB\n');

    // Find a voter who has at least one scheme application
    console.log('🔍 Searching for real voters with scheme applications...\n');
    
    const applications = await SchemeApplication.find()
      .limit(10)
      .sort({ appliedAt: -1 })
      .lean();

    if (applications.length === 0) {
      console.log('❌ No scheme applications found in database');
      return;
    }

    console.log(`✅ Found ${applications.length} recent applications\n`);
    console.log('═══════════════════════════════════════════════════════════');

    for (let i = 0; i < Math.min(5, applications.length); i++) {
      const app = applications[i];
      
      // Get user details
      const user = await User.findById(app.userId);
      const userApps = await SchemeApplication.find({ userId: app.userId });

      console.log(`\n${i + 1}. VOTER DETAILS:`);
      console.log(`   Name: ${app.voterName}`);
      console.log(`   EPIC: ${app.epicNo}`);
      console.log(`   Mobile: ${app.mobile}`);
      console.log(`   District: ${app.district}`);
      console.log(`   Assembly: ${app.assemblyName}`);
      console.log(`   Booth: ${app.boothNo}`);
      console.log(`\n   SCHEME APPLICATIONS (${userApps.length}):`);
      
      userApps.forEach((a, idx) => {
        const schemeName = resolveSchemeName(a.schemeName, a.schemeId);
        console.log(`      ${idx + 1}. ${schemeName} (ID: ${a.schemeId})`);
        console.log(`         Status: ${a.status}`);
        console.log(`         Application ID: ${a._id}`);
        console.log(`         Applied: ${a.appliedAt.toLocaleDateString()}`);
      });
      
      console.log('\n   ═════════════════════════════════════════════════════');
    }

    console.log('\n\n📋 TO TEST THE NEW FEATURE:');
    console.log('   1. Start the backend: cd backend && npm start');
    console.log('   2. Start the frontend: cd frontend && npm run dev');
    console.log('   3. Login as booth admin for the voter\'s booth');
    console.log('   4. Go to Applications page');
    console.log('   5. Search for the voter name or mobile');
    console.log('   6. Click "View" to see individual scheme(s)');
    console.log('   7. Click "Mark as Delivered" on any scheme');
    console.log('   8. Fill delivery details and save\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
findRealVoter();
