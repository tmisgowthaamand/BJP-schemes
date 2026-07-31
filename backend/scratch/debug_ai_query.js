const mongoose = require('mongoose');
require('dotenv').config();

const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema, 'users');

async function debugAiQuery() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bjp_nalam_thittam_db');

  // Replicate the exact backend query
  const dbUsersForAi = await User.find({ mobile: { $ne: '7010905730' } })
    .sort({ referralsCount: -1 })
    .limit(10)
    .select('voterName mobile epicNo district assemblyName boothNo referralCode referralsCount')
    .lean();

  console.log('dbUsersForAi top 5 (raw from DB):');
  dbUsersForAi.slice(0, 5).forEach(u => {
    console.log(`  ${u.voterName} | mobile: ${u.mobile} | referralCode: ${u.referralCode} | referralsCount: ${u.referralsCount}`);
  });

  // Now countDocuments for each
  const results = await Promise.all(
    dbUsersForAi.map(async (u) => {
      const refCount = await User.countDocuments({
        $or: [
          { referredBy: u.mobile },
          { referredBy: u.epicNo },
          { referredBy: u.referralCode }
        ]
      });
      const finalCount = Math.max(u.referralsCount || 0, refCount);
      return { voterName: u.voterName, mobile: u.mobile, referralCode: u.referralCode, referralsCount: u.referralsCount, refCount, finalCount };
    })
  );

  results.sort((a, b) => b.finalCount - a.finalCount);

  console.log('\n--- LIVE LEADERBOARD (exact backend logic) ---');
  results.slice(0, 5).forEach((ref, idx) => {
    console.log(`#${idx + 1} ${ref.voterName} | Mobile: ${ref.mobile} | referralCode: ${ref.referralCode} | DB count: ${ref.referralsCount} | referredBy count: ${ref.refCount} | final: ${ref.finalCount}`);
  });

  process.exit(0);
}
debugAiQuery();
