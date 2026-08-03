const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bjp_nalam_thittam_db');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Admin Schema
const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['SUPER_ADMIN', 'STATE_ADMIN', 'DISTRICT_ADMIN', 'ASSEMBLY_ADMIN', 'BOOTH_ADMIN'],
    required: true 
  },
  district: String,
  assemblyName: String,
  assemblyNo: String,
  boothNo: String,
  createdAt: { type: Date, default: Date.now }
});

const Admin = mongoose.model('Admin', adminSchema);

// Get all assembly metadata from voter_db
const getAssemblyMetadata = async () => {
  try {
    const voterDbConnection = mongoose.createConnection(
      process.env.MONGO_VOTER_URL || 'mongodb://127.0.0.1:27017/voter_db'
    );
    
    await new Promise((resolve, reject) => {
      voterDbConnection.once('open', resolve);
      voterDbConnection.once('error', reject);
    });

    console.log('✅ Connected to voter_db');

    const collections = await voterDbConnection.db.listCollections().toArray();
    const assemblies = [];

    for (const col of collections) {
      if (col.name.startsWith('ass_')) {
        const sample = await voterDbConnection.db.collection(col.name).findOne({}, {
          projection: { DISTRICT: 1, ASSEMBLY_NO: 1, ASSEMBLY_NAME: 1 }
        });

        if (sample) {
          const assemblyNo = String(sample.ASSEMBLY_NO || col.name.replace('ass_', ''));
          const assemblyName = sample.ASSEMBLY_NAME || `Assembly ${assemblyNo}`;
          const district = sample.DISTRICT || 'TAMIL NADU';

          assemblies.push({
            collectionName: col.name,
            assemblyNo,
            assemblyName,
            district
          });
        }
      }
    }

    await voterDbConnection.close();
    console.log(`✅ Found ${assemblies.length} assemblies`);
    return assemblies;
  } catch (error) {
    console.error('❌ Error getting assembly metadata:', error);
    throw error;
  }
};

// Create booth admins for all assemblies
const createBoothAdmins = async () => {
  try {
    await connectDB();

    const assemblies = await getAssemblyMetadata();
    console.log(`\n🚀 Creating booth admin accounts for ${assemblies.length} assemblies...\n`);

    const defaultPassword = 'booth123'; // Default password for all booth admins
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const assembly of assemblies) {
      // Create booth admin for Booth 1 of each assembly
      const username = `booth_admin_ass${assembly.assemblyNo}_b1`;
      
      try {
        const existingAdmin = await Admin.findOne({ username });
        
        if (existingAdmin) {
          console.log(`⏭️  Skipped: ${username} (already exists)`);
          skipped++;
          continue;
        }

        const newAdmin = new Admin({
          username,
          password: hashedPassword,
          role: 'BOOTH_ADMIN',
          district: assembly.district,
          assemblyName: assembly.assemblyName,
          assemblyNo: assembly.assemblyNo,
          boothNo: '1'
        });

        await newAdmin.save();
        console.log(`✅ Created: ${username} - ${assembly.assemblyName} (Assembly ${assembly.assemblyNo}), Booth 1`);
        created++;
      } catch (error) {
        console.error(`❌ Error creating ${username}:`, error.message);
        errors++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Created: ${created} booth admin accounts`);
    console.log(`   ⏭️  Skipped: ${skipped} (already exist)`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`\n🔐 Default password for all accounts: ${defaultPassword}`);
    console.log(`\n📝 Login format: booth_admin_ass<NUMBER>_b1`);
    console.log(`   Example: booth_admin_ass1_b1, booth_admin_ass13_b1, booth_admin_ass234_b1`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
};

// Run the script
createBoothAdmins();
