const mongoose = require('mongoose');
require('dotenv').config();

const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema, 'users');

async function debugReferrals() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bjp_nalam_thittam_db');

  // Get NITHISH
  const nithish = await User.findOne({ mobile: '8888700001' }).lean();
  console.log('NITHISH record:');
  console.log('  mobile:', nithish.mobile);
  console.log('  epicNo:', nithish.epicNo);
  console.log('  referralCode:', nithish.referralCode);
  console.log('  referralsCount:', nithish.referralsCount);
  console.log('  referredBy:', nithish.referredBy);

  // Count how many users have referredBy matching NITHISH's mobile/epic/code
  const count1 = await User.countDocuments({ referredBy: nithish.mobile });
  const count2 = await User.countDocuments({ referredBy: nithish.epicNo });
  const count3 = await User.countDocuments({ referredBy: nithish.referralCode });
  console.log(`\nUsers referredBy mobile ${nithish.mobile}: ${count1}`);
  console.log(`Users referredBy epicNo ${nithish.epicNo}: ${count2}`);
  console.log(`Users referredBy referralCode ${nithish.referralCode}: ${count3}`);

  // Show a few users that have referredBy = NITHISH's referralCode
  const referredUsers = await User.find({ referredBy: nithish.referralCode }).select('voterName mobile referredBy').limit(5).lean();
  console.log('\nUsers referred by NITHISH (via referralCode):');
  referredUsers.forEach(u => console.log(' -', u.voterName, '| Mobile:', u.mobile, '| referredBy:', u.referredBy));

  process.exit(0);
}
debugReferrals();
