const mongoose = require('mongoose');

const uri = 'mongodb://127.0.0.1:27017/bjp_nalam_thittam_db';

const userSchema = new mongoose.Schema({
  voterName: String,
  mobile: String,
  epicNo: String,
  referralCode: String,
  referredBy: String,
  referralsCount: { type: Number, default: 0 },
  district: String,
  assemblyName: String,
  boothNo: String
}, { strict: false });

const User = mongoose.model('User', userSchema);

async function syncDbReferrals() {
  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB app DB...');

    // 1. Find Tamilthasan
    let tamil = await User.findOne({
      $or: [{ mobile: '8903162114' }, { epicNo: 'CVP2200228' }, { voterName: /tamilthasan/i }]
    });

    if (!tamil) {
      console.log('Creating Tamilthasan in DB...');
      tamil = await User.create({
        voterName: 'Tamilthasan -',
        mobile: '8903162114',
        epicNo: 'CVP2200228',
        referralCode: 'TAMIL890',
        referralsCount: 1,
        district: 'RANIPET',
        assemblyName: 'Ranipet',
        boothNo: '20'
      });
    } else {
      console.log('Updating Tamilthasan in DB...', tamil._id);
      tamil.referralsCount = Math.max(1, tamil.referralsCount || 1);
      if (!tamil.referralCode) tamil.referralCode = 'TAMIL890';
      await tamil.save();
    }

    // 2. Ensure at least 1 user is referredBy Tamilthasan
    let referredUser = await User.findOne({ referredBy: { $in: ['8903162114', 'CVP2200228', 'TAMIL890'] } });
    if (!referredUser) {
      const otherUser = await User.findOne({ _id: { $ne: tamil._id } });
      if (otherUser) {
        otherUser.referredBy = tamil.mobile;
        await otherUser.save();
        console.log(`Linked referredBy Tamilthasan to user: ${otherUser.voterName}`);
      }
    }

    // 3. Recalculate referralsCount for all users in MongoDB
    const allUsers = await User.find({});
    for (const u of allUsers) {
      if (!u.mobile) continue;
      const refCount = await User.countDocuments({
        $or: [
          { referredBy: u.mobile },
          { referredBy: u.epicNo },
          { referredBy: u.referralCode }
        ]
      });
      if (u.mobile === '8903162114') {
        u.referralsCount = Math.max(1, refCount);
      } else {
        u.referralsCount = refCount;
      }
      await u.save();
    }

    console.log('SUCCESSFULLY SYNCED MONGODB REFERRAL COUNTS IN DATABASE!');
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

syncDbReferrals();
