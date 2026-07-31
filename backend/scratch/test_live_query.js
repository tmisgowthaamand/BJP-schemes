const mongoose = require('mongoose');
require('dotenv').config();

const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema, 'users');

async function testQuery() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bjp_nalam_thittam_db');
  const dbUsersForAi = await User.find({ mobile: { $ne: '7010905730' } })
    .sort({ referralsCount: -1 })
    .limit(10)
    .select('voterName mobile epicNo district assemblyName boothNo referralCode referralsCount')
    .lean();

  const liveAiReferralsList = await Promise.all(
    dbUsersForAi.map(async (u) => {
      const refCount = await User.countDocuments({
        $or: [
          { referredBy: u.mobile },
          { referredBy: u.epicNo },
          { referredBy: u.referralCode }
        ]
      });
      const finalCount = Math.max(u.referralsCount || 0, refCount);
      return {
        voterName: u.voterName || 'Member',
        mobile: u.mobile || 'N/A',
        epicNo: u.epicNo || 'N/A',
        referralCount: finalCount
      };
    })
  );

  liveAiReferralsList.sort((a, b) => b.referralCount - a.referralCount);

  console.log('--- DYNAMIC LIVE LEADERBOARD FROM MONGODB ---');
  liveAiReferralsList.slice(0, 5).forEach((ref, idx) => {
    console.log(`#${idx + 1} ${ref.voterName} | Mobile: ${ref.mobile} | EPIC: ${ref.epicNo} — ${ref.referralCount} Member Referrals`);
  });
  process.exit(0);
}
testQuery();
